#!/usr/bin/env bash

export WSK=${WSK-wsk}
export CF=${CF-cf}

PROVIDERS_FILE='providers.json'

CLOUDANT_URL=''
CLOUDANT_AUTH_DBNAME='authdb'
CLOUDANT_CONTEXT_DBNAME='contextdb'
AUTH_DOC=''

DEPLOY=1 # whether to go through or to skip the deployment step
NO_NAME=0 # whether to forgo using a deployment name

### READ AND PROCESS ARGUMENT FLAGS
while getopts ":hns" opt; do
  case $opt in
    h)
      echo 'USAGE: ./setup [-h] [-n] [-s]'
      echo '  -h -- Show this help screen.'
      echo '  -n -- No deployment name. Deploys all resources without a deployment name. Also sets up supplier namespace assets.'
      echo '  -s -- Simple mode prevents deployment. (This prevents OAuth from happening.)'
      ;;
    n)
      NO_NAME=1
      ;;
    s)
      DEPLOY=0
      ;;
  esac
done

### MAIN
main() {
  if [ -z "$BUTTON_DEPLOY" ]; then
    # If the deploy is done via the deploy to bluemix button, we don't need a providers file and login
    # is handled by the devops pipeline architecture. Similar wsk namespace targetting is done in
    # pipeline-DEPLOY.sh
    checkDependencies
    checkProvidersExist
    processCfLogin
    changeWhiskKey
  fi
  if [ "${NO_NAME}" == "0" ]; then createCloudantInstanceDatabases
  else createSupplierResources; fi
  createPipelines
  if [ "${NO_NAME}" == "0" -a "$DEPLOY" == "1" ]; then runDeploy; fi
  echo 'Done.'
}

### CHECK IF THE USER HAS INSTALLED ALL REQUIRED PROGRAMS
checkDependencies() {
  jq --help &> /dev/null
  if [ "$?" != "0" ]; then
    echo 'jq is required to run setup. Please install jq before trying again.'
    exit 1
  fi

  ${CF} &> /dev/null
  if [ "$?" != "0" ]; then
    echo 'cf is required to run setup. Please install cf before trying again.'
    exit 1
  fi

  ${WSK} &> /dev/null
  if [ "$?" != "0" ]; then
    echo 'wsk is required to run setup. Please install wsk before trying again.'
    exit 1
  fi
}

### CHECK IF PROVIDERS FILE EXISTS
checkProvidersExist() {
  if [ ! -f ${PROVIDERS_FILE} ]; then
    echo "Providers/credentials file ${PROVIDERS_FILE} not found."
    exit 1
  fi
}

### CHECK OR PROCESS CF LOGIN
processCfLogin() {
  echo 'Checking for CF login credentials...'
  ${CF} target &> /dev/null
  if [ "$?" != "0" ]; then
    __BX_CF_KEY=`jq -r .bluemix.api_key ${PROVIDERS_FILE}`
    # here, __BX_CF_KEY could have come from providers.json OR from env vars
    if [ -n ${__BX_CF_KEY} ]; then
      BX_API_HOST=`jq -r '.bluemix.apihost' ${PROVIDERS_FILE}`
      BX_API_HOST=${BX_API_HOST-api.ng.bluemix.net}
      BX_ORG=`jq -r '.bluemix.org' ${PROVIDERS_FILE}`
      BX_SPACE=`jq -r '.bluemix.space' ${PROVIDERS_FILE}`
      ${CF} login -a ${BX_API_HOST} -u apikey -p ${__BX_CF_KEY} -o ${BX_ORG} -s ${BX_SPACE}
    else
      echo 'CF not logged in, and no CF API keys provided.'
      exit 1
    fi
  fi
}

# Switches the Cloud Functions namespace based on the current Bluemix org/space
# where user has logged in.
changeWhiskKey() {
  echo 'Syncing wsk namespace with CF namespace...'
  WSK_NAMESPACE="`${CF} target | grep 'org:\|Org:' | awk '{print $2}'`_`${CF} target | grep 'space:\|Space:' | awk '{print $2}'`"
  if [ "${WSK_NAMESPACE}" == `${WSK} namespace list | tail -n +2 | head -n 1` ]; then
    return
  fi
  TARGET=`${CF} target | grep 'api endpoint:\|API endpoint:' | awk '{print $3}'`
  WSK_API_HOST="https://openwhisk.${TARGET#*.}"

  ACCESS_TOKEN=`cat ~/.cf/config.json | jq -r .AccessToken | awk '{print $2}'`
  REFRESH_TOKEN=`cat ~/.cf/config.json | jq -r .RefreshToken`

  WSK_CREDENTIALS=`curl -s -X POST -H 'Content-Type: application/json' -d '{"accessToken": "'$ACCESS_TOKEN'", "refreshToken": "'$REFRESH_TOKEN'"}' ${WSK_API_HOST}/bluemix/v2/authenticate`
  WSK_API_KEY=`echo ${WSK_CREDENTIALS} | jq -r ".namespaces[] | select(.name==\"${WSK_NAMESPACE}\") | [.uuid, .key] | join(\":\")"`

  ${WSK} property set --apihost ${WSK_API_HOST} --auth "${WSK_API_KEY}" --namespace ${WSK_NAMESPACE}
}

