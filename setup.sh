#!/usr/bin/env bash

PROVIDERS_FILE='providers.json'
PROVIDERS_REPLACED_FILE='providers_new.json'

export WSK=${WSK-wsk}

if [ ! -f $PROVIDERS_FILE ]; then
  echo 'Providers/credentials file not found.'
  exit 1
fi

# Update providers file with OpenWhisk credentials provided by wsk CLI
WSK_API_HOST=`wsk property get --apihost | tr "\t" "\n" | tail -n 1`
WSK_API_KEY=`wsk property get --auth | tr "\t" "\n" | tail -n 1`
WSK_NAMESPACE=`wsk property get --namespace | tr "\t" "\n" | tail -n 1`

sed "s/\${WSK_API_HOST}/${WSK_API_HOST}/g;s/\${WSK_API_KEY}/${WSK_API_KEY}/g;s/\${WSK_NAMESPACE}/${WSK_NAMESPACE}/g" $PROVIDERS_FILE > $PROVIDERS_REPLACED_FILE

# Setup and deploy actions onto OpenWhisk
cd conversation; ./setup.sh ./../$PROVIDERS_REPLACED_FILE; cd ..
cd starter-code; ./setup.sh ./../$PROVIDERS_REPLACED_FILE; cd ..
# channels
cd channels
cd slack; ./setup_channel_slack.sh ./../../$PROVIDERS_REPLACED_FILE; cd ..
cd ..

# Conduct any browser-related OAuth from channels
cd channels
cd slack; ./engage_oauth.sh ./../../$PROVIDERS_REPLACED_FILE; cd ..
cd ..

# Setup demo pipeline if the pipeline JSON key is set in providers file
jq -r '.pipeline' $PROVIDERS_REPLACED_FILE &> /dev/null
ERR_CODE=$?
jq -r '.pipeline.name' $PROVIDERS_REPLACED_FILE &> /dev/null
ERR_CODE=$(($ERR_CODE + $?))
jq -r '.pipeline.actions[]' $PROVIDERS_REPLACED_FILE &> /dev/null
ERR_CODE=$(($ERR_CODE + $?))
if [ $ERR_CODE != 0 ]; then
  echo 'Providers/credentials file missing pipeline JSON key.'
else
  sequence_name=`jq -r '.pipeline.name' $PROVIDERS_REPLACED_FILE`
  sequence_actions=`jq -r '.pipeline.actions[]' $PROVIDERS_REPLACED_FILE | tr "\n" ","`
  ${WSK} action update ${sequence_name} --sequence ${sequence_actions%?} -a web-export true
fi

# Cleanup
rm $PROVIDERS_REPLACED_FILE
