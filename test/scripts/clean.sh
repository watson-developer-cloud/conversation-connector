#!/usr/bin/env bash
export WSK=${WSK-wsk}

# Cleans all deploy artifacts in the user's namespace corresponding to the pipeline name passed as argument.
# OW artifacts are named like: ${pipeline_name}_slack, ${pipeline_name}_context, and so on ...

PIPNAME=$1

WSK_API_HOST=`wsk property get --apihost | tr "\t" "\n" | tail -n 1`
WSK_API_KEY=`wsk property get --auth | tr "\t" "\n" | tail -n 1`
WSK_NAMESPACE=`wsk namespace list | tail -n +2 | head -n 1`

${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_slack/deploy"
${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_slack/receive"
${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_slack/post"

${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_facebook/receive"
${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_facebook/post"
${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_facebook/batched_messages"

${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/pre-conversation"
${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/post-conversation"
${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/normalize-slack-for-conversation"
${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/normalize-facebook-for-conversation"
${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/normalize-conversation-for-slack"
${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code/normalize-conversation-for-facebook"

${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_context/load-context"
${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_context/save-context"

${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}_conversation/call-conversation"

${WSK} package delete "/${WSK_NAMESPACE}/${PIPNAME}_facebook"
${WSK} package delete "/${WSK_NAMESPACE}/${PIPNAME}_slack"
${WSK} package delete "/${WSK_NAMESPACE}/${PIPNAME}_starter-code"
${WSK} package delete "/${WSK_NAMESPACE}/${PIPNAME}_context"
${WSK} package delete "/${WSK_NAMESPACE}/${PIPNAME}_conversation"

if [ $PIPNAME != "testflex" ]; then
	# Delete pipeline sequence action
	${WSK} action delete "/${WSK_NAMESPACE}/${PIPNAME}"
fi

${WSK} action delete "/${WSK_NAMESPACE}/init-auth"