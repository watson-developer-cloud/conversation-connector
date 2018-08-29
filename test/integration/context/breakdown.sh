#!/usr/bin/env bash

PACKAGE_NAME="$1_context"

bx wsk action delete ${PACKAGE_NAME}/integration-pipeline | grep -v 'ok'
bx wsk action delete ${PACKAGE_NAME}/middle-for-context | grep -v 'ok'
