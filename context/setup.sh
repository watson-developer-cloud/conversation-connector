#!/usr/bin/env bash

export WSK=${WSK-wsk}

PACKAGE_NAME=$1
CLOUDANT_INSTANCE_NAME=$2
CLOUDANT_INSTANCE_KEY=$3
CLOUDANT_CONTEXT_DBNAME=$4

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
curl -s -XPUT "$CLOUDANT_URL/${CLOUDANT_CONTEXT_DBNAME}" | grep -v "already exists"

# bind the secrets to the context package
${WSK} package update $PACKAGE_NAME \
    -a cloudant_url ${CLOUDANT_URL} \
    -a cloudant_context_dbname ${CLOUDANT_CONTEXT_DBNAME} \

${WSK} action update $PACKAGE_NAME/load-context load-context.js
${WSK} action update $PACKAGE_NAME/save-context save-context.js