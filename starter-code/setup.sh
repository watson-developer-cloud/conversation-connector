#!/usr/bin/env bash

export WSK=${WSK-wsk}

BINDINGS=$1

${WSK} package update starter-code

for file in `find . -type f -name '*.js'`; do
  file_basename=`basename ${file}`
  file_basename=${file_basename%.*}
  ${WSK} action update starter-code/${file_basename}  ${file}
done
