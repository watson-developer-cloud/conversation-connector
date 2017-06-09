#!/usr/bin/env bash

export WSK=${WSK-wsk}

${WSK} action delete slack/middle | grep -v 'ok'
${WSK} action delete slack/integration-pipeline | grep -v 'ok'
