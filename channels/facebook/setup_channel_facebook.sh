#!/usr/bin/env bash

export WSK=${WSK-wsk}

CLOUDANT_URL=$1
CLOUDANT_AUTH_DBNAME=$2
CLOUDANT_AUTH_KEY=$3
PACKAGE_NAME=$4
PIPELINE_NAME=$5

# Bind the cloudant url, authdbname and auth_key as annotations to the package.
# facebook/receive and facebook/post will need these to load auth
${WSK} package update $PACKAGE_NAME \
  -a cloudant_url "${CLOUDANT_URL}" \
  -a cloudant_auth_dbname "${CLOUDANT_AUTH_DBNAME}" \
  -a cloudant_auth_key "${CLOUDANT_AUTH_KEY}" \
  -p sub_pipeline "${PIPELINE_NAME}" \
  -p batched_messages "${PACKAGE_NAME}/batched_messages"

${WSK} action update $PACKAGE_NAME/receive ./receive/index.js -a web-export true
${WSK} action update $PACKAGE_NAME/post ./post/index.js
