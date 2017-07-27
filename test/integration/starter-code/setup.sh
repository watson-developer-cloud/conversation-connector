#!/usr/bin/env bash

export WSK=${WSK-wsk}

${WSK} action update starter-code/mock-convo ./test/integration/starter-code/mock-convo.js | grep -v 'ok'
${WSK} action update starter-code/integration-pipeline-slack --sequence starter-code/normalize-slack-for-conversation,starter-code/pre-conversation,starter-code/mock-convo,starter-code/normalize-conversation-for-slack,starter-code/post-conversation | grep -v 'ok'
${WSK} action update starter-code/integration-pipeline-facebook --sequence starter-code/normalize-facebook-for-conversation,starter-code/pre-conversation,starter-code/mock-convo,starter-code/normalize-conversation-for-facebook,starter-code/post-conversation | grep -v 'ok'
