#!/usr/bin/env bash

export WSK=${WSK-wsk}

BINDINGS=$1 

CONVO_USERNAME=`cat ${BINDINGS} | jq --raw-output '.username'`
CONVO_PASSWORD=`cat ${BINDINGS} | jq --raw-output '.password'`
CONVO_WORKSPACE_ID=`cat ${BINDINGS} | jq --raw-output '.workspace_id'`

${WSK} package update conversation \
    -p username ${CONVO_USERNAME} \
    -p password ${CONVO_PASSWORD} \
    -p workspace_id ${CONVO_WORKSPACE_ID}

${WSK} action update conversation/call-conversation call-conversation.js