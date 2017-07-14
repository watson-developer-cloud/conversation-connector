#!/usr/bin/env bash

export WSK=${WSK-wsk}

${WSK} action update context/middle-for-context ./test/integration/context/middle-for-context.js | grep -v 'ok'
${WSK} action update context/integration-pipeline --sequence context/load-context,context/middle-for-context,context/save-context | grep -v 'ok'
