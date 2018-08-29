#!/usr/bin/env bash

PIPELINE_NAME=$1

bx wsk package update ${PIPELINE_NAME}starter-code

for file in `find . -type f -name '*.js'`; do
  file_basename=`basename ${file}`
  file_basename=${file_basename%.*}
  bx wsk action update ${PIPELINE_NAME}starter-code/${file_basename}  ${file}
done
