#!/usr/bin/env bash

DEPLOY_NAME=$1

bx wsk action delete $1-endtoend-slack-nocontext
bx wsk action delete $1-endtoend-slack-nocontext_postsequence
bx wsk action delete $1-endtoend-slack-nocontext_slack/receive
bx wsk action delete $1-endtoend-slack-nocontext_slack/post
bx wsk action delete $1-endtoend-slack-nocontext_slack/multiple_post
bx wsk action delete $1-endtoend-slack-nocontext_conversation/call-conversation
bx wsk action delete $1-endtoend-slack-nocontext_starter-code/pre-conversation
bx wsk action delete $1-endtoend-slack-nocontext_starter-code/post-conversation
bx wsk action delete $1-endtoend-slack-nocontext_starter-code/pre-normalize
bx wsk action delete $1-endtoend-slack-nocontext_starter-code/post-normalize
bx wsk action delete $1-endtoend-slack-nocontext_starter-code/normalize-slack-for-conversation
bx wsk action delete $1-endtoend-slack-nocontext_starter-code/normalize-conversation-for-slack
bx wsk package delete $1-endtoend-slack-nocontext_slack
bx wsk package delete $1-endtoend-slack-nocontext_conversation
bx wsk package delete $1-endtoend-slack-nocontext_starter-code

bx wsk action delete $1-endtoend-slack-withcontext
bx wsk action delete $1-endtoend-slack-withcontext_postsequence
bx wsk action delete $1-endtoend-slack-withcontext_slack/receive
bx wsk action delete $1-endtoend-slack-withcontext_slack/post
bx wsk action delete $1-endtoend-slack-withcontext_slack/multiple_post
bx wsk action delete $1-endtoend-slack-withcontext_conversation/call-conversation
bx wsk action delete $1-endtoend-slack-withcontext_context/load-context
bx wsk action delete $1-endtoend-slack-withcontext_context/save-context
bx wsk action delete $1-endtoend-slack-withcontext_starter-code/pre-conversation
bx wsk action delete $1-endtoend-slack-withcontext_starter-code/post-conversation
bx wsk action delete $1-endtoend-slack-withcontext_starter-code/pre-normalize
bx wsk action delete $1-endtoend-slack-withcontext_starter-code/post-normalize
bx wsk action delete $1-endtoend-slack-withcontext_starter-code/normalize-slack-for-conversation
bx wsk action delete $1-endtoend-slack-withcontext_starter-code/normalize-conversation-for-slack
bx wsk package delete $1-endtoend-slack-withcontext_slack
bx wsk package delete $1-endtoend-slack-withcontext_conversation
bx wsk package delete $1-endtoend-slack-withcontext_context
bx wsk package delete $1-endtoend-slack-withcontext_starter-code

curl -s -XDELETE ${__TEST_CLOUDANT_URL}/contextdb
curl -s -XDELETE ${__TEST_CLOUDANT_URL}/authdb
curl -s -XPUT ${__TEST_CLOUDANT_URL}/contextdb
curl -s -XPUT ${__TEST_CLOUDANT_URL}/authdb


bx wsk action delete test-pipeline-facebook | grep -v 'ok'
bx wsk action delete test-pipeline-context-facebook | grep -v 'ok'

bx target -o ${__TEST_DEPLOYUSER_ORG} -s ${__TEST_DEPLOYUSER_SPACE}
bx wsk property set --apihost ${__OW_API_HOST} --auth ${__TEST_DEPLOYUSER_WSK_API_KEY} --namespace ${__TEST_DEPLOYUSER_WSK_NAMESPACE}

# Clean all artifacts created in the user-deploy namespace
IFS=$'\n'
while [ $(bx wsk action list | tail -n +2 | wc -l | awk '{print $1}') -gt 0 ]; do
  for line in `bx wsk action list | tail -n +2`; do
    actionName=${line%% *}
    execution=${line##* }
    bx wsk action delete $actionName
  done
done

for line in `bx wsk trigger list | tail -n +2`; do
  triggerName=${line%% *}
  execution=${line##* }
  bx wsk trigger delete $triggerName
done

for line in `bx wsk rule list | tail -n +2`; do
  ruleName=${line%% *}
  execution=${line##* }
  bx wsk rule delete $ruleName
done

for line in `bx wsk package list | tail -n +2`; do
  packageName=${line%% *}
  execution=${line##* }
  bx wsk package delete $packageName
done
IFS=$' \t\n'

bx target -o ${__TEST_BX_USER_ORG} -s ${__TEST_BX_USER_SPACE}
bx wsk property set --apihost ${__OW_API_HOST} --auth ${__OW_API_KEY} --namespace ${__OW_NAMESPACE}
