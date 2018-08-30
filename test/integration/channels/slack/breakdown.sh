#!/usr/bin/env bash

PACKAGE_NAME="$1"


# send and receive text
PIPELINE_SEND_TEXT="$1-integration-slack-send-text"

CLOUDANT_AUTH_KEY="${PIPELINE_SEND_TEXT}"

curl -s -XDELETE ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY}?rev=$(curl -s ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY} | jq -r ._rev)

bx wsk action delete ${PIPELINE_SEND_TEXT}
bx wsk action delete ${PIPELINE_SEND_TEXT}_postsequence
bx wsk action delete ${PIPELINE_SEND_TEXT}_slack/send-text
bx wsk action delete ${PIPELINE_SEND_TEXT}_slack/post
bx wsk action delete ${PIPELINE_SEND_TEXT}_slack/multiple_post
bx wsk action delete ${PIPELINE_SEND_TEXT}_slack/receive

bx wsk package delete ${PIPELINE_SEND_TEXT}_slack


# send text and receive an interactive message
PIPELINE_SEND_ATTACHED_MESSAGE="$1-integration-slack-send-attached-message"

CLOUDANT_AUTH_KEY="${PIPELINE_SEND_ATTACHED_MESSAGE}"

curl -s -XDELETE ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY}?rev=$(curl -s ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY} | jq -r ._rev)

bx wsk action delete ${PIPELINE_SEND_ATTACHED_MESSAGE}
bx wsk action delete ${PIPELINE_SEND_ATTACHED_MESSAGE}_postsequence
bx wsk action delete ${PIPELINE_SEND_ATTACHED_MESSAGE}_slack/send-attached-message
bx wsk action delete ${PIPELINE_SEND_ATTACHED_MESSAGE}_slack/post
bx wsk action delete ${PIPELINE_SEND_ATTACHED_MESSAGE}_slack/multiple_post
bx wsk action delete ${PIPELINE_SEND_ATTACHED_MESSAGE}_slack/receive

bx wsk package delete ${PIPELINE_SEND_ATTACHED_MESSAGE}_slack


# send interactive click and receive a click response
PIPELINE_SEND_ATTACHED_RESPONSE="$1-integration-slack-send-attached-response"

CLOUDANT_AUTH_KEY="${PIPELINE_SEND_ATTACHED_RESPONSE}"

curl -s -XDELETE ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY}?rev=$(curl -s ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY} | jq -r ._rev)

bx wsk action delete ${PIPELINE_SEND_ATTACHED_RESPONSE}
bx wsk action delete ${PIPELINE_SEND_ATTACHED_RESPONSE}_postsequence
bx wsk action delete ${PIPELINE_SEND_ATTACHED_RESPONSE}_slack/send-attached-message-response
bx wsk action delete ${PIPELINE_SEND_ATTACHED_RESPONSE}_slack/post
bx wsk action delete ${PIPELINE_SEND_ATTACHED_RESPONSE}_slack/multiple_post
bx wsk action delete ${PIPELINE_SEND_ATTACHED_RESPONSE}_slack/receive

bx wsk package delete ${PIPELINE_SEND_ATTACHED_RESPONSE}_slack


# Request and receive an interactive message requiring multipost
PIPELINE_SEND_ATTACHED_MULTIPOST="$1-integration-slack-send-attached-multipost"

CLOUDANT_AUTH_KEY="${PIPELINE_SEND_ATTACHED_MULTIPOST}"

curl -s -XDELETE ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY}?rev=$(curl -s ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY} | jq -r ._rev)

bx wsk action delete ${PIPELINE_SEND_ATTACHED_MULTIPOST}_slack/send-attached-message-multipost
bx wsk action delete ${PIPELINE_SEND_ATTACHED_MULTIPOST}_slack/post
bx wsk action delete ${PIPELINE_SEND_ATTACHED_MULTIPOST}_slack/multiple_post
bx wsk action delete ${PIPELINE_SEND_ATTACHED_MULTIPOST}_slack/receive
bx wsk action delete ${PIPELINE_SEND_ATTACHED_MULTIPOST}_postsequence
bx wsk action delete ${PIPELINE_SEND_ATTACHED_MULTIPOST}

bx wsk package delete ${PIPELINE_SEND_ATTACHED_MULTIPOST}_slack
