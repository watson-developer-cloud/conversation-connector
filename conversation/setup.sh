#!/usr/bin/env bash

export WSK=${WSK-wsk}

PACKAGE_NAME=$1
CLOUDANT_URL=$2
CLOUDANT_AUTH_DBNAME=$3
CLOUDANT_AUTH_KEY=$4

${WSK} package update $PACKAGE_NAME \
  -a cloudant_url "${CLOUDANT_URL}" \
  -a cloudant_auth_dbname "${CLOUDANT_AUTH_DBNAME}" \
  -a cloudant_auth_key "${CLOUDANT_AUTH_KEY}"

${WSK} action update $PACKAGE_NAME/call-conversation call-conversation.js