#!/usr/bin/env bash

export WSK=${WSK-wsk}

${WSK} action update create-cloudant-lite-instance create-cloudant-lite-instance.js > /dev/null
${WSK} action update create-cloudant-database create-cloudant-database.js > /dev/null
${WSK} action update update-auth-document update-auth-document.js > /dev/null
${WSK} action update check-deploy-exists check-deploy-exists.js -a web-export true > /dev/null
${WSK} action update populate-actions populate-actions.js -a web-export true > /dev/null
${WSK} action update verify-slack channels/slack/verify-slack.js -a web-export true > /dev/null
