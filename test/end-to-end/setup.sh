#!/usr/bin/env bash

export WSK=${WSK-wsk}

retriableCreateDbDoc() {
  DOC="$1"
  URL="$2"

  for i in {1..10}; do
    e=$(curl -s -XPUT -d "$DOC" "$URL" | jq -r .error)
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

PIPELINE_NAME="$1"

AUTH_DOC=$(node -e '
const params = process.env;
const botId = params.__TEST_SLACK_BOT_USER_ID;
const doc = {
  conversation: {
    username: params.__TEST_CONVERSATION_USERNAME,
    password: params.__TEST_CONVERSATION_PASSWORD,
    workspace_id: params.__TEST_CONVERSATION_WORKSPACE_ID
  },
  slack: {
    client_id: params.__TEST_SLACK_CLIENT_ID,
    client_secret: params.__TEST_SLACK_CLIENT_SECRET,
    verification_token: params.__TEST_SLACK_VERIFICATION_TOKEN,
    bot_users: {}
  }
};
const botDoc = {
  access_token: params.__TEST_SLACK_ACCESS_TOKEN,
  bot_access_token: params.__TEST_SLACK_BOT_ACCESS_TOKEN
};
doc.slack.bot_users[botId] = botDoc;
console.log(JSON.stringify(doc));
')


SLACK_PIPELINE_NO_CONTEXT="${PIPELINE_NAME}-endtoend-slack-nocontext"
CLOUDANT_AUTH_KEY="${SLACK_PIPELINE_NO_CONTEXT}"

retriableCreateDbDoc ${AUTH_DOC} ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY}
# curl -s -XPUT -d ${AUTH_DOC} ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY}

${WSK} package update ${SLACK_PIPELINE_NO_CONTEXT}_slack \
  -a cloudant_url "${__TEST_CLOUDANT_URL}" \
  -a cloudant_auth_key "${CLOUDANT_AUTH_KEY}" \
  -a cloudant_auth_dbname "authdb" \
  -a cloudant_context_dbname "contextdb" > /dev/null
${WSK} package update ${SLACK_PIPELINE_NO_CONTEXT}_starter-code \
  -a cloudant_url "${__TEST_CLOUDANT_URL}" \
  -a cloudant_auth_key "${CLOUDANT_AUTH_KEY}" \
  -a cloudant_auth_dbname "authdb" \
  -a cloudant_context_dbname "contextdb" > /dev/null
${WSK} package update ${SLACK_PIPELINE_NO_CONTEXT}_conversation \
  -a cloudant_url "${__TEST_CLOUDANT_URL}" \
  -a cloudant_auth_key "${CLOUDANT_AUTH_KEY}" \
  -a cloudant_auth_dbname "authdb" \
  -a cloudant_context_dbname "contextdb" > /dev/null

${WSK} action update ${SLACK_PIPELINE_NO_CONTEXT}_slack/receive  ./channels/slack/receive/index.js -a web-export true > /dev/null
${WSK} action update ${SLACK_PIPELINE_NO_CONTEXT}_slack/post ./channels/slack/post/index.js > /dev/null
${WSK} action update ${SLACK_PIPELINE_NO_CONTEXT}_starter-code/pre-conversation ./starter-code/pre-conversation.js > /dev/null
${WSK} action update ${SLACK_PIPELINE_NO_CONTEXT}_starter-code/post-conversation ./starter-code/post-conversation.js > /dev/null
${WSK} action update ${SLACK_PIPELINE_NO_CONTEXT}_starter-code/pre-normalize ./starter-code/pre-normalize.js > /dev/null
${WSK} action update ${SLACK_PIPELINE_NO_CONTEXT}_starter-code/post-normalize ./starter-code/post-normalize.js > /dev/null
${WSK} action update ${SLACK_PIPELINE_NO_CONTEXT}_starter-code/normalize-slack-for-conversation ./starter-code/normalize-for-conversation/normalize-slack-for-conversation.js > /dev/null
${WSK} action update ${SLACK_PIPELINE_NO_CONTEXT}_starter-code/normalize-conversation-for-slack ./starter-code/normalize-for-channel/normalize-conversation-for-slack.js > /dev/null
${WSK} action update ${SLACK_PIPELINE_NO_CONTEXT}_conversation/call-conversation ./conversation/call-conversation.js > /dev/null

${WSK} action update ${SLACK_PIPELINE_NO_CONTEXT} --sequence ${SLACK_PIPELINE_NO_CONTEXT}_starter-code/pre-normalize,${SLACK_PIPELINE_NO_CONTEXT}_starter-code/normalize-slack-for-conversation,${SLACK_PIPELINE_NO_CONTEXT}_starter-code/pre-conversation,${SLACK_PIPELINE_NO_CONTEXT}_conversation/call-conversation,${SLACK_PIPELINE_NO_CONTEXT}_starter-code/post-conversation,${SLACK_PIPELINE_NO_CONTEXT}_starter-code/normalize-conversation-for-slack,${SLACK_PIPELINE_NO_CONTEXT}_starter-code/post-normalize,${SLACK_PIPELINE_NO_CONTEXT}_slack/post > /dev/null


SLACK_PIPELINE_WITH_CONTEXT="${PIPELINE_NAME}-endtoend-slack-withcontext"
CLOUDANT_AUTH_KEY="${SLACK_PIPELINE_WITH_CONTEXT}"

retriableCreateDbDoc ${AUTH_DOC} ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY}
# curl -s -XPUT -d ${AUTH_DOC} ${__TEST_CLOUDANT_URL}/authdb/${CLOUDANT_AUTH_KEY}

