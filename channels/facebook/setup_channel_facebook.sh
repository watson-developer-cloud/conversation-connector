#!/usr/bin/env bash

export WSK=${WSK-wsk}

BINDINGS=$1

FACEBOOK_APP_SECRET=`cat $BINDINGS | jq --raw-output '.channels.facebook.app_secret'`
FACEBOOK_PAGE_ACCESS_TOKEN=`cat $BINDINGS | jq --raw-output '.channels.facebook.page_access_token'`
FACEBOOK_VERIFICATION_TOKEN=`cat $BINDINGS | jq --raw-output '.channels.facebook.verification_token'`

${WSK} package update facebook \
  -p page_access_token "${FACEBOOK_PAGE_ACCESS_TOKEN}" \
  -p verification_token "${FACEBOOK_VERIFICATION_TOKEN}" \
  -p app_secret "${FACEBOOK_APP_SECRET}" 

${WSK} action update facebook/receive ./receive/index.js -a web-export true
${WSK} action update facebook/post ./post/index.js