#!/usr/bin/env bash

export WSK=${WSK-wsk}

PACKAGE_NAME="$1_starter-code"

${WSK} action delete ${PACKAGE_NAME}/integration-pipeline-slack | grep -v 'ok'
${WSK} action delete ${PACKAGE_NAME}/integration-pipeline-slack-with-slack-data | grep -v 'ok'

${WSK} action delete ${PACKAGE_NAME}/integration-pipeline-facebook | grep -v 'ok'
${WSK} action delete ${PACKAGE_NAME}/integration-pipeline-facebook-with-facebook-data | grep -v 'ok'

${WSK} action delete ${PACKAGE_NAME}/mock-convo-text | grep -v 'ok'
${WSK} action delete ${PACKAGE_NAME}/mock-convo-slack-data | grep -v 'ok'
${WSK} action delete ${PACKAGE_NAME}/mock-convo-facebook-data | grep -v 'ok'