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
          "event": {
            "text": "How is the weather?"
          },
          "conversation": {
              "username": "123",
              "password": "abc",
              "workspace_id": "xyz"
          }
      };
 *
 * @return which must be a JSON object.
 *         It will be the output of this action.
 *
 */
module.exports = function main(params) {

    try {
        validateParams(params);
    } catch (e) {
        return Promise.reject(e);
    }

    var ConversationV1 = require('watson-developer-cloud/conversation/v1');
    var merge = require('merge');

    var conversation = new ConversationV1({
        username: params.conversation.username,
        password: params.conversation.password,
        version: 'v1',
        version_date: '2016-10-21'
    });

    return new Promise(function (resolve, reject) {
        conversation.message({
            workspace_id: params.conversation.workspace_id,
            input: { text: params.event.text }
        }, function (err, response) {
            if (err) {
                console.log('error calling Conversation service', err);
                reject(err);
            } else {
                resolve(response);
            }
        });
    });
};

/**
 * Verify the params required to call conversation exist and are in the appropriate format
 * @param params
 */
function validateParams(params) {
    // Check if we have a message in the proper format from the user
    if (!params.event || !params.event.text) {
        throw 'No message supplied to send to the Conversation service.';
    } else {
        if (typeof params.event.text !== 'string') {
          throw 'Message to send to Conversation must be of type string.';
        }
    }

    // validate credentials for accessing the service instance exist and are in the expected format
    if (!params.conversation) {
        throw 'Illegal Argument Exception: parameters to call Conversation are not supplied.';
    } else if (!params.conversation.username || typeof params.conversation.username !== 'string') {
        throw 'Conversation username not supplied or is not a string';
    } else if (!params.conversation.password || typeof params.conversation.password !== 'string') {
        throw 'Conversation password not supplied or is not a string';
    } else if (!params.conversation.workspace_id || typeof params.conversation.workspace_id !== 'string') {
        throw 'Conversation workspace_id not supplied or is not a string';
    }
}
