#!/usr/bin/env bash

WSK=${WSK-wsk}

PACKAGE_NAME="$1_facebook"

${WSK} action update ${PACKAGE_NAME}/middle ./test/integration/channels/facebook/middle.js | grep -v 'ok'

${WSK} action update ${PACKAGE_NAME}/integration-pipeline --sequence ${PACKAGE_NAME}/middle,${PACKAGE_NAME}/post | grep -v 'ok'
