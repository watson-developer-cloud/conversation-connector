#!/usr/bin/env bash

export WSK=${WSK-wsk}

# Switches the Openwhisk namespace based on the current Bluemix org/space
# where user has logged in.
changeWhiskKey(){
  TARGET=`cat ~/.cf/config.json | jq --raw-output .Target`
  if [ "$TARGET" == "https://api.stage1.ng.bluemix.net" ]; then
      WSK_APIHOST="https://openwhisk.stage1.ng.bluemix.net"
  else
      WSK_APIHOST="https://openwhisk.ng.bluemix.net"
  fi

  ACCESS_TOKEN=`grep AccessToken ~/.cf/config.json  | awk '{sub("\",$", "", $3); print $3}'`
  REFRESH_TOKEN=`grep RefreshToken ~/.cf/config.json  | awk '{sub("\",$", "", $2); print $2}'`

  WSK_CREDENTIALS=`curl -s -X POST -H 'Content-Type: application/json' -d '{"accessToken": "'$ACCESS_TOKEN'", "refreshToken": "'$ACCESS_TOKEN'"}' ${WSK_APIHOST-https://openwhisk.ng.bluemix.net}/bluemix/v2/authenticate`

  WSK_NAMESPACE=`node -e '{C=require(process.argv[1]); console.log(C.OrganizationFields.Name + "_" + C.SpaceFields.Name) }' ~/.cf/config.json`

  WSK_AUTH_KEY=`node -e "
     const creds = JSON.parse(process.argv[1]),
           selectedNamespace = process.argv[2]
           nsCreds = creds.namespaces.find(ns => ns.name === selectedNamespace)
     if (!nsCreds) {
        console.error('Cannot find OpenWhisk credentials for ' + selectedNamespace)
        process.exit(1)
     } else {
        console.log(nsCreds.uuid + ':' + nsCreds.key)
     }
  " "$WSK_CREDENTIALS" "$WSK_NAMESPACE"`

  wsk property set --auth "${WSK_AUTH_KEY}"
}

PROVIDERS_FILE='providers.json'
MODE="run"

if [[ "$#" -ge 1 && $1 == "test" ]]; then
  MODE="test"
  # Location of the master test resources file
  PROVIDERS_FILE='test/resources/providers-test.json'
fi

if [ ! -f $PROVIDERS_FILE ]; then
  echo "Providers/credentials file ${PROVIDERS_FILE} not found."
  exit 1
fi

# Get the Bluemix credentials
BX_API_HOST=`jq -r '.bluemix.apihost' $PROVIDERS_FILE`
BX_API_KEY=`jq -r '.bluemix.api_key' $PROVIDERS_FILE`
BX_ORG=`jq -r '.bluemix.org' $PROVIDERS_FILE`
BX_SPACE=`jq -r '.bluemix.space' $PROVIDERS_FILE`

# Switch the namespace
cf login -a api.ng.bluemix.net -u apikey -p $BX_API_KEY -o $BX_ORG -s $BX_SPACE

changeWhiskKey

# Get the Openwhisk credentials
WSK_NAMESPACE=`${WSK} namespace list | tail -n +2 | head -n 1`
WSK_API_KEY=`${WSK} property get --auth | tr "\t" "\n" | tail -n 1`
WSK_API_HOST=`${WSK} property get --apihost | tr "\t" "\n" | tail -n 1`

# Cloudant-related variables
CLOUDANT_INSTANCE_NAME='convoflex'
CLOUDANT_INSTANCE_KEY='bot-key'
CLOUDANT_AUTH_DBNAME='authdb'

pipeline_name=''

# Setup the pipeline if the pipeline JSON key is set in providers file
jq -r '.pipeline[]' $PROVIDERS_FILE &> /dev/null
if [ $? != 0 ]; then
  echo 'ERROR: Providers/credentials file missing pipeline JSON key.'
