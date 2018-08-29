#!/usr/bin/env bash

DEPLOY_NAME=$1

bx wsk action delete $1-endtoend-slack-nocontext > /dev/null
bx wsk action delete $1-endtoend-slack-nocontext_postsequence > /dev/null
bx wsk action delete $1-endtoend-slack-nocontext_slack/receive > /dev/null
bx wsk action delete $1-endtoend-slack-nocontext_slack/post > /dev/null
bx wsk action delete $1-endtoend-slack-nocontext_slack/multiple_post > /dev/null
bx wsk action delete $1-endtoend-slack-nocontext_conversation/call-conversation > /dev/null
bx wsk action delete $1-endtoend-slack-nocontext_starter-code/pre-conversation > /dev/null
bx wsk action delete $1-endtoend-slack-nocontext_starter-code/post-conversation > /dev/null
bx wsk action delete $1-endtoend-slack-nocontext_starter-code/pre-normalize > /dev/null
bx wsk action delete $1-endtoend-slack-nocontext_starter-code/post-normalize > /dev/null
bx wsk action delete $1-endtoend-slack-nocontext_starter-code/normalize-slack-for-conversation > /dev/null
bx wsk action delete $1-endtoend-slack-nocontext_starter-code/normalize-conversation-for-slack > /dev/null
bx wsk package delete $1-endtoend-slack-nocontext_slack > /dev/null
bx wsk package delete $1-endtoend-slack-nocontext_conversation > /dev/null
bx wsk package delete $1-endtoend-slack-nocontext_starter-code > /dev/null

bx wsk action delete $1-endtoend-slack-withcontext > /dev/null
bx wsk action delete $1-endtoend-slack-withcontext_postsequence > /dev/null
bx wsk action delete $1-endtoend-slack-withcontext_slack/receive > /dev/null
bx wsk action delete $1-endtoend-slack-withcontext_slack/post > /dev/null
bx wsk action delete $1-endtoend-slack-withcontext_slack/multiple_post > /dev/null
bx wsk action delete $1-endtoend-slack-withcontext_conversation/call-conversation > /dev/null
bx wsk action delete $1-endtoend-slack-withcontext_context/load-context > /dev/null
bx wsk action delete $1-endtoend-slack-withcontext_context/save-context > /dev/null
bx wsk action delete $1-endtoend-slack-withcontext_starter-code/pre-conversation > /dev/null
bx wsk action delete $1-endtoend-slack-withcontext_starter-code/post-conversation > /dev/null
bx wsk action delete $1-endtoend-slack-withcontext_starter-code/pre-normalize > /dev/null
bx wsk action delete $1-endtoend-slack-withcontext_starter-code/post-normalize > /dev/null
bx wsk action delete $1-endtoend-slack-withcontext_starter-code/normalize-slack-for-conversation > /dev/null
bx wsk action delete $1-endtoend-slack-withcontext_starter-code/normalize-conversation-for-slack > /dev/null
bx wsk package delete $1-endtoend-slack-withcontext_slack > /dev/null
bx wsk package delete $1-endtoend-slack-withcontext_conversation > /dev/null
bx wsk package delete $1-endtoend-slack-withcontext_context > /dev/null
bx wsk package delete $1-endtoend-slack-withcontext_starter-code > /dev/null

curl -s -XDELETE ${__TEST_CLOUDANT_URL}/contextdb > /dev/null
curl -s -XDELETE ${__TEST_CLOUDANT_URL}/authdb > /dev/null
curl -s -XPUT ${__TEST_CLOUDANT_URL}/contextdb > /dev/null
curl -s -XPUT ${__TEST_CLOUDANT_URL}/authdb > /dev/null


bx wsk action delete test-pipeline-facebook | grep -v 'ok'
bx wsk action delete test-pipeline-context-facebook | grep -v 'ok'

bx wsk property set --apihost ${__OW_API_HOST} --auth ${__TEST_DEPLOYUSER_WSK_API_KEY} --namespace ${__TEST_DEPLOYUSER_WSK_NAMESPACE} > /dev/null

# Clean all artifacts created in the user-deploy namespace
IFS=$'\n'
while [ $(bx wsk action list | tail -n +2 | wc -l | awk '{print $1}') -gt 0 ]; do
  for line in `bx wsk action list | tail -n +2`; do
    actionName=${line%% *}
    execution=${line##* }
    bx wsk action delete $actionName > /dev/null
  done
done

for line in `bx wsk trigger list | tail -n +2`; do
  triggerName=${line%% *}
  execution=${line##* }
  bx wsk trigger delete $triggerName > /dev/null
done

for line in `bx wsk rule list | tail -n +2`; do
  ruleName=${line%% *}
  execution=${line##* }
  bx wsk rule delete $ruleName > /dev/null
done

for line in `bx wsk package list | tail -n +2`; do
  packageName=${line%% *}
  execution=${line##* }
  bx wsk package delete $packageName > /dev/null
done
IFS=$' \t\n'

bx wsk property set --apihost ${__OW_API_HOST} --auth ${__OW_API_KEY} --namespace ${__OW_NAMESPACE} > /dev/null
