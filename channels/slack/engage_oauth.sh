#!/usr/bin/env bash

PIPELINE=$1

PIPELINE_NAME=`echo $PIPELINE | jq -r .name`
SLACK_CLIENT_ID=`echo $PIPELINE | jq -r .channel.slack.client_id`
SLACK_CLIENT_SECRET=`echo $PIPELINE | jq -r .channel.slack.client_secret`

SLACK_REDIRECT_URL="https://openwhisk.ng.bluemix.net/api/v1/web/$(wsk namespace list | tail -n +2 | head -n 1)/${PIPELINE_NAME}_slack/deploy.http"

signature=`node -e "const crypto = require('crypto'); console.log(crypto.createHmac('sha256', process.argv[1]).update('authorize').digest('hex'));" "${SLACK_CLIENT_ID}&${SLACK_CLIENT_SECRET}"`

state=$(node -e 'console.log(JSON.stringify({
  signature: process.argv[1],
  redirect_url: process.argv[2]
}));' $signature ${SLACK_REDIRECT_URL})

AUTHORIZE_URL="/oauth/authorize?client_id=${SLACK_CLIENT_ID}&scope=bot+chat:write:bot&redirect_uri=${SLACK_REDIRECT_URL}&state=${state}"

AUTH_REDIRECT_URL="https://slack.com/signin?redir=$(node -e 'console.log(encodeURIComponent(process.argv[1]));' ${AUTHORIZE_URL})"

python -m webbrowser -t ${AUTH_REDIRECT_URL}
