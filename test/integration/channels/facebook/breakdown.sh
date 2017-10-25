#!/usr/bin/env bash

export WSK=${WSK-wsk}

PACKAGE_NAME="$1_facebook"

${WSK} action delete ${PACKAGE_NAME}/middle | grep -v 'ok'
${WSK} action delete ${PACKAGE_NAME}/integration-pipeline | grep -v 'ok'
