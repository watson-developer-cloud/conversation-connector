#!/usr/bin/env bash

export WSK=${WSK-wsk}

PIPELINE_NAME=$1
CLOUDANT_URL=$2
CLOUDANT_CONTEXT_DBNAME=$3

# create context database
if [ "${CLOUDANT_URL}" != "" ]; then
  for i in {1..10}; do
    e=`curl -s -XPUT "${CLOUDANT_URL}/${CLOUDANT_CONTEXT_DBNAME}" | jq -r .error`
    if [ "$e" != "null" ]; then
        if [ "$e" == "conflict" -o "$e" == "file_exists" ]; then
          break
        fi
        echo "create context database returned with error [$e], retrying..."
        sleep 5
      else
        break
      fi
  done
fi

${WSK} package update ${PIPELINE_NAME}context > /dev/null

${WSK} action update ${PIPELINE_NAME}context/load-context load-context.js > /dev/null
${WSK} action update ${PIPELINE_NAME}context/save-context save-context.js > /dev/null
