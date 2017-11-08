#!/usr/bin/env bash

export WSK=${WSK-wsk}

DEPLOY_NAME=$1

${WSK} action delete $1-endtoend-slack-nocontext > /dev/null
${WSK} action delete $1-endtoend-slack-nocontext_slack/receive > /dev/null
${WSK} action delete $1-endtoend-slack-nocontext_slack/post > /dev/null
${WSK} action delete $1-endtoend-slack-nocontext_conversation/call-conversation > /dev/null
${WSK} action delete $1-endtoend-slack-nocontext_starter-code/pre-conversation > /dev/null
${WSK} action delete $1-endtoend-slack-nocontext_starter-code/post-conversation > /dev/null
${WSK} action delete $1-endtoend-slack-nocontext_starter-code/pre-normalize > /dev/null
${WSK} action delete $1-endtoend-slack-nocontext_starter-code/post-normalize > /dev/null
${WSK} action delete $1-endtoend-slack-nocontext_starter-code/normalize-slack-for-conversation > /dev/null
${WSK} action delete $1-endtoend-slack-nocontext_starter-code/normalize-conversation-for-slack > /dev/null
${WSK} package delete $1-endtoend-slack-nocontext_slack > /dev/null
${WSK} package delete $1-endtoend-slack-nocontext_conversation > /dev/null
${WSK} package delete $1-endtoend-slack-nocontext_starter-code > /dev/null

${WSK} action delete $1-endtoend-slack-withcontext > /dev/null
${WSK} action delete $1-endtoend-slack-withcontext_slack/receive > /dev/null
${WSK} action delete $1-endtoend-slack-withcontext_slack/post > /dev/null
${WSK} action delete $1-endtoend-slack-withcontext_conversation/call-conversation > /dev/null
${WSK} action delete $1-endtoend-slack-withcontext_context/load-context > /dev/null
${WSK} action delete $1-endtoend-slack-withcontext_context/save-context > /dev/null
${WSK} action delete $1-endtoend-slack-withcontext_starter-code/pre-conversation > /dev/null
${WSK} action delete $1-endtoend-slack-withcontext_starter-code/post-conversation > /dev/null
${WSK} action delete $1-endtoend-slack-withcontext_starter-code/pre-normalize > /dev/null
${WSK} action delete $1-endtoend-slack-withcontext_starter-code/post-normalize > /dev/null
${WSK} action delete $1-endtoend-slack-withcontext_starter-code/normalize-slack-for-conversation > /dev/null
${WSK} action delete $1-endtoend-slack-withcontext_starter-code/normalize-conversation-for-slack > /dev/null
${WSK} package delete $1-endtoend-slack-withcontext_slack > /dev/null
${WSK} package delete $1-endtoend-slack-withcontext_conversation > /dev/null
${WSK} package delete $1-endtoend-slack-withcontext_context > /dev/null
${WSK} package delete $1-endtoend-slack-withcontext_starter-code > /dev/null

curl -s -XDELETE ${__TEST_CLOUDANT_URL}/contextdb > /dev/null
curl -s -XDELETE ${__TEST_CLOUDANT_URL}/authdb > /dev/null
curl -s -XPUT ${__TEST_CLOUDANT_URL}/contextdb > /dev/null
curl -s -XPUT ${__TEST_CLOUDANT_URL}/authdb > /dev/null


${WSK} action delete test-pipeline-facebook | grep -v 'ok'
${WSK} action delete test-pipeline-context-facebook | grep -v 'ok'

${WSK} property set --apihost ${__OW_API_HOST} --auth ${__TEST_DEPLOYUSER_WSK_API_KEY} --namespace ${__TEST_DEPLOYUSER_WSK_NAMESPACE} > /dev/null

# Clean all artifacts created in the user-deploy namespace
IFS=$'\n'
while [ $(${WSK} action list | tail -n +2 | wc -l | awk '{print $1}') -gt 0 ]; do
  for line in `${WSK} action list | tail -n +2`; do
    actionName=${line%% *}
    execution=${line##* }
    ${WSK} action delete $actionName > /dev/null
  done
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

for line in `${WSK} package list | tail -n +2`; do
  packageName=${line%% *}
  execution=${line##* }
  ${WSK} package delete $packageName > /dev/null
done
IFS=$' \t\n'

${WSK} property set --apihost ${__OW_API_HOST} --auth ${__OW_API_KEY} --namespace ${__OW_NAMESPACE} > /dev/null