${WSK} package update ${SLACK_PIPELINE_WITH_CONTEXT}_slack \
  -a cloudant_url "${__TEST_CLOUDANT_URL}" \
  -a cloudant_auth_key "${CLOUDANT_AUTH_KEY}" \
  -a cloudant_auth_dbname "authdb" \
  -a cloudant_context_dbname "contextdb" > /dev/null
${WSK} package update ${SLACK_PIPELINE_WITH_CONTEXT}_starter-code \
  -a cloudant_url "${__TEST_CLOUDANT_URL}" \
  -a cloudant_auth_key "${CLOUDANT_AUTH_KEY}" \
  -a cloudant_auth_dbname "authdb" \
  -a cloudant_context_dbname "contextdb" > /dev/null
${WSK} package update ${SLACK_PIPELINE_WITH_CONTEXT}_conversation \
  -a cloudant_url "${__TEST_CLOUDANT_URL}" \
  -a cloudant_auth_key "${CLOUDANT_AUTH_KEY}" \
  -a cloudant_auth_dbname "authdb" \
  -a cloudant_context_dbname "contextdb" > /dev/null
${WSK} package update ${SLACK_PIPELINE_WITH_CONTEXT}_context \
  -a cloudant_url "${__TEST_CLOUDANT_URL}" \
  -a cloudant_auth_key "${CLOUDANT_AUTH_KEY}" \
  -a cloudant_auth_dbname "authdb" \
  -a cloudant_context_dbname "contextdb" > /dev/null

${WSK} action update ${SLACK_PIPELINE_WITH_CONTEXT}_slack/receive ./channels/slack/receive/index.js -a web-export true > /dev/null
${WSK} action update ${SLACK_PIPELINE_WITH_CONTEXT}_slack/post ./channels/slack/post/index.js > /dev/null
${WSK} action update ${SLACK_PIPELINE_WITH_CONTEXT}_starter-code/normalize-slack-for-conversation ./starter-code/normalize-for-conversation/normalize-slack-for-conversation.js > /dev/null
${WSK} action update ${SLACK_PIPELINE_WITH_CONTEXT}_starter-code/normalize-conversation-for-slack ./starter-code/normalize-for-channel/normalize-conversation-for-slack.js > /dev/null
${WSK} action update ${SLACK_PIPELINE_WITH_CONTEXT}_starter-code/pre-normalize ./starter-code/pre-normalize.js > /dev/null
${WSK} action update ${SLACK_PIPELINE_WITH_CONTEXT}_starter-code/post-normalize ./starter-code/post-normalize.js > /dev/null
${WSK} action update ${SLACK_PIPELINE_WITH_CONTEXT}_starter-code/pre-conversation ./starter-code/pre-conversation.js > /dev/null
${WSK} action update ${SLACK_PIPELINE_WITH_CONTEXT}_starter-code/post-conversation ./starter-code/post-conversation.js > /dev/null
${WSK} action update ${SLACK_PIPELINE_WITH_CONTEXT}_conversation/call-conversation ./conversation/call-conversation.js > /dev/null
${WSK} action update ${SLACK_PIPELINE_WITH_CONTEXT}_context/load-context ./context/load-context.js > /dev/null
${WSK} action update ${SLACK_PIPELINE_WITH_CONTEXT}_context/save-context ./context/save-context.js > /dev/null

