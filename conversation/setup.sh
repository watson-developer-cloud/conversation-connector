#!/usr/bin/env bash

export WSK=${WSK-wsk}

# Pipeline name
# eg: my-flex-pipeline_
PIPELINE_NAME=$1

PACKAGE_NAME="${PIPELINE_NAME}conversation"

${WSK} package update $PACKAGE_NAME \
 -p version "v1" \
 -p version_date "2018-07-10" > /dev/null

${WSK} action update $PACKAGE_NAME/call-conversation call-conversation.js > /dev/null
