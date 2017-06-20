const ConversationV1 = require('watson-developer-cloud/conversation/v1');

/**
 *
 * This action takes a user query and runs it against the Conversation service specified in the
 * package bindings.
 *
 * @param Whisk actions accept a single parameter,
 *        which must be a JSON object.
 *
 * At minimum, the params variable must contain:
 {
   "conversation":{
      "input":{
         "text":"How is the weather?"
      }
   }
}
 * It should be noted that the full Conversation message API can be specified in the Conversation
 * object. username, password, and workspace_id will be picked up via the package bindings and be
 * available at the root of the params object.
 *
 * @return which must be a JSON object.
 *         It will be the output of this action.
 *
 */
function main(params) {
  try {
    validateParams(params);
  } catch (e) {
    return Promise.reject(e.message);
  }

  const conversation = new ConversationV1({
    username: params.username,
    password: params.password,
    version: 'v1',
    version_date: '2017-04-21'
  });

  return new Promise((resolve, reject) => {
    const payload = params.conversation;
    if (!payload.workspace_id) {
      payload.workspace_id = params.workspace_id;
    }
    conversation.message(payload, (err, response) => {
      if (err) {
        reject(err);
      } else {
        const conversationOutput = {
          conversation: response,
          raw_input_data: params.raw_input_data
        };
        conversationOutput.raw_input_data.conversation = params.conversation;
        resolve(conversationOutput);
      }
    });
  });
}

/**
 * Verify the params required to call conversation exist and are in the appropriate format
 * @param params
 */
function validateParams(params) {
  // Check if we have a message in the proper format from the user
  if (
    !params.conversation ||
    !params.conversation.input ||
    !params.conversation.input.text
  ) {
    throw new Error('No message supplied to send to the Conversation service.');
  }
  // validate credentials for accessing the service instance exist and are in the expected format
  // Conversation object not supplied, attempt to read from package bindings
  if (!params.username || !params.password || !params.workspace_id) {
    throw new Error(
      'Illegal Argument Exception: parameters to call Conversation are not supplied or are not' +
        ' bound to package.'
    );
  }
  // Required: channel raw input data
  if (
    !params.raw_input_data ||
    !params.raw_input_data.provider ||
    !params.raw_input_data[params.raw_input_data.provider]
  ) {
    throw new Error('No channel raw input data found.');
  }
}

module.exports = main;
