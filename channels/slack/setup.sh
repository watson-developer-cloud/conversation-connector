#!/usr/bin/env bash

# Pipeline name
# eg: my-flex-pipeline_
PIPELINE_NAME=$1

PACKAGE_NAME="${PIPELINE_NAME}slack"

bx wsk package update $PACKAGE_NAME > /dev/null

bx wsk action update $PACKAGE_NAME/receive receive/index.js -a web-export true > /dev/null
bx wsk action update $PACKAGE_NAME/post post/index.js > /dev/null
bx wsk action update $PACKAGE_NAME/deploy deploy/index.js -a web-export true > /dev/null
bx wsk action update $PACKAGE_NAME/multiple_post ./multiple_post/index.js &> /dev/null

echo "Your Slack Redirect URL is: https://openwhisk.ng.bluemix.net/api/v1/web/$(bx wsk namespace list | tail -n +2 | head -n 1)/${PIPELINE_NAME}slack/deploy.http"
