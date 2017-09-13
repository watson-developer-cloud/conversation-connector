#!/usr/bin/env bash

export WSK=${WSK-wsk}

${WSK} action update facebook/receive ./receive/index.js -a web-export true
${WSK} action update facebook/post ./post/index.js


