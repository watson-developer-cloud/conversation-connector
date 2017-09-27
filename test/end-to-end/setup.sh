#!/usr/bin/env bash

export WSK=${WSK-wsk}

PACKAGE_NAME="$1"

${WSK} action update --sequence test-pipeline-slack "${PACKAGE_NAME}_slack/receive","${PACKAGE_NAME}_starter-code/normalize-slack-for-conversation","${PACKAGE_NAME}_starter-code/pre-conversation","${PACKAGE_NAME}_conversation/call-conversation","${PACKAGE_NAME}_starter-code/normalize-conversation-for-slack","${PACKAGE_NAME}_starter-code/post-conversation","${PACKAGE_NAME}_slack/post" -a web-export true | grep -v 'ok'
${WSK} action update --sequence test-pipeline-context-slack "${PACKAGE_NAME}_slack/receive","${PACKAGE_NAME}_starter-code/normalize-slack-for-conversation","${PACKAGE_NAME}_context/load-context","${PACKAGE_NAME}_starter-code/pre-conversation","${PACKAGE_NAME}_conversation/call-conversation","${PACKAGE_NAME}_starter-code/normalize-conversation-for-slack","${PACKAGE_NAME}_starter-code/post-conversation","${PACKAGE_NAME}_context/save-context","${PACKAGE_NAME}_slack/post" -a web-export true | grep -v 'ok'

${WSK} action update --sequence test-pipeline-facebook "${PACKAGE_NAME}_starter-code/normalize-facebook-for-conversation","${PACKAGE_NAME}_starter-code/pre-conversation","${PACKAGE_NAME}_conversation/call-conversation","${PACKAGE_NAME}_starter-code/normalize-conversation-for-facebook","${PACKAGE_NAME}_starter-code/post-conversation","${PACKAGE_NAME}_facebook/post" -a web-export true | grep -v 'ok'
${WSK} action update --sequence test-pipeline-context-facebook "${PACKAGE_NAME}_starter-code/normalize-facebook-for-conversation","${PACKAGE_NAME}_context/load-context","${PACKAGE_NAME}_starter-code/pre-conversation","${PACKAGE_NAME}_conversation/call-conversation","${PACKAGE_NAME}_starter-code/normalize-conversation-for-facebook","${PACKAGE_NAME}_starter-code/post-conversation","${PACKAGE_NAME}_context/save-context","${PACKAGE_NAME}_facebook/post" -a web-export true | grep -v 'ok'
${WSK} action update --sequence test-pipeline-batched-messages-facebook "${PACKAGE_NAME}_starter-code/normalize-facebook-for-conversation","${PACKAGE_NAME}_context/load-context","${PACKAGE_NAME}_starter-code/pre-conversation","${PACKAGE_NAME}_conversation/call-conversation","${PACKAGE_NAME}_starter-code/normalize-conversation-for-facebook","${PACKAGE_NAME}_starter-code/post-conversation","${PACKAGE_NAME}_context/save-context","${PACKAGE_NAME}_facebook/post" -a web-export true | grep -v 'ok'

echo "end to end setup done"