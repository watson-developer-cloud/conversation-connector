#!/usr/bin/env bash

export WSK=${WSK-wsk}

PACKAGE_NAME="$1"


# send and receive text
PIPELINE_SEND_TEXT="$1-integration-slack-send-text"

CLOUDANT_AUTH_KEY="${PIPELINE_SEND_TEXT}"

curl -s -XDELETE ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY}?rev=$(curl -s ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY} | jq -r ._rev) > /dev/null

${WSK} action delete ${PIPELINE_SEND_TEXT} > /dev/null
${WSK} action delete ${PIPELINE_SEND_TEXT}_slack/send-text > /dev/null
${WSK} action delete ${PIPELINE_SEND_TEXT}_slack/post > /dev/null
${WSK} action delete ${PIPELINE_SEND_TEXT}_slack/receive > /dev/null

${WSK} package delete ${PIPELINE_SEND_TEXT}_slack > /dev/null


# send text and receive an interactive message
PIPELINE_SEND_ATTACHED_MESSAGE="$1-integration-slack-send-attached-message"

CLOUDANT_AUTH_KEY="${PIPELINE_SEND_ATTACHED_MESSAGE}"

curl -s -XDELETE ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY}?rev=$(curl -s ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY} | jq -r ._rev) > /dev/null

${WSK} action delete ${PIPELINE_SEND_ATTACHED_MESSAGE} > /dev/null
${WSK} action delete ${PIPELINE_SEND_ATTACHED_MESSAGE}_slack/send-attached-message > /dev/null
${WSK} action delete ${PIPELINE_SEND_ATTACHED_MESSAGE}_slack/post > /dev/null
${WSK} action delete ${PIPELINE_SEND_ATTACHED_MESSAGE}_slack/receive > /dev/null

${WSK} package delete ${PIPELINE_SEND_ATTACHED_MESSAGE}_slack > /dev/null


# send interactive click and receive a click response
PIPELINE_SEND_ATTACHED_RESPONSE="$1-integration-slack-send-attached-response"

CLOUDANT_AUTH_KEY="${PIPELINE_SEND_ATTACHED_RESPONSE}"

curl -s -XDELETE ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY}?rev=$(curl -s ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY} | jq -r ._rev) > /dev/null

${WSK} action delete ${PIPELINE_SEND_ATTACHED_RESPONSE} > /dev/null
${WSK} action delete ${PIPELINE_SEND_ATTACHED_RESPONSE}_slack/send-attached-message-response > /dev/null
${WSK} action delete ${PIPELINE_SEND_ATTACHED_RESPONSE}_slack/post > /dev/null
${WSK} action delete ${PIPELINE_SEND_ATTACHED_RESPONSE}_slack/receive > /dev/null

${WSK} package delete ${PIPELINE_SEND_ATTACHED_RESPONSE}_slack > /dev/null
