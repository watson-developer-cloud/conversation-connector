#!/usr/bin/env bash

export WSK=${WSK-wsk}

PACKAGE_NAME="$1_slack"

${WSK} action delete ${PACKAGE_NAME}/integration-pipeline | grep -v 'ok'
${WSK} action delete ${PACKAGE_NAME}/integration-pipeline-text-to-attached-message | grep -v 'ok'
${WSK} action delete ${PACKAGE_NAME}/integration-pipeline-attached-message-to-response | grep -v 'ok'

${WSK} action delete ${PACKAGE_NAME}/send-text | grep -v 'ok'
${WSK} action delete ${PACKAGE_NAME}/send-attached-message | grep -v 'ok'
${WSK} action delete ${PACKAGE_NAME}/send-attached-message-response | grep -v 'ok'
