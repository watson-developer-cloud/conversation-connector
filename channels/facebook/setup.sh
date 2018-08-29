#!/usr/bin/env bash

# Pipeline name
# eg: my-flex-pipeline_
PIPELINE_NAME=$1

PACKAGE_NAME="${PIPELINE_NAME}facebook"

# Bind the cloudant url, authdbname and auth_key as annotations to the package.
# facebook/receive and facebook/post will need these to load auth
bx wsk package update $PACKAGE_NAME \
  -p sub_pipeline "${PIPELINE_NAME%_}" \
  -p batched_messages "${PACKAGE_NAME}/batched_messages" > /dev/null

bx wsk action update $PACKAGE_NAME/receive ./receive/index.js -a web-export true &> /dev/null
bx wsk action update $PACKAGE_NAME/post ./post/index.js &> /dev/null
bx wsk action update $PACKAGE_NAME/batched_messages ./batched_messages/index.js &> /dev/null
bx wsk action update $PACKAGE_NAME/multiple_post ./multiple_post/index.js &> /dev/null
