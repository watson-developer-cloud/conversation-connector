#!/usr/bin/env bash

# Cleans all deploy artifacts in the user's namespace corresponding to the pipeline name passed as argument.
# Cloud Functions artifacts are named like: ${pipeline_name}_slack, ${pipeline_name}_context, and so on ...

PIPNAME=$1

WSK_API_HOST=`bx wsk property get --apihost | tr "\t" "\n" | tail -n 1`
WSK_API_KEY=`bx wsk property get --auth | tr "\t" "\n" | tail -n 1`
WSK_NAMESPACE=`bx wsk namespace list | tail -n +2 | head -n 1`

bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_slack/deploy"
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_slack/receive"
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_slack/post"

bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_facebook/receive"
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_facebook/post"
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_facebook/batched_messages"
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_facebook/multiple_post"

bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/pre-conversation"
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/post-conversation"
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/pre-normalize"
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/post-normalize"
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/normalize-slack-for-conversation"
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/normalize-facebook-for-conversation"
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/normalize-conversation-for-slack"
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/normalize-conversation-for-facebook"

bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_context/load-context"
bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_context/save-context"

bx wsk action delete "/${WSK_NAMESPACE}/${PIPNAME}_conversation/call-conversation"

bx wsk package delete "/${WSK_NAMESPACE}/${PIPNAME}_facebook"
bx wsk package delete "/${WSK_NAMESPACE}/${PIPNAME}_slack"
bx wsk package delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code"
bx wsk package delete "/${WSK_NAMESPACE}/${PIPNAME}_context"
bx wsk package delete "/${WSK_NAMESPACE}/${PIPNAME}_conversation"
