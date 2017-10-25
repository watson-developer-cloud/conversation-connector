#!/usr/bin/env bash

export WSK=${WSK-wsk}

PACKAGE_NAME="$1_context"

${WSK} action update ${PACKAGE_NAME}/middle-for-context ./test/integration/context/middle-for-context.js | grep -v 'ok'
${WSK} action update ${PACKAGE_NAME}/integration-pipeline --sequence ${PACKAGE_NAME}/load-context,${PACKAGE_NAME}/middle-for-context,${PACKAGE_NAME}/save-context | grep -v 'ok'
