#!/usr/bin/env bash

export WSK=${WSK-wsk}

${WSK} package update starter-code

${WSK} action update starter-code/normalize normalize.js