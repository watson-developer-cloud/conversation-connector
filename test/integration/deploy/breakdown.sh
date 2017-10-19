#!/usr/bin/env bash

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
