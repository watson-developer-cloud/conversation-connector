#!/usr/bin/env bash

export WSK="bx wsk"

PIPELINE_NAME="$1_"
PACKAGE_NAME="$1_facebook"

${WSK} action update ${PACKAGE_NAME}/middle ./test/integration/channels/facebook/middle.js | grep -v 'ok'

${WSK} action update ${PACKAGE_NAME}/integration-pipeline --sequence ${PACKAGE_NAME}/middle,${PACKAGE_NAME}/multiple_post | grep -v 'ok'

postSequence="${PIPELINE_NAME}starter-code/post-normalize,${PACKAGE_NAME}/post"

${WSK} action update ${PIPELINE_NAME}postsequence --sequence ${postSequence} | grep -v 'ok'
