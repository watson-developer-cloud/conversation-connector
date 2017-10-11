#!/usr/bin/env bash

export WSK=${WSK-wsk}

# Pipeline name
# eg: my-flex-pipeline_
PIPELINE_NAME=$1

PACKAGE_NAME="${PIPELINE_NAME}context"

${WSK} package update ${PIPELINE_NAME}context &> /dev/null

${WSK} action update ${PIPELINE_NAME}context/load-context load-context.js &> /dev/null
${WSK} action update ${PIPELINE_NAME}context/save-context save-context.js &> /dev/null
