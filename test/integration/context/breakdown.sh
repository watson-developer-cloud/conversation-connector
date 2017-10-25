#!/usr/bin/env bash

export WSK=${WSK-wsk}

PACKAGE_NAME="$1_context"

${WSK} action delete ${PACKAGE_NAME}/integration-pipeline | grep -v 'ok'
${WSK} action delete ${PACKAGE_NAME}/middle-for-context | grep -v 'ok'
