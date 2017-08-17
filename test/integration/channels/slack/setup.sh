#!/usr/bin/env bash

WSK=${WSK-wsk}

${WSK} action update slack/send-text ./test/integration/channels/slack/send-text.js | grep -v 'ok'
${WSK} action update slack/send-attached-message ./test/integration/channels/slack/send-attached-message.js | grep -v 'ok'
${WSK} action update slack/send-attached-message-response ./test/integration/channels/slack/send-attached-message-response.js | grep -v 'ok'

${WSK} action update slack/integration-pipeline --sequence slack/receive,slack/send-text,slack/post | grep -v 'ok'
${WSK} action update slack/integration-pipeline-text-to-attached-message --sequence slack/receive,slack/send-attached-message,slack/post | grep -v 'ok'
${WSK} action update slack/integration-pipeline-attached-message-to-response --sequence slack/receive,slack/send-attached-message-response,slack/post | grep -v 'ok'
