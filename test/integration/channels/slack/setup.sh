#!/usr/bin/env bash

WSK=${WSK-wsk}

${WSK} action update slack/middle middle.js -a web-export true \
  -p endpoint "https://foropenwhisk-prod.mybluemix.net/slack/post.json"
