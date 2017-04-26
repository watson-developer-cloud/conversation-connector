const ConversationV1 = require('watson-developer-cloud/conversation/v1');

/**
 *
 * This action takes a user query and runs it against the conversation
 * service specified in the conversation object.
 * TODO I need to move the conversation pieces to the package binding once I create that
 *
 * @param Whisk actions accept a single parameter,
 *        which must be a JSON object.
 *
 * In this case, the params variable will look like:
 *    {
          'input': {
            'text': 'How is the weather?'
          },
          'conversation': {
              'username': '123',
              'password': 'abc',
              'workspace_id': 'xyz'
          }
      };
 *
 * @return which must be a JSON object.
 *         It will be the output of this action.
 *
 */
function main(params) {
  return callConversation(params);
}

/**
 * This essentially is the main method of the file. It exists so that tests can be written.
 * OpenWhisk complains if the main function is exported.
 *
 * @param params
 * @returns {*}
 */
function callConversation(params) {
  try {
    validateParams(params);
  } catch (e) {
    return Promise.reject(e);
  }

  const conversation = new ConversationV1({
    username: params.username || params.conversation.username,
    password: params.password || params.conversation.password,
    version: 'v1',
    version_date: '2017-04-21'
  });

  return new Promise((resolve, reject) => {
    conversation.message(
      {
        workspace_id: params.workspace_id || params.conversation.workspace_id,
        input: { text: params.input.text },
        context: params.context || null
      },
      (err, response) => {
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      }
    );
  });
}

/**
 * Verify the params required to call conversation exist and are in the appropriate format
 * @param params
 */
function validateParams(params) {
  // Check if we have a message in the proper format from the user
  if (!params.input || !params.input.text) {
    throw new Error('No message supplied to send to the Conversation service.');
  }

  if (typeof params.input.text !== 'string') {
    throw new Error('Message to send to Conversation must be of type string.');
  }

  // validate credentials for accessing the service instance exist and are in the expected format
  if (!params.conversation) {
    // Conversation object not supplied, attempt to read from package bindings
    if (!params.username || !params.password || !params.workspace_id) {
      throw new Error(
        'Illegal Argument Exception: parameters to call Conversation are not supplied or are not' +
          ' bound to package.'
      );
    }
  }

  const username = params.username || params.conversation.username;
  const password = params.password || params.conversation.password;
  const workspaceId = params.workspace_id || params.conversation.workspace_id;

  // validate workspace id and creds regardless of if they came from JSON params or bindings
  if (!username || typeof username !== 'string') {
    throw new Error('Conversation username not supplied or is not a string');
  } else if (!password || typeof password !== 'string') {
    throw new Error('Conversation password not supplied or is not a string');
  } else if (!workspaceId || typeof workspaceId !== 'string') {
    throw new Error(
      'Conversation workspace_id not supplied or is not a string'
    );
  }
}

module.exports = main;
