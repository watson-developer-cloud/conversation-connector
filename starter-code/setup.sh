#!/usr/bin/env bash

export WSK=${WSK-wsk}

BINDINGS=$1

CONVO_WORKSPACE_ID=`cat ${BINDINGS} | jq --raw-output '.conversation.workspace_id'`

${WSK} package update starter-code \
    -p workspace_id ${CONVO_WORKSPACE_ID}

for file in `find . -type f -name '*.js'`; do
  file_basename=`basename ${file}`
  file_basename=${file_basename%.*}
  ${WSK} action update starter-code/${file_basename}  ${file}
done
