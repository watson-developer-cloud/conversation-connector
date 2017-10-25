#!/usr/bin/env bash
export WSK=${WSK-wsk}

# Cleans all deploy artifacts in the user's namespace corresponding to the pipeline name passed as argument.
# Cloud Functions artifacts are named like: ${pipeline_name}_slack, ${pipeline_name}_context, and so on ...

PIPNAME=$1

WSK_API_HOST=`wsk property get --apihost | tr "\t" "\n" | tail -n 1`
WSK_API_KEY=`wsk property get --auth | tr "\t" "\n" | tail -n 1`
WSK_NAMESPACE=`wsk namespace list | tail -n +2 | head -n 1`

${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_slack/deploy" > /dev/null
${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_slack/receive" > /dev/null
${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_slack/post" > /dev/null

${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_facebook/receive" > /dev/null
${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_facebook/post" > /dev/null
${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_facebook/batched_messages" > /dev/null

${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/pre-conversation" > /dev/null
${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/post-conversation" > /dev/null
${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/pre-normalize" > /dev/null
${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/post-normalize" > /dev/null
${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/normalize-slack-for-conversation" > /dev/null
${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/normalize-facebook-for-conversation" > /dev/null
${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/normalize-conversation-for-slack" > /dev/null
${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/normalize-conversation-for-facebook" > /dev/null

${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_context/load-context" > /dev/null
${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_context/save-context" > /dev/null

${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_conversation/call-conversation" > /dev/null

${WSK} package delete "/${WSK_NAMESPACE}/${PIPNAME}_facebook" > /dev/null
${WSK} package delete "/${WSK_NAMESPACE}/${PIPNAME}_slack" > /dev/null
${WSK} package delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code" > /dev/null
${WSK} package delete "/${WSK_NAMESPACE}/${PIPNAME}_context" > /dev/null
${WSK} package delete "/${WSK_NAMESPACE}/${PIPNAME}_conversation" > /dev/null
