#!/usr/bin/env bash

PIPELINE_NAME=$1

bx wsk package update ${PIPELINE_NAME}starter-code &> /dev/null

for file in `find . -type f -name '*.js'`; do
  file_basename=`basename ${file}`
  file_basename=${file_basename%.*}
  bx wsk action update ${PIPELINE_NAME}starter-code/${file_basename}  ${file} &> /dev/null
done
