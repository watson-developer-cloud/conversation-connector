#!/usr/bin/env bash

export WSK=${WSK-wsk}
export CF=${CF-cf}

echo "Running conversation-connector test suite."

CLOUDANT_URL=''
CLOUDANT_AUTH_DBNAME='authdb'
CLOUDANT_CONTEXT_DBNAME='contextdb'
AUTH_DOC=''
RETCODE=0

### MAIN
main() {
  if [ "$TRAVIS_BRANCH" == "develop" ]; then
    # Run only unit tests for a PR originating from a contributor against the head branch "develop"
    loadEnvVars 'test/resources/.unit.env'
    runTestSuite 'test/unit/'
  else
    if [ -z "$TRAVIS" ]; then
      # Build is not running in Travis. Load environment variables.
      loadEnvVars 'test/resources/.env'
    fi
    # Run full test suite
    processCfLogin
    processDeployUserTestTokens
    changeWhiskKey
    createCloudantInstanceDatabases
    createWhiskArtifacts
    setupTestArtifacts
    runTestSuite
    destroyTestArtifacts
    destroyWhiskArtifactsAndDatabases
  fi
  echo 'Done.'
}

### Loads the test environment variables
loadEnvVars() {
  echo "Loading env variables from $1"
  # Read the master test creds file.
  IFS=$'\n'
  for line in $(cat $1); do
    if [ -n "$line" ]; then
      export $line
    fi
  done
  IFS=$' \t\n'
}

### CHECK OR PROCESS CF LOGIN
processCfLogin() {
  echo 'Logging into Bluemix using cf...'
  #Login to Bluemix
  if [ -n ${__TEST_BX_CF_KEY} ]; then
    ${CF} login -a ${__TEST_BX_API_HOST} -u apikey -p ${__TEST_BX_CF_KEY} -o ${__TEST_BX_USER_ORG} -s ${__TEST_BX_USER_SPACE} > /dev/null
  else
    echo 'CF not logged in, and missing ${__TEST_BX_CF_KEY}'
    exit 1
  fi
}

### GET BX ACCESS TOKENS FOR DEPLOY-USER
processDeployUserTestTokens() {
  echo 'Grabbing test tokens for deploy user...'
  ${CF} target -o ${__TEST_DEPLOYUSER_ORG} -s ${__TEST_DEPLOYUSER_SPACE} > /dev/null
  export __TEST_DEPLOYUSER_ACCESS_TOKEN=$(cat ~/.cf/config.json | jq -r .AccessToken | awk '{print $2}')
  export __TEST_DEPLOYUSER_REFRESH_TOKEN=$(cat ~/.cf/config.json | jq -r .RefreshToken)

  # revert back to main test workspace
  ${CF} target -o ${__TEST_BX_USER_ORG} -s ${__TEST_BX_USER_SPACE} > /dev/null
}

# Switches the Cloud Functions namespace based on the current Bluemix org/space
# where user has logged in.
changeWhiskKey() {
  echo 'Syncing wsk namespace with CF namespace...'
  WSK_NAMESPACE=`${CF} target | grep 'org:\|Org:' | awk '{print $2}'`_`${CF} target | grep 'space:\|Space:' | awk '{print $2}'`

  WSK_CURRENT_NAMESPACE=`${WSK} namespace list | tail -n +2 | head -n 1 2> /dev/null`
  if [ "${WSK_NAMESPACE}" == "${WSK_CURRENT_NAMESPACE}" ]; then
    return
  fi
  TARGET=`${CF} target | grep 'api endpoint:\|API endpoint:' | awk '{print $3}'`
  WSK_API_HOST="https://openwhisk.${TARGET#*.}"

  ACCESS_TOKEN=`cat ~/.cf/config.json | jq -r .AccessToken | awk '{print $2}'`
  REFRESH_TOKEN=`cat ~/.cf/config.json | jq -r .RefreshToken`

  WSK_CREDENTIALS=`curl -s -X POST -H 'Content-Type: application/json' -d '{"accessToken": "'$ACCESS_TOKEN'", "refreshToken": "'$REFRESH_TOKEN'"}' https://${__OW_API_HOST}/bluemix/v2/authenticate`
  WSK_API_KEY=`echo ${WSK_CREDENTIALS} | jq -r ".namespaces[] | select(.name==\"${WSK_NAMESPACE}\") | [.uuid, .key] | join(\":\")"`

  ${WSK} property set --apihost ${WSK_API_HOST} --auth "${WSK_API_KEY}" --namespace ${WSK_NAMESPACE} > /dev/null
}

