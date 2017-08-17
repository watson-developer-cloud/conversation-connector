#!/usr/bin/env bash

export WSK=${WSK-wsk}

BINDINGS=$1

SLACK_CLIENT_ID=`cat $BINDINGS | jq --raw-output '.channels.slack.client_id'`
SLACK_CLIENT_SECRET=`cat $BINDINGS | jq --raw-output '.channels.slack.client_secret'`
SLACK_VERIFICATION_TOKEN=`cat $BINDINGS | jq --raw-output '.channels.slack.verification_token'`
SLACK_REDIRECT_URI=`cat $BINDINGS | jq --raw-output '.channels.slack.redirect_uri'`

${WSK} package update slack \
  -p client_id "a${SLACK_CLIENT_ID}" \
  -p client_secret "${SLACK_CLIENT_SECRET}" \
  -p verification_token "${SLACK_VERIFICATION_TOKEN}" \
  -p redirect_uri "${SLACK_REDIRECT_URI}"

${WSK} action update slack/deploy ./deploy/index.js -a web-export true
${WSK} action update slack/receive ./receive/index.js -a web-export true
${WSK} action update slack/post ./post/index.js

OPENWHISK_NAMESPACE=`wsk namespace list | tail -n +2 | head -n 1`
echo ''
echo "Your OAuth Redirect URL is https://openwhisk.ng.bluemix.net/api/v1/web/$OPENWHISK_NAMESPACE/slack/deploy.http"
