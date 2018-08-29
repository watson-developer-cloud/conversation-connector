#!/usr/bin/env bash

PACKAGE_NAME="$1"


# send and receive text
PIPELINE_SEND_TEXT="$1-integration-slack-send-text"

CLOUDANT_AUTH_KEY="${PIPELINE_SEND_TEXT}"

curl -s -XDELETE ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY}?rev=$(curl -s ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY} | jq -r ._rev) > /dev/null

bx wsk action delete ${PIPELINE_SEND_TEXT} > /dev/null
bx wsk action delete ${PIPELINE_SEND_TEXT}_postsequence > /dev/null
bx wsk action delete ${PIPELINE_SEND_TEXT}_slack/send-text > /dev/null
bx wsk action delete ${PIPELINE_SEND_TEXT}_slack/post > /dev/null
bx wsk action delete ${PIPELINE_SEND_TEXT}_slack/multiple_post > /dev/null
bx wsk action delete ${PIPELINE_SEND_TEXT}_slack/receive > /dev/null

bx wsk package delete ${PIPELINE_SEND_TEXT}_slack > /dev/null


# send text and receive an interactive message
PIPELINE_SEND_ATTACHED_MESSAGE="$1-integration-slack-send-attached-message"

CLOUDANT_AUTH_KEY="${PIPELINE_SEND_ATTACHED_MESSAGE}"

curl -s -XDELETE ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY}?rev=$(curl -s ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY} | jq -r ._rev) > /dev/null

bx wsk action delete ${PIPELINE_SEND_ATTACHED_MESSAGE} > /dev/null
bx wsk action delete ${PIPELINE_SEND_ATTACHED_MESSAGE}_postsequence > /dev/null
bx wsk action delete ${PIPELINE_SEND_ATTACHED_MESSAGE}_slack/send-attached-message > /dev/null
bx wsk action delete ${PIPELINE_SEND_ATTACHED_MESSAGE}_slack/post > /dev/null
bx wsk action delete ${PIPELINE_SEND_ATTACHED_MESSAGE}_slack/multiple_post > /dev/null
bx wsk action delete ${PIPELINE_SEND_ATTACHED_MESSAGE}_slack/receive > /dev/null

bx wsk package delete ${PIPELINE_SEND_ATTACHED_MESSAGE}_slack > /dev/null


# send interactive click and receive a click response
PIPELINE_SEND_ATTACHED_RESPONSE="$1-integration-slack-send-attached-response"

CLOUDANT_AUTH_KEY="${PIPELINE_SEND_ATTACHED_RESPONSE}"

curl -s -XDELETE ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY}?rev=$(curl -s ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY} | jq -r ._rev) > /dev/null

bx wsk action delete ${PIPELINE_SEND_ATTACHED_RESPONSE} > /dev/null
bx wsk action delete ${PIPELINE_SEND_ATTACHED_RESPONSE}_postsequence > /dev/null
bx wsk action delete ${PIPELINE_SEND_ATTACHED_RESPONSE}_slack/send-attached-message-response > /dev/null
bx wsk action delete ${PIPELINE_SEND_ATTACHED_RESPONSE}_slack/post > /dev/null
bx wsk action delete ${PIPELINE_SEND_ATTACHED_RESPONSE}_slack/multiple_post > /dev/null
bx wsk action delete ${PIPELINE_SEND_ATTACHED_RESPONSE}_slack/receive > /dev/null

bx wsk package delete ${PIPELINE_SEND_ATTACHED_RESPONSE}_slack > /dev/null


# Request and receive an interactive message requiring multipost
PIPELINE_SEND_ATTACHED_MULTIPOST="$1-integration-slack-send-attached-multipost"

CLOUDANT_AUTH_KEY="${PIPELINE_SEND_ATTACHED_MULTIPOST}"

curl -s -XDELETE ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY}?rev=$(curl -s ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY} | jq -r ._rev) > /dev/null

bx wsk action delete ${PIPELINE_SEND_ATTACHED_MULTIPOST}_slack/send-attached-message-multipost > /dev/null
bx wsk action delete ${PIPELINE_SEND_ATTACHED_MULTIPOST}_slack/post > /dev/null
bx wsk action delete ${PIPELINE_SEND_ATTACHED_MULTIPOST}_slack/multiple_post > /dev/null
bx wsk action delete ${PIPELINE_SEND_ATTACHED_MULTIPOST}_slack/receive > /dev/null
bx wsk action delete ${PIPELINE_SEND_ATTACHED_MULTIPOST}_postsequence > /dev/null
bx wsk action delete ${PIPELINE_SEND_ATTACHED_MULTIPOST} > /dev/null

bx wsk package delete ${PIPELINE_SEND_ATTACHED_MULTIPOST}_slack > /dev/null
