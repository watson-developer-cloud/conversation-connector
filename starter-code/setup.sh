#!/usr/bin/env bash

export WSK=${WSK-wsk}

PIPELINE_NAME=$1

${WSK} package update ${PIPELINE_NAME}starter-code &> /dev/null

for file in `find . -type f -name '*.js'`; do
  file_basename=`basename ${file}`
  file_basename=${file_basename%.*}
  ${WSK} action update ${PIPELINE_NAME}starter-code/${file_basename}  ${file} &> /dev/null
done
