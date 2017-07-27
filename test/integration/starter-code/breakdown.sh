#!/usr/bin/env bash

export WSK=${WSK-wsk}

${WSK} action delete starter-code/integration-pipeline-slack | grep -v 'ok'
${WSK} action delete starter-code/integration-pipeline-facebook | grep -v 'ok'
${WSK} action delete starter-code/mock-convo | grep -v 'ok'
