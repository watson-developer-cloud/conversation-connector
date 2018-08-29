#!/usr/bin/env bash

bx wsk property set --apihost ${__OW_API_HOST} --auth ${__TEST_DEPLOYUSER_WSK_API_KEY} --namespace ${__TEST_DEPLOYUSER_WSK_NAMESPACE}

# Clean the user-deploy namespace to ensure the deploy integration tests are performed
#   with the user starting with no artifacts
IFS=$'\n'
while [ $(bx wsk action list | tail -n +2 | wc -l | awk '{print $1}') -gt 0 ]; do
  for line in `bx wsk action list | tail -n +2`; do
    actionName=${line%% *}
    execution=${line##* }
    bx wsk action delete $actionName
  done
done

for line in `bx wsk package list | tail -n +2`; do
  packageName=${line%% *}
  execution=${line##* }
  bx wsk package delete $packageName
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
IFS=$' \t\n'

bx wsk property set --apihost ${__OW_API_HOST} --auth ${__OW_API_KEY} --namespace ${__OW_NAMESPACE}
