#!/usr/bin/env bash

bx wsk action update create-cloudant-lite-instance create-cloudant-lite-instance.js > /dev/null
bx wsk action update create-cloudant-database create-cloudant-database.js > /dev/null
bx wsk action update update-auth-document update-auth-document.js > /dev/null
bx wsk action update check-deploy-exists check-deploy-exists.js -a web-export true > /dev/null
bx wsk action update populate-actions populate-actions.js -a web-export true > /dev/null
bx wsk action update verify-slack channels/slack/verify-slack.js -a web-export true > /dev/null
