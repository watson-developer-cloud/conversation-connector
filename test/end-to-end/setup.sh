#!/usr/bin/env bash

export WSK=${WSK-wsk}

${WSK} action update --sequence test-pipeline-slack slack/receive,starter-code/normalize-slack-for-conversation,starter-code/pre-conversation,conversation/call-conversation,starter-code/normalize-conversation-for-slack,starter-code/post-conversation,slack/post -a web-export true | grep -v 'ok'
${WSK} action update --sequence test-pipeline-context-slack slack/receive,starter-code/normalize-slack-for-conversation,context/load-context,starter-code/pre-conversation,conversation/call-conversation,starter-code/normalize-conversation-for-slack,starter-code/post-conversation,context/save-context,slack/post -a web-export true | grep -v 'ok'

${WSK} action update --sequence test-pipeline-facebook starter-code/normalize-facebook-for-conversation,starter-code/pre-conversation,conversation/call-conversation,starter-code/normalize-conversation-for-facebook,starter-code/post-conversation,facebook/post -a web-export true | grep -v 'ok'
${WSK} action update --sequence test-pipeline-context-facebook starter-code/normalize-facebook-for-conversation,context/load-context,starter-code/pre-conversation,conversation/call-conversation,starter-code/normalize-conversation-for-facebook,starter-code/post-conversation,context/save-context,facebook/post -a web-export true | grep -v 'ok'
${WSK} action update --sequence test-pipeline-batched-messages-facebook starter-code/normalize-facebook-for-conversation,context/load-context,starter-code/pre-conversation,conversation/call-conversation,starter-code/normalize-conversation-for-facebook,starter-code/post-conversation,context/save-context,facebook/post -a web-export true | grep -v 'ok'
