#!/usr/bin/env bash

export WSK=${WSK-wsk}

PIPELINE_NAME="$1"

${WSK} action update --sequence test-pipeline-slack "${PIPELINE_NAME}_slack/receive","${PIPELINE_NAME}_starter-code/pre-normalize","${PIPELINE_NAME}_starter-code/normalize-slack-for-conversation","${PIPELINE_NAME}_starter-code/pre-conversation","${PIPELINE_NAME}_conversation/call-conversation","${PIPELINE_NAME}_starter-code/post-conversation","${PIPELINE_NAME}_starter-code/normalize-conversation-for-slack","${PIPELINE_NAME}_starter-code/post-normalize","${PIPELINE_NAME}_slack/post" -a web-export true | grep -v 'ok'
${WSK} action update --sequence test-pipeline-context-slack "${PIPELINE_NAME}_slack/receive","${PIPELINE_NAME}_starter-code/pre-normalize","${PIPELINE_NAME}_starter-code/normalize-slack-for-conversation","${PIPELINE_NAME}_context/load-context","${PIPELINE_NAME}_starter-code/pre-conversation","${PIPELINE_NAME}_conversation/call-conversation","${PIPELINE_NAME}_starter-code/post-conversation","${PIPELINE_NAME}_context/save-context","${PIPELINE_NAME}_starter-code/normalize-conversation-for-slack","${PIPELINE_NAME}_starter-code/post-normalize","${PIPELINE_NAME}_slack/post" -a web-export true | grep -v 'ok'

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
\
IFS=$' \t\n'

${WSK} property set --apihost ${__OW_API_HOST} --auth ${__OW_API_KEY} --namespace ${__OW_NAMESPACE} > /dev/null