else
  for pipeline in `jq -c '.pipeline[]' $PROVIDERS_FILE`; do
    pipeline_name=`echo $pipeline | jq --raw-output '.name'`

    # For test mode, name the pipeline 'testflex'
    if [ $MODE == "test" ]; then
      pipeline_name='testflex'
    fi

    if [ $? != 0 -o -z $pipeline_name -o $pipeline_name == 'null' ]; then
      echo 'ERROR: Pipeline name missing.'
    fi
    # Setup context package    
    cd context; ./setup.sh ${pipeline_name}_context $CLOUDANT_INSTANCE_NAME $CLOUDANT_INSTANCE_KEY; cd ..

    # Set up the auth db with the same Cloudant instance created by context
    CLOUDANT_CREDS="`cf service-key ${CLOUDANT_INSTANCE_NAME} ${CLOUDANT_INSTANCE_KEY} 2>&1 | grep -v Getting`"
    CLOUDANT_URL="`echo $CLOUDANT_CREDS | jq --raw-output .url`"

    echo "Creating cloudant auth database"
    curl -s -XPUT "$CLOUDANT_URL/${CLOUDANT_AUTH_DBNAME}" | grep -v "already exists"

    CLOUDANT_AUTH_KEY=`uuidgen`

    # Save initial auth info in db
    ${WSK} action update init-auth init-auth.js
    ${WSK} action invoke init-auth -p pipeline $pipeline -p cloudant_url $CLOUDANT_URL -p  cloudant_auth_dbname $CLOUDANT_AUTH_DBNAME -p cloudant_auth_key $CLOUDANT_AUTH_KEY -p setup_mode $MODE

    # Setup and deploy actions onto OpenWhisk
    cd starter-code; ./setup.sh ${pipeline_name}_starter-code $CLOUDANT_URL $CLOUDANT_AUTH_DBNAME $CLOUDANT_AUTH_KEY; cd ..    

    # Run setup for conversation package
    cd conversation; ./setup.sh ${pipeline_name}_conversation $CLOUDANT_URL $CLOUDANT_AUTH_DBNAME $CLOUDANT_AUTH_KEY; cd ..
    
    CHANNEL=`echo $pipeline | jq --raw-output '.channel.name'`
    cd channels;

    if [ $MODE == "test" ]; then
      echo 'Test mode'
      cd facebook; ./setup_channel_facebook.sh $CLOUDANT_URL $CLOUDANT_AUTH_DBNAME $CLOUDANT_AUTH_KEY ${pipeline_name}_facebook $pipeline_name; cd ..

      cd slack; ./setup_channel_slack.sh $pipeline $pipeline_name $CLOUDANT_URL $CLOUDANT_AUTH_DBNAME $CLOUDANT_AUTH_KEY ${pipeline_name}_slack $MODE; cd ..; cd ..;
    else
      echo 'Not test mode'
      if [ "$CHANNEL" == "facebook" ]; then

        cd facebook; ./setup_channel_facebook.sh $CLOUDANT_URL $CLOUDANT_AUTH_DBNAME $CLOUDANT_AUTH_KEY ${pipeline_name}_facebook $pipeline_name; cd ..

        pipeline_actions="${pipeline_name}_starter-code/normalize-${CHANNEL}-for-conversation,${pipeline_name}_context/load-context,${pipeline_name}_starter-code/pre-conversation,${pipeline_name}_conversation/call-conversation,${pipeline_name}_starter-code/normalize-conversation-for-${CHANNEL},${pipeline_name}_starter-code/post-conversation,${pipeline_name}_context/save-context,${pipeline_name}_${CHANNEL}/post"  

        #Create the sub-pipeline which will be invoked from within facebook/receive action
        ${WSK} action update ${pipeline_name} --sequence $pipeline_actions \
        -a web-export true

        #Print the webhook URL
        echo ''
        echo "Your Webhook/Request URL for [${pipeline_name}] is :"
        echo https://openwhisk.ng.bluemix.net/api/v1/web/$WSK_NAMESPACE/${pipeline_name}_facebook/receive.text
      else
        cd slack; ./setup_channel_slack.sh $pipeline $pipeline_name $CLOUDANT_URL $CLOUDANT_AUTH_DBNAME $CLOUDANT_AUTH_KEY ${pipeline_name}_slack $MODE; cd ..; cd ..;

        pipeline_actions="${pipeline_name}_${CHANNEL}/receive,${pipeline_name}_starter-code/normalize-${CHANNEL}-for-conversation,${pipeline_name}_context/load-context,${pipeline_name}_starter-code/pre-conversation,${pipeline_name}_conversation/call-conversation,${pipeline_name}_starter-code/normalize-conversation-for-${CHANNEL},${pipeline_name}_starter-code/post-conversation,${pipeline_name}_context/save-context,${pipeline_name}_${CHANNEL}/post"  

        #Create pipeline sequence for slack
        ${WSK} action update ${pipeline_name} --sequence ${pipeline_actions} \
        -a web-export true
        #Print the webhook URL
        echo ''
        echo "Your Webhook/Request URL for [${pipeline_name}] is :"
        echo https://openwhisk.ng.bluemix.net/api/v1/web/$WSK_NAMESPACE/default/$pipeline_name.json
      fi
    fi
  done
fi
RETCODE=$?

# Run the test suite
if [ $MODE == "test" ]; then
  # Upload OpenWhisk credentials into user's env-variables so npm can be used without credentials
  export __OW_API_HOST="${WSK_API_HOST}"
  export __OW_API_KEY="${WSK_API_KEY}"
  export __OW_NAMESPACE="${WSK_NAMESPACE}"

  export __TEST_PIPELINE_NAME="${pipeline_name}"

  cd test/scripts;

  ./run_suite.sh
  RETCODE=$?
  ./clean.sh ${pipeline_name}

  # Unset environment variables used for test
  unset __OW_API_HOST
  unset __OW_API_KEY
  unset __OW_NAMESPACE
  unset __TEST_PIPELINE_NAME
fi
exit $RETCODE
