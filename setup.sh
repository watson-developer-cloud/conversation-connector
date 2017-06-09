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
jq -r '.pipeline[]' $PROVIDERS_REPLACED_FILE &> /dev/null
if [ $? != 0 ]; then
  echo 'ERROR: Providers/credentials file missing pipeline JSON key.'
else
  for pipeline in `jq -c '.pipeline[]' $PROVIDERS_REPLACED_FILE`; do
    # Verify pipeline has a name
    pipeline_name=`echo $pipeline | jq -r '.name'`
    if [ $? != 0 -o -z $pipeline_name -o $pipeline_name == 'null' ]; then
      echo 'ERROR: Pipeline does not have a name.'
      continue
    fi
    # Verify pipeline has an actions array
    pipeline_actions=`echo $pipeline | jq -r '.actions[]' | tr "\n" ","`
    if [ $? != 0 -o -z $pipeline_actions -o $pipeline_actions == 'null' ]; then
      echo 'ERROR: Pipeline missing actions in the sequence.'
    fi
    # Verify pipeline contains at least one action
    pipeline_actions=${pipeline_actions%?}
    if [ -z pipeline_actions ]; then
      echo 'ERROR: Sequence must contain at least one action.'
    fi

    ${WSK} action update ${pipeline_name} --sequence ${pipeline_actions} \
      -p conversation_workspace_id 'dummy_workspace_id' \
      -a web-export true
  done
fi

# Cleanup
rm $PROVIDERS_REPLACED_FILE