${WSK} action update ${SLACK_PIPELINE_WITH_CONTEXT} --sequence ${SLACK_PIPELINE_WITH_CONTEXT}_starter-code/pre-normalize,${SLACK_PIPELINE_WITH_CONTEXT}_starter-code/normalize-slack-for-conversation,${SLACK_PIPELINE_WITH_CONTEXT}_context/load-context,${SLACK_PIPELINE_WITH_CONTEXT}_starter-code/pre-conversation,${SLACK_PIPELINE_WITH_CONTEXT}_conversation/call-conversation,${SLACK_PIPELINE_WITH_CONTEXT}_starter-code/post-conversation,${SLACK_PIPELINE_WITH_CONTEXT}_context/save-context,${SLACK_PIPELINE_WITH_CONTEXT}_starter-code/normalize-conversation-for-slack,${SLACK_PIPELINE_WITH_CONTEXT}_starter-code/post-normalize,${SLACK_PIPELINE_WITH_CONTEXT}_slack/post > /dev/null

${WSK} action update --sequence test-pipeline-facebook "${PIPELINE_NAME}_starter-code/pre-normalize","${PIPELINE_NAME}_starter-code/normalize-facebook-for-conversation","${PIPELINE_NAME}_starter-code/pre-conversation","${PIPELINE_NAME}_conversation/call-conversation","${PIPELINE_NAME}_starter-code/post-conversation","${PIPELINE_NAME}_starter-code/normalize-conversation-for-facebook","${PIPELINE_NAME}_starter-code/post-normalize","${PIPELINE_NAME}_facebook/post" -a web-export true | grep -v 'ok'
${WSK} action update --sequence test-pipeline-context-facebook "${PIPELINE_NAME}_starter-code/pre-normalize","${PIPELINE_NAME}_starter-code/normalize-facebook-for-conversation","${PIPELINE_NAME}_context/load-context","${PIPELINE_NAME}_starter-code/pre-conversation","${PIPELINE_NAME}_conversation/call-conversation","${PIPELINE_NAME}_starter-code/post-conversation","${PIPELINE_NAME}_context/save-context","${PIPELINE_NAME}_starter-code/normalize-conversation-for-facebook","${PIPELINE_NAME}_starter-code/post-normalize","${PIPELINE_NAME}_facebook/post" -a web-export true | grep -v 'ok'

${WSK} property set --apihost ${__OW_API_HOST} --auth ${__TEST_DEPLOYUSER_WSK_API_KEY} --namespace ${__TEST_DEPLOYUSER_WSK_NAMESPACE} > /dev/null

# Clean the user-deploy namespace to ensure the deploy end-to-end tests are performed
#   with the user starting with no artifacts
IFS=$'\n'
while [ $(${WSK} action list | tail -n +2 | wc -l | awk '{print $1}') -gt 0 ]; do
  for line in `${WSK} action list | tail -n +2`; do
    actionName=${line%% *}
    execution=${line##* }
    ${WSK} action delete $actionName > /dev/null
  done
done

for line in `${WSK} package list | tail -n +2`; do
  packageName=${line%% *}
  execution=${line##* }
  ${WSK} package delete $packageName > /dev/null
done

for line in `${WSK} trigger list | tail -n +2`; do
  triggerName=${line%% *}
  execution=${line##* }
  ${WSK} trigger delete $triggerName > /dev/null
done

for line in `${WSK} rule list | tail -n +2`; do
  ruleName=${line%% *}
  execution=${line##* }
  ${WSK} rule delete $ruleName > /dev/null
done

IFS=$' \t\n'

${WSK} property set --apihost ${__OW_API_HOST} --auth ${__OW_API_KEY} --namespace ${__OW_NAMESPACE} > /dev/null
