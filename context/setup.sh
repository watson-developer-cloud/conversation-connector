#!/usr/bin/env bash

export WSK=${WSK-wsk}

BINDINGS=$1
CLOUDANT_INSTANCE_NAME='convoflex'
CLOUDANT_INSTANCE_KEY='bot-key'
CONTEXT_DB='contextdb'

# Create Cloudant instance called '${CLOUDANT_INSTANCE_NAME}' in the user's' org/space (assumed to be the same as the current org/space for now)
echo "Setting up cloudant"
cf service ${CLOUDANT_INSTANCE_NAME} >& /dev/null
if [ $? != 0 ]; then
    echo "Creating cloudant service instance"
    cf create-service cloudantNoSqlDB Lite ${CLOUDANT_INSTANCE_NAME}
fi

cf service-key ${CLOUDANT_INSTANCE_NAME} ${CLOUDANT_INSTANCE_KEY} >& /dev/null
if [ $? != 0 ]; then
    echo "Creating cloudant service key"
    cf create-service-key ${CLOUDANT_INSTANCE_NAME} ${CLOUDANT_INSTANCE_KEY}
fi

echo "Fetching cloudant creds"
CLOUDANT_CREDS="`cf service-key ${CLOUDANT_INSTANCE_NAME} ${CLOUDANT_INSTANCE_KEY} 2>&1 | grep -v Getting`"
CLOUDANT_URL="`echo $CLOUDANT_CREDS | jq --raw-output .url`"

# create context database
echo "Creating cloudant context database"
curl -s -XPUT "$CLOUDANT_URL/${CONTEXT_DB}" | grep -v "already exists"

# bind the secrets to the context package
${WSK} package update context \
    -p cloudant_url ${CLOUDANT_URL} \
    -p dbname ${CONTEXT_DB} \

${WSK} action update context/load-context load-context.js
${WSK} action update context/save-context save-context.js