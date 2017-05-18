#!/usr/bin/env bash

BINDINGS=$1

SLACK_CLIENT_ID=`cat $BINDINGS | jq --raw-output '.channels.slack.client_id'`
SLACK_CLIENT_SECRET=`cat $BINDINGS | jq --raw-output '.channels.slack.client_secret'`
SLACK_REDIRECT_URI=`cat $BINDINGS | jq --raw-output '.channels.slack.redirect_uri'`

# Create SHA-256 out of the Client ID+Secret and the word 'authorize', then convert it to hex
HMAC_STATE=`python -c "import hmac; from hashlib import sha256; print(hmac.new(b'${SLACK_CLIENT_ID}&${SLACK_CLIENT_SECRET}', b'authorize', sha256).hexdigest());"`

URL="https://slack.com/oauth/authorize?client_id=${SLACK_CLIENT_ID}&scope=bot+chat:write:bot&redirect_uri=${SLACK_REDIRECT_URI}&state=${HMAC_STATE}"

python -m webbrowser -t ${URL}
