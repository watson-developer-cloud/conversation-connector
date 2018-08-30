#!/usr/bin/env bash

PIPELINE_NAME=$1
PACKAGE_NAME="$1_facebook"

bx wsk action delete ${PACKAGE_NAME}/middle | grep -v 'ok'
bx wsk action delete ${PACKAGE_NAME}/integration-pipeline | grep -v 'ok'
bx wsk action delete ${PIPELINE_NAME}postsequence | grep -v 'ok'
