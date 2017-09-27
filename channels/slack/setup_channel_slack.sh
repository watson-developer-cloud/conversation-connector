#!/usr/bin/env bash

export WSK=${WSK-wsk}

PIPELINE=$1
PIPELINE_NAME=$2
CLOUDANT_URL=$3
CLOUDANT_AUTH_DBNAME=$4
CLOUDANT_AUTH_KEY=$5
PACKAGE_NAME=$6
MODE=$7

SLACK_CLIENT_ID=`echo $PIPELINE| jq --raw-output '.channel.slack.client_id'`
SLACK_CLIENT_SECRET=`echo $PIPELINE | jq --raw-output '.channel.slack.client_secret'`
SLACK_VERIFICATION_TOKEN=`echo $PIPELINE | jq --raw-output '.channel.slack.verification_token'`

# Create the channel package
${WSK} package update ${PACKAGE_NAME}

${WSK} action update ${PACKAGE_NAME}/deploy ./deploy/index.js -a web-export true
${WSK} action update ${PACKAGE_NAME}/receive ./receive/index.js -a web-export true
${WSK} action update ${PACKAGE_NAME}/post ./post/index.js

# Bind the cloudant url and authdbname as annotations to the package.
# slack/receive and slack/post will need these to load auth in the
${WSK} package update ${PACKAGE_NAME} \
  -a cloudant_url "${CLOUDANT_URL}" \
  -a cloudant_auth_dbname "${CLOUDANT_AUTH_DBNAME}" \
  -a cloudant_auth_key "${CLOUDANT_AUTH_KEY}"

# When running tests, no need for engaging actual OAuth.
# Only need the package and actions. So, exit.
if [ $MODE == "test" ]; then
	exit
fi
OPENWHISK_NAMESPACE=`wsk namespace list | tail -n +2 | head -n 1`
SLACK_REDIRECT_URI=https://openwhisk.ng.bluemix.net/api/v1/web/${OPENWHISK_NAMESPACE}/${PACKAGE_NAME}/deploy.http

echo "Your OAuth Redirect URL is ${SLACK_REDIRECT_URI}"

## Engage OAuth
# Create SHA-256 out of the Client ID+Secret and the word 'authorize', then convert it to hex
HMAC_STATE=`python -c "import hmac; from hashlib import sha256; print(hmac.new(b'${SLACK_CLIENT_ID}&${SLACK_CLIENT_SECRET}', b'authorize', sha256).hexdigest());"`

STATE="{
  'signature': '${HMAC_STATE}',
  'pipeline_name': '${PIPELINE_NAME}',
  'redirect_uri': '${SLACK_REDIRECT_URI}'
}"
STATE=`echo ${STATE} | sed "s/'/\"/g"`
STATE=`node -e "console.log(JSON.stringify(JSON.parse(process.argv[1])));" "$STATE"` 

URL="https://slack.com/oauth/authorize?client_id=${SLACK_CLIENT_ID}&scope=bot+chat:write:bot&redirect_uri=${SLACK_REDIRECT_URI}&state=${STATE}"

python -m webbrowser -t ${URL}