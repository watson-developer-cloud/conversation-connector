#!/usr/bin/env bash

WSK=${WSK-wsk}

${WSK} action update facebook/middle ./test/integration/channels/facebook/middle.js | grep -v 'ok'

${WSK} action update facebook/integration-pipeline --sequence facebook/middle,facebook/post | grep -v 'ok'