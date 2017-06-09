#!/usr/bin/env bash

export WSK=${WSK-wsk}

${WSK} action delete starter-code/integration-pipeline | grep -v 'ok'
${WSK} action delete starter-code/mock-convo | grep -v 'ok'
