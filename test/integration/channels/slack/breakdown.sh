#!/usr/bin/env bash

export WSK=${WSK-wsk}

${WSK} action delete slack/integration-pipeline | grep -v 'ok'
${WSK} action delete slack/integration-pipeline-text-to-attached-message | grep -v 'ok'
${WSK} action delete slack/integration-pipeline-attached-message-to-response | grep -v 'ok'

${WSK} action delete slack/send-text | grep -v 'ok'
${WSK} action delete slack/send-attached-message | grep -v 'ok'
${WSK} action delete slack/send-attached-message-response | grep -v 'ok'
