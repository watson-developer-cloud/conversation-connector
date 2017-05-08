#!/usr/bin/env bash

export WSK=${WSK-wsk}

OPENWHISK_API_HOST=`wsk property get --apihost | tr "\t" "\n" | tail -n 1`
OPENWHISK_API_KEY=`wsk property get --auth | tr "\t" "\n" | tail -n 1`
SLACK_CLIENT_ID=`cat ./credentials.json | jq --raw-output '.slack.client_id'`
SLACK_CLIENT_SECRET=`cat ./credentials.json | jq --raw-output '.slack.client_secret'`
SLACK_VERIFICATION_TOKEN=`cat ./credentials.json | jq --raw-output '.slack.verification_token'`
SLACK_REDIRECT_URI=`cat ./credentials.json | jq --raw-output '.slack.redirect_uri'`
# STARTER_CODE_ACTION_NAME="starter-code/normalize"

${WSK} package update slack \
  -p ow_api_host "${OPENWHISK_API_HOST}" \
  -p ow_api_key "${OPENWHISK_API_KEY}" \
  -p client_id "a${SLACK_CLIENT_ID}" \
  -p client_secret "${SLACK_CLIENT_SECRET}" \
  -p verification_token "${SLACK_VERIFICATION_TOKEN}" \
  -p redirect_uri "${SLACK_REDIRECT_URI}"
  # -p starter_code_action_name "${STARTER_CODE_ACTION_NAME}"

${WSK} action update slack/receive ./receive/index.js -a web-export true
${WSK} action update slack/deploy ./deploy/index.js -a web-export true
${WSK} action update slack/post ./post/index.js
