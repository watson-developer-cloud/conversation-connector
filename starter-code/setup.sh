#!/usr/bin/env bash

export WSK=${WSK-wsk}

BINDINGS=$1

OPENWHISK_API_HOST=`cat $BINDINGS | jq --raw-output '.openwhisk.apihost'`
OPENWHISK_API_KEY=`cat $BINDINGS | jq --raw-output '.openwhisk.api_key'`

${WSK} package update starter-code \
  -p ow_api_host "${OPENWHISK_API_HOST}"\
  -p ow_api_key "${OPENWHISK_API_KEY}"

${WSK} action update starter-code/normalize normalize.js