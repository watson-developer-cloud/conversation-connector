#!/usr/bin/env bash

export WSK=${WSK-wsk}

${WSK} action update starter-code/mock-convo-text ./test/integration/starter-code/mock-convo-text.js | grep -v 'ok'
${WSK} action update starter-code/mock-convo-slack-data ./test/integration/starter-code/mock-convo-slack-data.js | grep -v 'ok'
${WSK} action update starter-code/mock-convo-facebook-data ./test/integration/starter-code/mock-convo-facebook-data.js | grep -v 'ok'

${WSK} action update starter-code/integration-pipeline-slack --sequence starter-code/normalize-slack-for-conversation,starter-code/pre-conversation,starter-code/mock-convo-text,starter-code/normalize-conversation-for-slack,starter-code/post-conversation | grep -v 'ok'
${WSK} action update starter-code/integration-pipeline-slack-with-slack-data --sequence starter-code/normalize-slack-for-conversation,starter-code/pre-conversation,starter-code/mock-convo-slack-data,starter-code/normalize-conversation-for-slack,starter-code/post-conversation | grep -v 'ok'

${WSK} action update starter-code/integration-pipeline-facebook --sequence starter-code/normalize-facebook-for-conversation,starter-code/pre-conversation,starter-code/mock-convo-text,starter-code/normalize-conversation-for-facebook,starter-code/post-conversation | grep -v 'ok'
${WSK} action update starter-code/integration-pipeline-facebook-with-facebook-data --sequence starter-code/normalize-facebook-for-conversation,starter-code/pre-conversation,starter-code/mock-convo-facebook-data,starter-code/normalize-conversation-for-facebook,starter-code/post-conversation | grep -v 'ok'
