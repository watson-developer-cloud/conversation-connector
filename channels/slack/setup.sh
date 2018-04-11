#!/usr/bin/env bash

export WSK=${WSK-wsk}

# Pipeline name
# eg: my-flex-pipeline_
PIPELINE_NAME=$1

PACKAGE_NAME="${PIPELINE_NAME}slack"

${WSK} package update $PACKAGE_NAME > /dev/null

${WSK} action update $PACKAGE_NAME/receive receive/index.js -a web-export true > /dev/null
${WSK} action update $PACKAGE_NAME/post post/index.js > /dev/null
${WSK} action update $PACKAGE_NAME/deploy deploy/index.js -a web-export true > /dev/null
${WSK} action update $PACKAGE_NAME/multiple_post ./multiple_post/index.js &> /dev/null

echo "Your Slack Redirect URL is: https://openwhisk.ng.bluemix.net/api/v1/web/$(wsk namespace list | tail -n +2 | head -n 1)/${PIPELINE_NAME}slack/deploy.http"
