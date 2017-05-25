const openwhisk = require('openwhisk');

/**
 * Takes as input the JSON from a channel, slack only initially, and sends it to Conversation and
 * then returns the response to the user. This action will normalize the input, basically copying
 * the user's message from the channel specific area to input.text where Conversation can locate it.
 *
 * @param params - raw JSON slack sends to registered endpoints
 * @returns {*}
 */
function main(params) {
  const openwhiskApiHost = params.ow_api_host;
  const openwhiskApiKey = params.ow_api_key;
  if (!openwhiskApiHost || !openwhiskApiKey) {
    return Promise.reject('No openwhisk credentials provided.');
  }
  const ow = openwhisk({
    apihost: openwhiskApiHost,
    api_key: openwhiskApiKey
  });

  // Normalize parameters (copy user utterance to input.text so Conversation can find it)
  let normalizedParams = {};

  try {
    normalizedParams = normalizeParams(params);
  } catch (e) {
    return Promise.reject(e.message);
  }

  // Form the payload that will control how the Conversation service responds
  normalizedParams = formConversationPayload(normalizedParams);

  // Calls Conversation and then calls the channel package's post with the user's response
  return new Promise((resolve, reject) => {
    return callConversation(ow, normalizedParams)
      .then(convoResponse => {
        return postResponseToUser(ow, convoResponse, normalizedParams);
      })
      .then(postResponse => {
        resolve(postResponse);
      })
      .catch(error => {
        reject(error);
      });
  });
}

/**
 * Uses the Conversation JSON object contained in normalizedParams to call the
 * conversation/call-conversation action.
 *
 * @param ow - instantiated copy of the openwhisk npm module
 * @param normalizedParams - JSON object with slack + pieces normalized for call to Conversation
 * @returns {*}
 */
function callConversation(ow, normalizedParams) {
  const convoAction = 'conversation/call-conversation';

  return new Promise((resolve, reject) => {
    ow.actions
      .invoke({
        name: convoAction,
        blocking: true,
        result: true,
        params: normalizedParams
      })
      .then(
        success => {
          safeExtractResponseMessage(success, resolve, reject);
        },
        error => {
          reject(error);
        }
      );
  });
}

/**
 * Takes the normalized parameters and adds a Conversation JSON Object to it. Any fields available
 * in the Conversation message API can be added to this object to control the call to Conversation.
 *
 * @param normalizedParams - slack JSON object plus input.text field
 * @returns {*}
 */
function formConversationPayload(normalizedParams) {
  const conversationPayload = JSON.parse(JSON.stringify(normalizedParams));

  conversationPayload.conversation = {
    input: normalizedParams.input,
    context: normalizedParams.context
  };
  return conversationPayload;
}

/**
 * This function detects, from looking at the params.provider field, what channel is calling the
 * starter code.  It then copies the user's utterance from the channel specific area to input.text
 * where Conversation can find it.
 *
 * @param params - raw JSON from channel + provider field indicating what channel the JSON came from
 * @returns {*}
 */
function normalizeParams(params) {
  let normalizedParams = {};

  if (params.provider === 'slack') {
    normalizedParams = normalizeSlack(params);
  } else {
    throw new Error('non-supported channel');
  }

  return normalizedParams;
}

/**
 * Detects the user input in the slack JSON and copies it to input.text where Conversation expects
 * it to be.
 *
 * @param params - raw JSON from channel + provider field indicating what channel the JSON came from
 * @returns {*}
 */
function normalizeSlack(params) {
  if (!params.slack || !params.slack.event || !params.slack.event.text) {
    throw new Error(
      'Unable to find message from user to send to Conversation.'
    );
  }

  if (typeof params.slack.event.text !== 'string') {
    throw new Error('Currently only text messages are supported.');
  }

  // copy the user's query to input.text where Conversation expects it
  const normalizedJson = JSON.parse(JSON.stringify(params));
  normalizedJson.input = { text: params.slack.event.text };

  return normalizedJson;
}

/**
 * Takes the response from the Conversation service and uses the appropriate channel package's post
 * action to reply to the user
 *
 * @param ow - instantiated openwhisk npm module
 * @param convoResponse - response from the Conversation package's call-conversation action
 * @param normalizedParams
 * @returns {*}
 */
function postResponseToUser(ow, convoResponse, normalizedParams) {
  if (normalizedParams.provider === 'slack') {
    return postResponseToSlack(ow, convoResponse, normalizedParams);
  }

  return Promise.reject('non-supported channel');
}

/**
 * Send's the Conversation response to the user in slack
 *
 * @param ow
 * @param convoResponse
 * @param normalizedParams
 * @returns {*}
 */
function postResponseToSlack(ow, convoResponse, normalizedParams) {
  try {
    validateResponseFromConversation(convoResponse);
  } catch (e) {
    return Promise.reject(e.message);
  }

  const slackPost = 'slack/post';

  const postParams = {
    channel: normalizedParams.slack.event.channel,
    text: convoResponse.output.text[0]
  };

  return new Promise((resolve, reject) => {
    ow.actions
      .invoke({
        name: slackPost,
        blocking: true,
        result: true,
        params: postParams
      })
      .then(
        success => {
          safeExtractResponseMessage(success, resolve, reject);
        },
        error => {
          reject(error);
        }
      );
  });
}

/**
 * Validates that the response from Conversation contains the expected fields and format (basically
 * checks that a response to the user's query exists)
 *
 * @param convoResponse - response from the Conversation package's call-conversation action
 */
function validateResponseFromConversation(convoResponse) {
  if (
    !convoResponse ||
    !convoResponse.output ||
    !convoResponse.output.text ||
    !convoResponse.output.text[0]
  ) {
    throw new Error(
      'Conversation call succeeded but a response to the user was not provided'
    );
  }

  if (typeof convoResponse.output.text[0] !== 'string') {
    throw new Error(
      'Conversation response provided but is not of expected type'
    );
  }
}

/**
 * Safety extracts the OpenWhisk message from the OpenWhisk metadata,
 *   and returns resolved or rejected message.
 *
 * @param  {JSON} params - parameters of OpenWhisk response
 * @param  {method} resolve - promise resolve method
 * @param  {method} reject - promise reject method
 * @return {promise} - promise resolve or reject of the OpenWhisk result
 */
function safeExtractResponseMessage(params, resolve, reject) {
  if (params.response) {
    if (params.response.result) {
      return resolve(params.response.result);
    }
    if (params.response.error) {
      return reject(params.response.error);
    }
  }
  return resolve(params);
}

module.exports = {
  main,
  formConversationPayload,
  normalizeParams,
  normalizeSlack,
  postResponseToUser,
  validateResponseFromConversation
};
