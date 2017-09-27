#!/usr/bin/env bash

WSK=${WSK-wsk}

PACKAGE_NAME="$1_slack"

${WSK} action update ${PACKAGE_NAME}/send-text ./test/integration/channels/slack/send-text.js | grep -v 'ok'
${WSK} action update ${PACKAGE_NAME}/send-attached-message ./test/integration/channels/slack/send-attached-message.js | grep -v 'ok'
${WSK} action update ${PACKAGE_NAME}/send-attached-message-response ./test/integration/channels/slack/send-attached-message-response.js | grep -v 'ok'

${WSK} action update ${PACKAGE_NAME}/integration-pipeline --sequence ${PACKAGE_NAME}/receive,${PACKAGE_NAME}/send-text,${PACKAGE_NAME}/post | grep -v 'ok'
${WSK} action update ${PACKAGE_NAME}/integration-pipeline-text-to-attached-message --sequence ${PACKAGE_NAME}/receive,${PACKAGE_NAME}/send-attached-message,${PACKAGE_NAME}/post | grep -v 'ok'
${WSK} action update ${PACKAGE_NAME}/integration-pipeline-attached-message-to-response --sequence ${PACKAGE_NAME}/receive,${PACKAGE_NAME}/send-attached-message-response,${PACKAGE_NAME}/post | grep -v 'ok'