### CHECK OR CREATE CLOUDANT-LITE DATABASE INSTANCE, CREATE AUTH DATABASE
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

  for i in {1..10}; do
    e=`curl -s -XPUT ${CLOUDANT_URL}/${CLOUDANT_CONTEXT_DBNAME} | jq -r .error`
    if [ "$e" != "null" ]; then
      if [ "$e" == "conflict" -o "$e" == "file_exists" ]; then
        break
      fi
      echo "create context database returned with error [$e], retrying..."
      sleep 5
    else
      break
    fi
  done
  export __TEST_CLOUDANT_URL="${CLOUDANT_URL}"
  echo 'Created Cloudant Auth and Context dbs.'

  export __TEST_CLOUDANT_URL="${CLOUDANT_URL}"
}

### CREATE AUTHENTICATION DATABASE DOCUMENT
createAuthDoc() {
  AUTH_DOC=$(node -e 'const params = process.env;
  const doc = {
    slack: {
      client_id: params.__TEST_SLACK_CLIENT_ID,
      client_secret: params.__TEST_SLACK_CLIENT_SECRET,
      verification_token: params.__TEST_SLACK_VERIFICATION_TOKEN,
      access_token: params.__TEST_SLACK_ACCESS_TOKEN,
      bot_access_token: params.__TEST_SLACK_BOT_ACCESS_TOKEN
    },
    facebook: {
      app_secret: params.__TEST_FACEBOOK_APP_SECRET,
      verification_token: params.__TEST_FACEBOOK_VERIFICATION_TOKEN,
      page_access_token: params.__TEST_FACEBOOK_PAGE_ACCESS_TOKEN
    },
    conversation: {
      username: params.__TEST_CONVERSATION_USERNAME,
      password: params.__TEST_CONVERSATION_PASSWORD,
      workspace_id: params.__TEST_CONVERSATION_WORKSPACE_ID
    }
  };
  console.log(JSON.stringify(doc));
  ')
}

### Create all Whisk artifacts needed for running the test suite
createWhiskArtifacts() {
  echo 'Creating Whisk packages and actions...'

  # Generate the pipeline auth key
  PIPELINE_AUTH_KEY=`uuidgen`

  ## UPDATE ALL RELEVANT RESOURCES
  cd starter-code; ./setup.sh "${__TEST_PIPELINE_NAME}_"; cd ..
  cd conversation; ./setup.sh "${__TEST_PIPELINE_NAME}_"; cd ..
  cd context; ./setup.sh "${__TEST_PIPELINE_NAME}_"; cd ..

  cd channels;
  cd facebook; ./setup.sh "${__TEST_PIPELINE_NAME}_"; cd ..
  cd slack; ./setup.sh "${__TEST_PIPELINE_NAME}_"; cd ..;
  cd ..

  ## UPDATE RESOURCES USED ONLY FOR DEPLOY
  cd starter-code; ./setup.sh; cd ..
  cd conversation; ./setup.sh; cd ..
  cd context; ./setup.sh; cd ..

  cd channels;
  cd slack; ./setup.sh; cd ..
  cd ..

  cd deploy; ./setup.sh; cd ..

  ## CREATE CREDENTIALS DOCUMENT IN AUTH DATABASE
  createAuthDoc # creates the Auth doc JSON and stores it into $AUTH_DOC
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
  for line in `wsk package list | grep "/${__TEST_PIPELINE_NAME}_"`; do
    # this creates issues if the package name contains spaces
    resource=`echo $line | awk '{print $1}'`
    package=${resource##*/}

    ${WSK} package update $package \
      -a cloudant_auth_key "${PIPELINE_AUTH_KEY}" \
      -a cloudant_url "${CLOUDANT_URL}" \
      -a cloudant_auth_dbname "${CLOUDANT_AUTH_DBNAME}" \
      -a cloudant_context_dbname "${CLOUDANT_CONTEXT_DBNAME}" &> /dev/null
  done
}

setupTestArtifacts() {
  echo 'Running test setup scripts...'
  # Run setup scripts needed to build "mock" actions for integration tests
  SETUP_SCRIPT='./test/integration/conversation/setup.sh'
  if [ -f $SETUP_SCRIPT ]; then
    bash $SETUP_SCRIPT $__TEST_PIPELINE_NAME
  fi
  SETUP_SCRIPT='./test/integration/starter-code/setup.sh'
  if [ -f $SETUP_SCRIPT ]; then
    bash $SETUP_SCRIPT $__TEST_PIPELINE_NAME
  fi
  for folder in './test/integration/channels'/*; do
    if [ -d $folder ]; then
      SETUP_SCRIPT="$folder/setup.sh"
      if [ -f $SETUP_SCRIPT ]; then
        bash $SETUP_SCRIPT $__TEST_PIPELINE_NAME
      fi
    fi
  done
  SETUP_SCRIPT='./test/integration/context/setup.sh'
  if [ -f $SETUP_SCRIPT ]; then
    bash $SETUP_SCRIPT $__TEST_PIPELINE_NAME
  fi

  SETUP_SCRIPT='./test/end-to-end/setup.sh'
  if [ -f $SETUP_SCRIPT ]; then
    bash $SETUP_SCRIPT $__TEST_PIPELINE_NAME
  fi

  # Export the Cloud Functions credentials for tests
  export __OW_API_KEY=`${WSK} property get --auth | tr "\t" "\n" | tail -n 1`
  export __OW_NAMESPACE=`${WSK} namespace list | tail -n +2 | head -n 1`
}

destroyTestArtifacts() {
  echo 'Running test breakdown scripts...'
  # Run breakdown scripts that deletes the "mock" actions for integration tests
  BREAKDOWN_SCRIPT='./test/integration/conversation/breakdown.sh'
  if [ -f $BREAKDOWN_SCRIPT ]; then
    bash $BREAKDOWN_SCRIPT $__TEST_PIPELINE_NAME
  fi
  BREAKDOWN_SCRIPT='./test/integration/starter-code/breakdown.sh'
  if [ -f $BREAKDOWN_SCRIPT ]; then
    bash $BREAKDOWN_SCRIPT $__TEST_PIPELINE_NAME
  fi
  for folder in './test/integration/channels'/*; do
    if [ -d $folder ]; then
      BREAKDOWN_SCRIPT="$folder/breakdown.sh"
      if [ -f $BREAKDOWN_SCRIPT ]; then
        bash $BREAKDOWN_SCRIPT $__TEST_PIPELINE_NAME
      fi
    fi
  done
  BREAKDOWN_SCRIPT='./test/integration/context/breakdown.sh'
  if [ -f $BREAKDOWN_SCRIPT ]; then
    bash $BREAKDOWN_SCRIPT $__TEST_PIPELINE_NAME
  fi
  BREAKDOWN_SCRIPT='./test/end-to-end/breakdown.sh'
  if [ -f $BREAKDOWN_SCRIPT ]; then
    bash $BREAKDOWN_SCRIPT $__TEST_PIPELINE_NAME
  fi
}

destroyWhiskArtifactsAndDatabases() {
  # Clean up wsk artifacts-packages and actions
  ./test/scripts/clean.sh ${__TEST_PIPELINE_NAME}

  # Delete the Cloudant dbs-contextdb and authdb once tests complete
  deleteCloudantDb ${CLOUDANT_URL} ${CLOUDANT_CONTEXT_DBNAME}
  deleteCloudantDb ${CLOUDANT_URL} ${CLOUDANT_AUTH_DBNAME}
}

runTestSuite() {
  echo "Running tests: $1"

  # Run tests with coverage
  istanbul cover ./node_modules/mocha/bin/_mocha -- --recursive $1 -s 5000 -t 20000 -R spec

  RETCODE=$?
}

# Deletes a cloudant database
# $1 - cloudant_url
# $2 - database_name
deleteCloudantDb() {
  echo "Deleting cloudant database $2"
  curl -s -XDELETE "$1/$2" | grep -v "error" > /dev/null
}

main

exit $RETCODE