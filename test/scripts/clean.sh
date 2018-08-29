#!/usr/bin/env bash

# Cleans all deploy artifacts in the user's namespace corresponding to the pipeline name passed as argument.
# Cloud Functions artifacts are named like: ${pipeline_name}_slack, ${pipeline_name}_context, and so on ...

PIPNAME=$1

WSK_API_HOST=`bx wsk property get --apihost | tr "\t" "\n" | tail -n 1`
WSK_API_KEY=`bx wsk property get --auth | tr "\t" "\n" | tail -n 1`
WSK_NAMESPACE=`bx wsk namespace list | tail -n +2 | head -n 1`

bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_slack/deploy" > /dev/null
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_slack/receive" > /dev/null
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_slack/post" > /dev/null

bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_facebook/receive" > /dev/null
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_facebook/post" > /dev/null
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_facebook/batched_messages" > /dev/null
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_facebook/multiple_post" > /dev/null

bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/pre-conversation" > /dev/null
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/post-conversation" > /dev/null
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/pre-normalize" > /dev/null
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/post-normalize" > /dev/null
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/normalize-slack-for-conversation" > /dev/null
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/normalize-facebook-for-conversation" > /dev/null
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/normalize-conversation-for-slack" > /dev/null
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/normalize-conversation-for-facebook" > /dev/null

bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_context/load-context" > /dev/null
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_context/save-context" > /dev/null

bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_conversation/call-conversation" > /dev/null

bx wsk package delete "/${WSK_NAMESPACE}/${PIPNAME}_facebook" > /dev/null
bx wsk package delete "/${WSK_NAMESPACE}/${PIPNAME}_slack" > /dev/null
bx wsk package delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code" > /dev/null
bx wsk package delete "/${WSK_NAMESPACE}/${PIPNAME}_context" > /dev/null
bx wsk package delete "/${WSK_NAMESPACE}/${PIPNAME}_conversation" > /dev/null
