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
cd starter-code; ./setup.sh ./../$PROVIDERS_REPLACED_FILE; cd ..
cd conversation; ./setup.sh ./../$PROVIDERS_REPLACED_FILE; cd ..
# channels
cd channels
cd slack; ./setup.sh ./../../$PROVIDERS_REPLACED_FILE; cd ..
cd ..

# Conduct any browser-related OAuth from channels
cd channels
cd slack; ./engage_oauth.sh ./../../$PROVIDERS_REPLACED_FILE; cd ..
cd ..

# Cleanup
rm $PROVIDERS_REPLACED_FILE