### CHECK OR CREATE CLOUDANT-LITE DATABASE INSTANCE, CREATE AUTH+CONTEXT DATABASES
createCloudantInstanceDatabases() {
  echo 'Checking for or creating cloudant instance...'
  CLOUDANT_INSTANCE_NAME='conversation-connector'
  CLOUDANT_INSTANCE_KEY='conversation-connector-key'

  ${CF} service ${CLOUDANT_INSTANCE_NAME} > /dev/null
  if [ "$?" != "0" ]; then
    ${CF} create-service cloudantNoSQLDB Lite ${CLOUDANT_INSTANCE_NAME}
  fi
  ${CF} service-key ${CLOUDANT_INSTANCE_NAME} ${CLOUDANT_INSTANCE_KEY} > /dev/null
  if [ "$?" != "0" ]; then
    ${CF} create-service-key ${CLOUDANT_INSTANCE_NAME} ${CLOUDANT_INSTANCE_KEY}
  fi
  CLOUDANT_URL=`${CF} service-key ${CLOUDANT_INSTANCE_NAME} ${CLOUDANT_INSTANCE_KEY} | tail -n +2 | jq -r .url`

  for i in {1..10}; do
    e=`curl -s -XPUT ${CLOUDANT_URL}/${CLOUDANT_AUTH_DBNAME} | jq -r .error`
    if [ "$e" != "null" ]; then
      if [ "$e" == "conflict" -o "$e" == "file_exists" ]; then
        break
      fi
      echo "create auth database returned with error [$e], retrying..."
      sleep 5
    else
      break
    fi
  done
}

### CREATE SUPPLIER NAMESPACE ENDPOINTS AND ALL OTHER DEPLOY-RELATED ASSETS
createSupplierResources() {
  cd deploy; ./setup.sh; cd ..
}


