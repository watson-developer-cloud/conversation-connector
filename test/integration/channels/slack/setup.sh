#!/usr/bin/env bash

WSK=${WSK-wsk}

PACKAGE_NAME="$1"

retriableCreateDbDoc() {
  DOC="$1"
  URL="$2"

  for i in {1..10}; do
    out=$(curl -s -XPUT -d "$DOC" "$URL")
    e=$(echo $out | jq -r .error)
    if [ -z "$e" -o "$e" == "null" ]; then
      break
    else
      if [ "$e" == "conflict" -o "$e" == "file_exists" ]; then
        break
      fi
      echo "PUT url [$URL] returned with error [$e], retrying ($i)..."
      sleep 5
    fi
  done
}

AUTH_DOC=$(node -e 'const params = process.env;
const doc = {
  slack: {
    client_id: params.__TEST_SLACK_CLIENT_ID,
    client_secret: params.__TEST_SLACK_CLIENT_SECRET,
    verification_token: params.__TEST_SLACK_VERIFICATION_TOKEN,
    bot_users: {
      "bot-id": {
        access_token: params.__TEST_SLACK_ACCESS_TOKEN,
        bot_access_token: params.__TEST_SLACK_BOT_ACCESS_TOKEN
      }
    }
  }
};
console.log(JSON.stringify(doc));
')


# send and receive text
PIPELINE_SEND_TEXT="$1-integration-slack-send-text"

CLOUDANT_AUTH_KEY="${PIPELINE_SEND_TEXT}"

retriableCreateDbDoc ${AUTH_DOC} ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY}

${WSK} package update ${PIPELINE_SEND_TEXT}_slack \
  -a cloudant_auth_key "${CLOUDANT_AUTH_KEY}" \
  -a cloudant_url "${__TEST_CLOUDANT_URL}" \
  -a cloudant_auth_dbname "authdb" \
  -a cloudant_context_dbname "contextdb" > /dev/null

${WSK} action update ${PIPELINE_SEND_TEXT}_slack/receive ./channels/slack/receive/index.js -a web-export true > /dev/null
${WSK} action update ${PIPELINE_SEND_TEXT}_slack/post ./channels/slack/post/index.js > /dev/null

${WSK} action update ${PIPELINE_SEND_TEXT}_slack/send-text ./test/integration/channels/slack/send-text.js > /dev/null
${WSK} action update ${PIPELINE_SEND_TEXT} --sequence ${PIPELINE_SEND_TEXT}_slack/send-text,${PIPELINE_SEND_TEXT}_slack/post > /dev/null


# send text and receive an interactive message
PIPELINE_SEND_ATTACHED_MESSAGE="$1-integration-slack-send-attached-message"

CLOUDANT_AUTH_KEY="${PIPELINE_SEND_ATTACHED_MESSAGE}"

retriableCreateDbDoc ${AUTH_DOC} ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY}

${WSK} package update ${PIPELINE_SEND_ATTACHED_MESSAGE}_slack \
  -a cloudant_auth_key "${CLOUDANT_AUTH_KEY}" \
  -a cloudant_url "${__TEST_CLOUDANT_URL}" \
  -a cloudant_auth_dbname "authdb" \
  -a cloudant_context_dbname "contextdb" > /dev/null

${WSK} action update ${PIPELINE_SEND_ATTACHED_MESSAGE}_slack/receive ./channels/slack/receive/index.js -a web-export true > /dev/null
${WSK} action update ${PIPELINE_SEND_ATTACHED_MESSAGE}_slack/post ./channels/slack/post/index.js > /dev/null

${WSK} action update ${PIPELINE_SEND_ATTACHED_MESSAGE}_slack/send-attached-message ./test/integration/channels/slack/send-attached-message.js > /dev/null
${WSK} action update ${PIPELINE_SEND_ATTACHED_MESSAGE} --sequence ${PIPELINE_SEND_ATTACHED_MESSAGE}_slack/send-attached-message,${PIPELINE_SEND_ATTACHED_MESSAGE}_slack/post > /dev/null


# send interactive click and receive a click response
PIPELINE_SEND_ATTACHED_RESPONSE="$1-integration-slack-send-attached-response"

CLOUDANT_AUTH_KEY="${PIPELINE_SEND_ATTACHED_RESPONSE}"

retriableCreateDbDoc ${AUTH_DOC} ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY}

${WSK} package update ${PIPELINE_SEND_ATTACHED_RESPONSE}_slack \
  -a cloudant_auth_key "${CLOUDANT_AUTH_KEY}" \
  -a cloudant_url "${__TEST_CLOUDANT_URL}" \
  -a cloudant_auth_dbname "authdb" \
  -a cloudant_context_dbname "contextdb" > /dev/null

${WSK} action update ${PIPELINE_SEND_ATTACHED_RESPONSE}_slack/receive ./channels/slack/receive/index.js -a web-export true > /dev/null
${WSK} action update ${PIPELINE_SEND_ATTACHED_RESPONSE}_slack/post ./channels/slack/post/index.js > /dev/null

${WSK} action update ${PIPELINE_SEND_ATTACHED_RESPONSE}_slack/send-attached-message-response ./test/integration/channels/slack/send-attached-message-response.js > /dev/null
${WSK} action update ${PIPELINE_SEND_ATTACHED_RESPONSE} --sequence ${PIPELINE_SEND_ATTACHED_RESPONSE}_slack/send-attached-message-response,${PIPELINE_SEND_ATTACHED_RESPONSE}_slack/post > /dev/null
