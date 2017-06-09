#!/usr/bin/env bash

export WSK=${WSK-wsk}

TEST_PIPELINE='test-pipeline'

echo "Running Convo-Flexible-Bot test suite."
echo "!!!Do NOT kill this process halfway as this will break the OpenWhisk parameter bindings!!!"
echo "   ...but if you do, simply run './setup.sh' from the root directory again."
echo -e "\n"

# When running the test manually, return to the root directory first
if [ `pwd | tr "/" "\n" | tail -n 1` == "test" ]; then
  cd ..
fi

# Check the test system credential files exist
SLACK_PARAM_FILE='./test/resources/slack-bindings.json'
if [ ! -f $SLACK_PARAM_FILE ]; then
  echo "Slack test parameters file $SLACK_PARAM_FILE not found."
  exit 1
fi
OPENWHISK_PARAM_FILE='./test/resources/openwhisk-bindings.json'
if [ ! -f $OPENWHISK_PARAM_FILE ]; then
  echo "OpenWhisk test parameters file $OPENWHISK_PARAM_FILE not found."
  exit 1
fi
CONVERSATION_PARAM_FILE='./test/resources/conversation-bindings.json'
if [ ! -f $CONVERSATION_PARAM_FILE ]; then
  echo "Conversation test parameters file $CONVERSATION_PARAM_FILE not found."
  exit 1
fi

WSK_PROD_HOST=`wsk property get --apihost | tr "\t" "\n" | tail -n 1`
WSK_PROD_KEY=`wsk property get --auth | tr "\t" "\n" | tail -n 1`

# Store the prod credential bindings
SLACK_PROD_BINDINGS=`wsk package get slack | grep -v 'got package' | jq '.parameters[]'`
SLACK_PROD_ACCESS_TOKEN=`echo $SLACK_PROD_BINDINGS | jq --raw-output 'select(.key=="access_token") | .value'`
SLACK_PROD_BOT_ACCESS_TOKEN=`echo $SLACK_PROD_BINDINGS | jq --raw-output 'select(.key=="bot_access_token") | .value'`
SLACK_PROD_BOT_USER_ID=`echo $SLACK_PROD_BINDINGS | jq --raw-output 'select(.key=="bot_user_id") | .value'`
SLACK_PROD_CLIENT_ID=`echo $SLACK_PROD_BINDINGS | jq --raw-output 'select(.key=="client_id") | .value'`
SLACK_PROD_CLIENT_SECRET=`echo $SLACK_PROD_BINDINGS | jq --raw-output 'select(.key=="client_secret") | .value'`
SLACK_PROD_REDIRECT_URI=`echo $SLACK_PROD_BINDINGS | jq --raw-output 'select(.key=="redirect_uri") | .value'`
SLACK_PROD_STARTER_CODE_ACTION_NAME=`echo $SLACK_PROD_BINDINGS | jq --raw-output 'select(.key=="starter_code_action_name") | .value'`
SLACK_PROD_VERIFICATION_TOKEN=`echo $SLACK_PROD_BINDINGS | jq --raw-output 'select(.key=="verification_token") | .value'`
SLACK_PROD_OW_API_HOST=`echo $SLACK_PROD_BINDINGS | jq --raw-output 'select(.key=="ow_api_host") | .value'`
SLACK_PROD_OW_API_KEY=`echo $SLACK_PROD_BINDINGS | jq --raw-output 'select(.key=="ow_api_key") | .value'`

STARTERCODE_PROD_BINDINGS=`wsk package get starter-code | grep -v 'got package' | jq '.parameters[]'`
STARTERCODE_PROD_OW_API_HOST=`echo $STARTERCODE_PROD_BINDINGS | jq --raw-output 'select(.key=="ow_api_host") | .value'`
STARTERCODE_PROD_OW_API_KEY=`echo $STARTERCODE_PROD_BINDINGS | jq --raw-output 'select(.key=="ow_api_key") | .value'`

CONVERSATION_PROD_BINDINGS=`wsk package get conversation | grep -v 'got package' | jq '.parameters[]'`
CONVERSATION_PROD_USERNAME=`echo $CONVERSATION_PROD_BINDINGS | jq --raw-output 'select(.key=="username") | .value'`
CONVERSATION_PROD_PASSWORD=`echo $CONVERSATION_PROD_BINDINGS | jq --raw-output 'select(.key=="password") | .value'`
CONVERSATION_PROD_WORKSPACEID=`echo $CONVERSATION_PROD_BINDINGS | jq --raw-output 'select(.key=="workspace_id") | .value'`

