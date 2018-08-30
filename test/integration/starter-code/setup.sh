#!/usr/bin/env bash

PACKAGE_NAME="$1_starter-code"

bx wsk action update ${PACKAGE_NAME}/mock-conversation-text ./test/integration/starter-code/mock-conversation-text.js | grep -v 'ok'
bx wsk action update ${PACKAGE_NAME}/mock-conversation-slack-data ./test/integration/starter-code/mock-conversation-slack-data.js | grep -v 'ok'
bx wsk action update ${PACKAGE_NAME}/mock-conversation-generic-data ./test/integration/starter-code/mock-conversation-generic-data.js | grep -v 'ok'
bx wsk action update ${PACKAGE_NAME}/mock-conversation-facebook-data ./test/integration/starter-code/mock-conversation-facebook-data.js | grep -v 'ok'

bx wsk action update ${PACKAGE_NAME}/integration-pipeline-slack --sequence ${PACKAGE_NAME}/pre-normalize,${PACKAGE_NAME}/normalize-slack-for-conversation,${PACKAGE_NAME}/pre-conversation,${PACKAGE_NAME}/mock-conversation-text,${PACKAGE_NAME}/post-conversation,${PACKAGE_NAME}/normalize-conversation-for-slack,${PACKAGE_NAME}/post-normalize | grep -v 'ok'
bx wsk action update ${PACKAGE_NAME}/integration-pipeline-slack-with-slack-data --sequence ${PACKAGE_NAME}/pre-normalize,${PACKAGE_NAME}/normalize-slack-for-conversation,${PACKAGE_NAME}/pre-conversation,${PACKAGE_NAME}/mock-conversation-slack-data,${PACKAGE_NAME}/post-conversation,${PACKAGE_NAME}/normalize-conversation-for-slack,${PACKAGE_NAME}/post-normalize | grep -v 'ok'
bx wsk action update ${PACKAGE_NAME}/integration-pipeline-slack-with-generic-data --sequence ${PACKAGE_NAME}/pre-normalize,${PACKAGE_NAME}/normalize-slack-for-conversation,${PACKAGE_NAME}/pre-conversation,${PACKAGE_NAME}/mock-conversation-generic-data,${PACKAGE_NAME}/post-conversation,${PACKAGE_NAME}/normalize-conversation-for-slack,${PACKAGE_NAME}/post-normalize | grep -v 'ok'

bx wsk action update ${PACKAGE_NAME}/integration-pipeline-facebook --sequence ${PACKAGE_NAME}/pre-normalize,${PACKAGE_NAME}/normalize-facebook-for-conversation,${PACKAGE_NAME}/pre-conversation,${PACKAGE_NAME}/mock-conversation-text,${PACKAGE_NAME}/post-conversation,${PACKAGE_NAME}/normalize-conversation-for-facebook,${PACKAGE_NAME}/post-normalize | grep -v 'ok'
bx wsk action update ${PACKAGE_NAME}/integration-pipeline-facebook-with-facebook-data --sequence ${PACKAGE_NAME}/pre-normalize,${PACKAGE_NAME}/normalize-facebook-for-conversation,${PACKAGE_NAME}/pre-conversation,${PACKAGE_NAME}/mock-conversation-facebook-data,${PACKAGE_NAME}/post-conversation,${PACKAGE_NAME}/normalize-conversation-for-facebook,${PACKAGE_NAME}/post-normalize | grep -v 'ok'
bx wsk action update ${PACKAGE_NAME}/integration-pipeline-facebook-with-generic-data --sequence ${PACKAGE_NAME}/pre-normalize,${PACKAGE_NAME}/normalize-facebook-for-conversation,${PACKAGE_NAME}/pre-conversation,${PACKAGE_NAME}/mock-conversation-generic-data,${PACKAGE_NAME}/post-conversation,${PACKAGE_NAME}/normalize-conversation-for-facebook,${PACKAGE_NAME}/post-normalize | grep -v 'ok'
