#!/usr/bin/env bash

WSK=${WSK-wsk}

${WSK} action update slack/middle ./test/integration/channels/slack/middle.js | grep -v 'ok'

${WSK} action update slack/integration-pipeline --sequence slack/receive,slack/middle,slack/post | grep -v 'ok'