# Grab test credential parameters
SLACK_TEST_ACCESS_TOKEN=`cat $SLACK_PARAM_FILE | jq --raw-output '.slack.access_token'`
SLACK_TEST_BOT_ACCESS_TOKEN=`cat $SLACK_PARAM_FILE | jq --raw-output '.slack.bot_access_token'`
SLACK_TEST_STARTER_CODE_ACTION_NAME=`cat $SLACK_PARAM_FILE | jq --raw-output '.slack.starter_code_action_name'`
SLACK_TEST_REDIRECT_URI=`cat $SLACK_PARAM_FILE | jq --raw-output '.slack.redirect_uri'`
SLACK_TEST_BOT_USER_ID=`cat $SLACK_PARAM_FILE | jq --raw-output '.slack.bot_user_id'`
SLACK_TEST_CLIENT_ID=`cat $SLACK_PARAM_FILE | jq --raw-output '.slack.client_id'`
SLACK_TEST_CLIENT_SECRET=`cat $SLACK_PARAM_FILE | jq --raw-output '.slack.client_secret'`
SLACK_TEST_VERIFICATION_TOKEN=`cat $SLACK_PARAM_FILE | jq --raw-output '.slack.verification_token'`

OPENWHISK_TEST_API_HOST=`cat $OPENWHISK_PARAM_FILE | jq --raw-output '.openwhisk.apihost'`
OPENWHISK_TEST_API_KEY=`cat $OPENWHISK_PARAM_FILE | jq --raw-output '.openwhisk.api_key'`
OPENWHISK_TEST_NAMESPACE=`cat $OPENWHISK_PARAM_FILE | jq --raw-output '.openwhisk.namespace'`

CONVERSATION_TEST_USERNAME=`cat $CONVERSATION_PARAM_FILE | jq --raw-output '.conversation.username'`
CONVERSATION_TEST_PASSWORD=`cat $CONVERSATION_PARAM_FILE | jq --raw-output '.conversation.password'`
CONVERSATION_TEST_WORKSPACEID=`cat $CONVERSATION_PARAM_FILE | jq --raw-output '.conversation.workspace_id'`

# Change OpenWhisk client credentials to use test space credentials
${WSK} property set --apihost ${OPENWHISK_TEST_API_HOST} --auth ${OPENWHISK_TEST_API_KEY} | grep -v 'ok'

# Update each package to bind test credentials parameters
${WSK} package update slack \
  -p access_token "$SLACK_TEST_ACCESS_TOKEN" \
  -p bot_access_token "$SLACK_TEST_BOT_ACCESS_TOKEN" \
  -p redirect_uri "$SLACK_TEST_REDIRECT_URI" \
  -p bot_user_id "$SLACK_TEST_BOT_USER_ID" \
  -p client_id "a$SLACK_TEST_CLIENT_ID" \
  -p client_secret "$SLACK_TEST_CLIENT_SECRET" \
  -p verification_token "$SLACK_TEST_VERIFICATION_TOKEN" \
  -p ow_api_host "$OPENWHISK_TEST_API_HOST" \
  -p ow_api_key "$OPENWHISK_TEST_API_KEY" \
  | grep -v 'updated package'

${WSK} package update starter-code \
  -p ow_api_host "$OPENWHISK_TEST_API_HOST" \
  -p ow_api_key "$OPENWHISK_TEST_API_KEY" \
  | grep -v 'updated package'

${WSK} package update conversation \
  -p username "$CONVERSATION_TEST_USERNAME" \
  -p password "$CONVERSATION_TEST_PASSWORD" \
  -p workspace_id "$CONVERSATION_TEST_WORKSPACEID" \
  | grep -v 'updated package'

# Update all actions specified by tests
${WSK} action update slack/receive ./channels/slack/receive/index.js | grep -v 'ok'
${WSK} action update slack/post ./channels/slack/post/index.js | grep -v 'ok'
${WSK} action update slack/deploy ./channels/slack/deploy/index.js | grep -v 'ok'

