#!/usr/bin/env bash

export WSK=${WSK-wsk}

${WSK} action delete facebook/middle | grep -v 'ok'
${WSK} action delete facebook/integration-pipeline | grep -v 'ok'
