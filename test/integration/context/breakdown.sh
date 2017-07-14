#!/usr/bin/env bash

export WSK=${WSK-wsk}

${WSK} action delete context/integration-pipeline | grep -v 'ok'
${WSK} action delete context/middle-for-context | grep -v 'ok'