${WSK} action update starter-code/pre-conversation ./starter-code/pre-conversation.js | grep -v 'ok'
${WSK} action update starter-code/post-conversation ./starter-code/post-conversation.js | grep -v 'ok'
${WSK} action update starter-code/normalize-slack-for-conversation ./starter-code/normalize-for-conversation/normalize-slack-for-conversation.js | grep -v 'ok'
${WSK} action update starter-code/normalize-conversation-for-slack ./starter-code/normalize-for-channel/normalize-conversation-for-slack.js | grep -v 'ok'

${WSK} action update conversation/call-conversation ./conversation/call-conversation.js | grep -v 'ok'

${WSK} action update ${TEST_PIPELINE} --sequence slack/receive,starter-code/pre-conversation,starter-code/normalize-slack-for-conversation,conversation/call-conversation,starter-code/post-conversation,starter-code/normalize-conversation-for-slack,slack/post -a web-export true | grep -v 'ok'

# Run setup scripts needed to build "mock" actions for integration tests
SETUP_SCRIPT='./test/integration/conversation/setup.sh'
if [ -f $SETUP_SCRIPT ]; then
  bash $SETUP_SCRIPT
fi
SETUP_SCRIPT='./test/integration/starter-code/setup.sh'
if [ -f $SETUP_SCRIPT ]; then
  bash $SETUP_SCRIPT
fi
for folder in './test/integration/channels'/*; do
  if [ -d $folder ]; then
    SETUP_SCRIPT="$folder/setup.sh"
    if [ -f $SETUP_SCRIPT ]; then
      bash $SETUP_SCRIPT
    fi
  fi
done

# Test script
if [ "$1" == "test" ]; then
  mocha test --recursive
elif [ "$1" == "coverage" ]; then
  istanbul cover ./node_modules/mocha/bin/_mocha -- --recursive -R spec
elif [ "$1" ]; then
  mocha $1
fi
RETCODE=$?

# Run breakdown scripts that deletes the "mock" actions for integration tests
BREAKDOWN_SCRIPT='./test/integration/conversation/breakdown.sh'
if [ -f $BREAKDOWN_SCRIPT ]; then
  bash $BREAKDOWN_SCRIPT
fi
BREAKDOWN_SCRIPT='./test/integration/starter-code/breakdown.sh'
if [ -f $BREAKDOWN_SCRIPT ]; then
  bash $BREAKDOWN_SCRIPT
fi
for folder in './test/integration/channels'/*; do
  if [ -d $folder ]; then
    BREAKDOWN_SCRIPT="$folder/breakdown.sh"
    if [ -f $BREAKDOWN_SCRIPT ]; then
      bash $BREAKDOWN_SCRIPT
    fi
  fi
done

# Delete pipeline used in test
${WSK} action delete ${TEST_PIPELINE} | grep -v 'ok'

# Revert to prod OpenWhisk space
${WSK} property set --apihost ${WSK_PROD_HOST} --auth ${WSK_PROD_KEY} | grep -v 'ok'

# Revert to prod credentials bindings
${WSK} package update slack \
  -p access_token "$SLACK_PROD_ACCESS_TOKEN" \
  -p bot_access_token "$SLACK_PROD_BOT_ACCESS_TOKEN" \
  -p redirect_uri "$SLACK_PROD_REDIRECT_URI" \
  -p bot_user_id "$SLACK_PROD_BOT_USER_ID" \
  -p client_id "$SLACK_PROD_CLIENT_ID" \
  -p client_secret "$SLACK_PROD_CLIENT_SECRET" \
  -p verification_token "$SLACK_PROD_VERIFICATION_TOKEN" \
  -p ow_api_host "$SLACK_PROD_OW_API_HOST" \
  -p ow_api_key "$SLACK_PROD_OW_API_KEY" \
  | grep -v 'updated package'

${WSK} package update starter-code \
  -p ow_api_host "$STARTERCODE_PROD_OW_API_HOST" \
  -p ow_api_key "$STARTERCODE_PROD_OW_API_KEY" \
  | grep -v 'updated package'

${WSK} package update conversation \
  -p username "$CONVERSATION_PROD_USERNAME" \
  -p password "$CONVERSATION_PROD_PASSWORD" \
  -p workspace_id "$CONVERSATION_PROD_WORKSPACEID" \
  | grep -v 'updated package'

exit $RETCODE
