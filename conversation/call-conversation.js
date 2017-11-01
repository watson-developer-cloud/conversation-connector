/**
 * Copyright IBM Corp. 2017
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an AS IS BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const assert = require('assert');

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
  return new Promise((resolve, reject) => {
    validateParams(params);

    const auth = params.raw_input_data.auth;

    assert(auth.conversation, 'conversation object absent in auth data.');
    assert(
      auth.conversation.username,
      'conversation username absent in auth.conversation'
    );
    assert(
      auth.conversation.password,
      'conversation password absent in auth.conversation'
    );
    assert(
      auth.conversation.workspace_id,
      'conversation workspace_id absent in auth.conversation'
    );

    const conversation = new ConversationV1({
      username: auth.conversation.username,
      password: auth.conversation.password,
      url: params.url,
      version: params.version || 'v1',
      version_date: params.version_date || '2017-05-26'
    });
    const payload = Object.assign({}, params.conversation);
    payload.workspace_id = auth.conversation.workspace_id;

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
 * @params {JSON} parameters passed into the action
 */
function validateParams(params) {
  // Check if we have a message in the proper format
  assert(
    params.conversation &&
      params.conversation.input &&
      params.conversation.input.text,
    'No message supplied to send to the Conversation service.'
  );

  // Required: channel raw input data
  assert(
    params.raw_input_data &&
      params.raw_input_data.provider &&
      params.raw_input_data[params.raw_input_data.provider],
    'No channel raw input data found.'
  );

  // Required: auth
  assert(params.raw_input_data.auth, 'No auth found.');
}

module.exports = {
  main,
  name: 'conversation/call-conversation',
  validateParams
};
