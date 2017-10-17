#!/usr/bin/env bash

export WSK=${WSK-wsk}

PIPELINE_NAME="$1"

${WSK} action update --sequence test-pipeline-slack "${PIPELINE_NAME}_slack/receive","${PIPELINE_NAME}_starter-code/pre-normalize","${PIPELINE_NAME}_starter-code/normalize-slack-for-conversation","${PIPELINE_NAME}_starter-code/pre-conversation","${PIPELINE_NAME}_conversation/call-conversation","${PIPELINE_NAME}_starter-code/post-conversation","${PIPELINE_NAME}_starter-code/normalize-conversation-for-slack","${PIPELINE_NAME}_starter-code/post-normalize","${PIPELINE_NAME}_slack/post" -a web-export true | grep -v 'ok'
${WSK} action update --sequence test-pipeline-context-slack "${PIPELINE_NAME}_slack/receive","${PIPELINE_NAME}_starter-code/pre-normalize","${PIPELINE_NAME}_starter-code/normalize-slack-for-conversation","${PIPELINE_NAME}_context/load-context","${PIPELINE_NAME}_starter-code/pre-conversation","${PIPELINE_NAME}_conversation/call-conversation","${PIPELINE_NAME}_starter-code/post-conversation","${PIPELINE_NAME}_context/save-context","${PIPELINE_NAME}_starter-code/normalize-conversation-for-slack","${PIPELINE_NAME}_starter-code/post-normalize","${PIPELINE_NAME}_slack/post" -a web-export true | grep -v 'ok'

${WSK} action update --sequence test-pipeline-facebook "${PIPELINE_NAME}_starter-code/pre-normalize","${PIPELINE_NAME}_starter-code/normalize-facebook-for-conversation","${PIPELINE_NAME}_starter-code/pre-conversation","${PIPELINE_NAME}_conversation/call-conversation","${PIPELINE_NAME}_starter-code/post-conversation","${PIPELINE_NAME}_starter-code/normalize-conversation-for-facebook","${PIPELINE_NAME}_starter-code/post-normalize","${PIPELINE_NAME}_facebook/post" -a web-export true | grep -v 'ok'
${WSK} action update --sequence test-pipeline-context-facebook "${PIPELINE_NAME}_starter-code/pre-normalize","${PIPELINE_NAME}_starter-code/normalize-facebook-for-conversation","${PIPELINE_NAME}_context/load-context","${PIPELINE_NAME}_starter-code/pre-conversation","${PIPELINE_NAME}_conversation/call-conversation","${PIPELINE_NAME}_starter-code/post-conversation","${PIPELINE_NAME}_context/save-context","${PIPELINE_NAME}_starter-code/normalize-conversation-for-facebook","${PIPELINE_NAME}_starter-code/post-normalize","${PIPELINE_NAME}_facebook/post" -a web-export true | grep -v 'ok'

echo "end to end setup done"