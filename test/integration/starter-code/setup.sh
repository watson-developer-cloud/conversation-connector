#!/usr/bin/env bash

export WSK=${WSK-wsk}

PACKAGE_NAME="$1_starter-code"

${WSK} action update ${PACKAGE_NAME}/mock-convo-text ./test/integration/starter-code/mock-convo-text.js | grep -v 'ok'
${WSK} action update ${PACKAGE_NAME}/mock-convo-slack-data ./test/integration/starter-code/mock-convo-slack-data.js | grep -v 'ok'
${WSK} action update ${PACKAGE_NAME}/mock-convo-facebook-data ./test/integration/starter-code/mock-convo-facebook-data.js | grep -v 'ok'

${WSK} action update ${PACKAGE_NAME}/integration-pipeline-slack --sequence ${PACKAGE_NAME}/pre-normalize,${PACKAGE_NAME}/normalize-slack-for-conversation,${PACKAGE_NAME}/pre-conversation,${PACKAGE_NAME}/mock-convo-text,${PACKAGE_NAME}/post-conversation,${PACKAGE_NAME}/normalize-conversation-for-slack,${PACKAGE_NAME}/post-normalize | grep -v 'ok'
${WSK} action update ${PACKAGE_NAME}/integration-pipeline-slack-with-slack-data --sequence ${PACKAGE_NAME}/pre-normalize,${PACKAGE_NAME}/normalize-slack-for-conversation,${PACKAGE_NAME}/pre-conversation,${PACKAGE_NAME}/mock-convo-slack-data,${PACKAGE_NAME}/post-conversation,${PACKAGE_NAME}/normalize-conversation-for-slack,${PACKAGE_NAME}/post-normalize | grep -v 'ok'

${WSK} action update ${PACKAGE_NAME}/integration-pipeline-facebook --sequence ${PACKAGE_NAME}/pre-normalize,${PACKAGE_NAME}/normalize-facebook-for-conversation,${PACKAGE_NAME}/pre-conversation,${PACKAGE_NAME}/mock-convo-text,${PACKAGE_NAME}/post-conversation,${PACKAGE_NAME}/normalize-conversation-for-facebook,${PACKAGE_NAME}/post-normalize | grep -v 'ok'
${WSK} action update ${PACKAGE_NAME}/integration-pipeline-facebook-with-facebook-data --sequence ${PACKAGE_NAME}/pre-normalize,${PACKAGE_NAME}/normalize-facebook-for-conversation,${PACKAGE_NAME}/pre-conversation,${PACKAGE_NAME}/mock-convo-facebook-data,${PACKAGE_NAME}/post-conversation,${PACKAGE_NAME}/normalize-conversation-for-facebook,${PACKAGE_NAME}/post-normalize | grep -v 'ok'