### LOOP THROUGH PIPELINE ARRAY AND INITIALIZE ALL ACTIONS
createPipelines() {
  echo 'Creating deployment pipeline(s)...'

  PIPELINES=''

  if [ -z "$BUTTON_DEPLOY" ]; then
    jq -r '.pipeline[]' ${PROVIDERS_FILE} &> /dev/null
    if [ "$?" != "0" ]; then
      echo 'ERROR: Providers/credentials file missing pipeline JSON key.'
      exit 1
    fi
    PIPELINES=`jq -c '.pipeline[]' ${PROVIDERS_FILE}`
  else
    PIPELINES=$(printf '{"channel":{"facebook":{"app_secret":"%s","page_access_token":"%s","verification_token":"%s"},"name":"facebook"},"conversation":{"password":"%s","username":"%s","workspace_id":"%s"}, "name":"%s"}' "$FACEBOOK_SECRET" "$FACEBOOK_ACCESS_TOKEN" "$FACEBOOK_VERIFICATION_TOKEN" "$CONVERSATION_PASSWORD" "$CONVERSATION_USERNAME" "$CONVERSATION_WORKSPACE" "$CF_APP_NAME")
  fi

  IFS=$'\n'
  for pipeline in $PIPELINES; do
    PIPELINE_NAME=`echo $pipeline | jq -r .name`
    if [ "$NO_NAME" == "1" ]; then
      PIPELINE_NAME=''
    elif [ -z $PIPELINE_NAME ]; then
      echo 'A pipeline is missing a name key, skipping...'
      continue
    else
      # Remove characters that are not allowed in Cloud Function names
      if [[ "${PIPELINE_NAME}" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{0,255}$ ]]; then
        PIPELINE_NAME="${PIPELINE_NAME}_"
      else
        echo "One of your pipeline deployment names contains invalid characters."
        echo "Please use only the following characters in your deployment name: \"a-z A-Z 0-9 -\". Additionally, your deployment name cannot start with a -, and your name cannot be longer than 256 characters."
        exit 1
      fi
    fi

    PIPELINE_AUTH_KEY=`node -e "{x=require('uuid'); console.log(x.v1())}"`

    ## UPDATE ALL RELEVANT RESOURCES
    cd starter-code; ./setup.sh ${PIPELINE_NAME}; cd ..
    cd conversation; ./setup.sh ${PIPELINE_NAME}; cd ..
    cd context; ./setup.sh "${PIPELINE_NAME}" "${CLOUDANT_URL}" "${CLOUDANT_CONTEXT_DBNAME}"; cd ..

    CHANNEL=`echo $pipeline | jq -r .channel.name`
    cd channels/${CHANNEL}; ./setup.sh ${PIPELINE_NAME}; cd ../..

    ### DO THE FOLLOWING ONLY IF DEPLOY NAME IS SUPPLIED, NOT IN SUPPLIER-NAMESPACE MODE
    if [ "${NO_NAME}" == "0" ]; then
      ## CREATE CREDENTIALS DOCUMENT IN AUTH DATABASE
      createAuthDoc $pipeline # creates the Auth doc JSON and stores it into $AUTH_DOC
      for i in {1..10}; do
        e=`curl -s -XPUT -d $AUTH_DOC ${CLOUDANT_URL}/${CLOUDANT_AUTH_DBNAME}/${PIPELINE_AUTH_KEY} | jq -r .error`
        if [ "$e" != "null" ]; then
          if [ "$e" == "conflict" -o "$e" == "file_exists" ]; then
            break
          fi
          echo "create auth database document returned with error [${e}], retrying..."
          sleep 5
        else
          break
        fi
      done


      echo "Your Cloudant Auth DB URL is: ${CLOUDANT_URL}/${CLOUDANT_AUTH_DBNAME}/${PIPELINE_AUTH_KEY}"

      ## INJECT ANNOTATIONS INTO ALL PACKAGES
      for line in `wsk package list | grep "/${PIPELINE_NAME}"`; do
        # this creates issues if the package name contains spaces
        resource=`echo $line | awk '{print $1}'`
        package=${resource##*/}

        ${WSK} package update $package \
          -a cloudant_auth_key "${PIPELINE_AUTH_KEY}" \
          -a cloudant_url "${CLOUDANT_URL}" \
          -a cloudant_auth_dbname "${CLOUDANT_AUTH_DBNAME}" \
          -a cloudant_context_dbname "${CLOUDANT_CONTEXT_DBNAME}" &> /dev/null
      done

      ## CREATE SEQUENCE ACTION
      if [ "$CHANNEL" == "facebook" ]; then
        sequence="${PIPELINE_NAME}starter-code/pre-normalize,${PIPELINE_NAME}starter-code/normalize-${CHANNEL}-for-conversation,${PIPELINE_NAME}context/load-context,${PIPELINE_NAME}starter-code/pre-conversation,${PIPELINE_NAME}conversation/call-conversation,${PIPELINE_NAME}starter-code/post-conversation,${PIPELINE_NAME}context/save-context,${PIPELINE_NAME}starter-code/normalize-conversation-for-${CHANNEL},${PIPELINE_NAME}starter-code/post-normalize,${PIPELINE_NAME}${CHANNEL}/post"
        echo "Your Request URL is: https://openwhisk.ng.bluemix.net/api/v1/web/$(wsk namespace list | tail -n +2 | head -n 1)/${PIPELINE_NAME}facebook/receive.text"
      else
        sequence="${PIPELINE_NAME}starter-code/pre-normalize,${PIPELINE_NAME}starter-code/normalize-${CHANNEL}-for-conversation,${PIPELINE_NAME}context/load-context,${PIPELINE_NAME}starter-code/pre-conversation,${PIPELINE_NAME}conversation/call-conversation,${PIPELINE_NAME}starter-code/post-conversation,${PIPELINE_NAME}context/save-context,${PIPELINE_NAME}starter-code/normalize-conversation-for-${CHANNEL},${PIPELINE_NAME}starter-code/post-normalize,${PIPELINE_NAME}${CHANNEL}/post"
        echo "Your Request URL is: https://openwhisk.ng.bluemix.net/api/v1/web/$(wsk namespace list | tail -n +2 | head -n 1)/${PIPELINE_NAME}slack/receive.json"
      fi
      # node -e 'console.log(process.argv[1].split(",").join("\n"));' "$sequence"
      ${WSK} action update ${PIPELINE_NAME%_} --sequence ${sequence} > /dev/null
    fi
  done
  IFS=$' \t\n'
}

### DEPLOY ALL PIPELINES
runDeploy() {
  echo $'\n'
  echo 'Please set up your webhooks and endpoint URL setups before deployment runs.'
  read -p 'Press enter to continue...' k
  echo 'Running pipeline deployments...'

  for pipeline in `jq -c '.pipeline[]' ${PROVIDERS_FILE}`; do
    PIPELINE_NAME=`echo $pipeline | jq -r .name`
    if [ -z $PIPELINE_NAME ]; then
      echo 'A pipeline is missing a name key, skipping...'
      continue
    fi
    PIPELINE_CHANNEL_NAME=`echo $pipeline | jq -r .channel.name`

    OAUTH_FILE=./channels/${PIPELINE_CHANNEL_NAME}/engage_oauth.sh
    if [ -f "${OAUTH_FILE}" ]; then
      ${OAUTH_FILE} "${pipeline}"
    fi
  done
}


### CREATE AUTHENTICATION DATABASE DOCUMENT
createAuthDoc() {
  PIPELINE=$1

  AUTH_DOC=$(node -e 'const params = JSON.parse(process.argv[1]);
  const channel = params.channel.name;
  const doc = {
    conversation: {
      username: params.conversation.username,
      password: params.conversation.password,
      workspace_id: params.conversation.workspace_id
    }
  };
  doc[channel] = params.channel[channel];
  console.log(JSON.stringify(doc));
  ' "$PIPELINE")
}

main
