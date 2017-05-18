#!/usr/bin/env bash

export WSK=${WSK-wsk}

BINDINGS=$1

OPENWHISK_API_HOST=`cat $BINDINGS | jq --raw-output '.openwhisk.apihost'`
OPENWHISK_API_KEY=`cat $BINDINGS | jq --raw-output '.openwhisk.api_key'`
SLACK_CLIENT_ID=`cat $BINDINGS | jq --raw-output '.channels.slack.client_id'`
SLACK_CLIENT_SECRET=`cat $BINDINGS | jq --raw-output '.channels.slack.client_secret'`
SLACK_VERIFICATION_TOKEN=`cat $BINDINGS | jq --raw-output '.channels.slack.verification_token'`
SLACK_REDIRECT_URI=`cat $BINDINGS | jq --raw-output '.channels.slack.redirect_uri'`
STARTER_CODE_ACTION_NAME=`cat $BINDINGS | jq --raw-output '.starter_code.action'`
if [ -n $STARTER_CODE_ACTION_NAME ]; then
  STARTER_CODE_ACTION_NAME="starter-code/$STARTER_CODE_ACTION_NAME"
fi

${WSK} package update slack \
  -p ow_api_host "${OPENWHISK_API_HOST}" \
  -p ow_api_key "${OPENWHISK_API_KEY}" \
  -p client_id "a${SLACK_CLIENT_ID}" \
  -p client_secret "${SLACK_CLIENT_SECRET}" \
  -p verification_token "${SLACK_VERIFICATION_TOKEN}" \
  -p redirect_uri "${SLACK_REDIRECT_URI}" \
  -p starter_code_action_name "${STARTER_CODE_ACTION_NAME}"

${WSK} action update slack/receive ./receive/index.js -a web-export true
${WSK} action update slack/deploy ./deploy/index.js -a web-export true
${WSK} action update slack/post ./post/index.js
