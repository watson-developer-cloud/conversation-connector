#!/usr/bin/env bash

PACKAGE_NAME="$1_context"

bx wsk action update ${PACKAGE_NAME}/middle-for-context ./test/integration/context/middle-for-context.js | grep -v 'ok'
bx wsk action update ${PACKAGE_NAME}/integration-pipeline --sequence ${PACKAGE_NAME}/load-context,${PACKAGE_NAME}/middle-for-context,${PACKAGE_NAME}/save-context | grep -v 'ok'
