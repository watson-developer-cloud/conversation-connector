#!/usr/bin/env bash

export WSK=${WSK-wsk}

${WSK} action delete test-pipeline-slack | grep -v 'ok'
${WSK} action delete test-pipeline-context-slack | grep -v 'ok'
${WSK} action delete test-pipeline-facebook | grep -v 'ok'
${WSK} action delete test-pipeline-context-facebook | grep -v 'ok'
${WSK} action delete test-pipeline-batched-messages-facebook | grep -v 'ok'