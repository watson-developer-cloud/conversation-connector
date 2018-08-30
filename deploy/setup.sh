#!/usr/bin/env bash

bx wsk action update create-cloudant-lite-instance create-cloudant-lite-instance.js
bx wsk action update create-cloudant-database create-cloudant-database.js
bx wsk action update update-auth-document update-auth-document.js
bx wsk action update check-deploy-exists check-deploy-exists.js -a web-export true
bx wsk action update populate-actions populate-actions.js -a web-export true
bx wsk action update verify-slack channels/slack/verify-slack.js -a web-export true
