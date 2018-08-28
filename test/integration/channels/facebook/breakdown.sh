#!/usr/bin/env bash

export WSK="bx wsk"

PIPELINE_NAME=$1
PACKAGE_NAME="$1_facebook"

${WSK} action delete ${PACKAGE_NAME}/middle | grep -v 'ok'
${WSK} action delete ${PACKAGE_NAME}/integration-pipeline | grep -v 'ok'
${WSK} action delete ${PIPELINE_NAME}postsequence | grep -v 'ok'
