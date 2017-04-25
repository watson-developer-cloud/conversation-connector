#!/usr/bin/env bash

export WSK=${WSK-wsk}

CONVO_USERNAME=`cat ./bindings.json | jq --raw-output '.conversation.username'`
CONVO_PASSWORD=`cat ./bindings.json | jq --raw-output '.conversation.password'`
CONVO_WORKSPACE_ID=`cat ./bindings.json | jq --raw-output '.conversation.workspace_id'`

${WSK} package update conversation \
    -p conversation.username ${CONVO_USERNAME} \
    -p conversation.password ${CONVO_PASSWORD} \
    -p conversation.workspace_id ${CONVO_WORKSPACE_ID}

${WSK} action update conversation/call-conversation call-conversation.js