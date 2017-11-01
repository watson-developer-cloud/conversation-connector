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

'use strict';

const assert = require('assert');

/**
 * Converts facebook channel-formatted JSON data into Conversation SDK formatted JSON input.
 *
 * @param  {JSON} params - Each individual messaging entry/event
 * {
      "sender": { "id": "1637923046xxxxxx" },
      "recipient": { "id": "268440730xxxxxx" },
      "timestamp": 1501786719609,
      "message": {
        "mid": "mid.$cAACu1giyQ85j2rwNfVdqxxxxxxxx",
        "seq": 3054,
        "text": "find a restaurant"
      }
    }
 * @return {JSON} - JSON data formatted as input for Conversation SDK
 */
function main(params) {
  return new Promise((resolve, reject) => {
    validateParameters(params);

    const auth = params.auth;

    getTextFromPayload(params)
      .then(result => {
        const conversationJson = {
          conversation: {
            input: {
              text: result
            }
          },
          raw_input_data: {
            facebook: params.facebook,
            provider: 'facebook',
            auth,
            // This cloudant_key lives till context/saveContext so the action can perform
            // operations in the Cloudant db.
            // Other channels must add a similar parameter
            // which uniquely identifies a conversation for a user.
            cloudant_context_key: generateCloudantKey(params, auth)
          }
        };
        resolve(conversationJson);
      })
      .catch(reject);
  });
}

/**
 * Function checks for regular text message or a postback event payload
 * and sends it to watson conversation
 * @param {JSON} params - Params coming into the action
 * @return {JSON} - Text that is to be sent to conversation
 */
function getTextFromPayload(params) {
  return new Promise((resolve, reject) => {
    // 1. Message Type Event
    // Extract text from message event to send it to Conversation
    const messageEventPayload = params.facebook.message &&
      params.facebook.message.text;

    // 2. Postback type event. Usually detected on button clicks
    // Extract text (postback payload) from postback event to send it to Conversation
    const postbackEventPayload = params.facebook.postback &&
      params.facebook.postback.payload;

    /**
     * You can add code to handle other facebook events HERE
     */

    if (messageEventPayload) {
      resolve(messageEventPayload);
    } else if (postbackEventPayload) {
      resolve(postbackEventPayload);
    } else {
      reject(
        'Neither message.text event detected nor postback.payload event detected. Please add appropriate code to handle a different facebook event.'
      );
    }
  });
}

/**
 * Validates the required parameters for running this action.
 *
 * @param  {JSON} params - the parameters passed into the action
 */
function validateParameters(params) {
  // Required: the provider must be known and supplied
  assert(params.provider, "Provider not supplied or isn't Facebook.");
  // Required: JSON data for the channel provider must be supplied
  assert(params.facebook, 'Facebook JSON data is missing.');
  // Required: auth
  assert(params.auth, 'No auth found.');
}

/**
 * Builds and returns a Cloudant database key from Facebook input parameters.
 *
 * @param  {JSON} params - The parameters passed into the action
 * @return {string}      - cloudant database key
 */
function generateCloudantKey(params, auth) {
  const fbSenderId = params.facebook &&
    params.facebook.sender &&
    params.facebook.sender.id;
  const fbWorkspaceId = auth.conversation.workspace_id;
  const fbRecipientId = params.facebook &&
    params.facebook.recipient &&
    params.facebook.recipient.id;

  return `facebook_${fbSenderId}_${fbWorkspaceId}_${fbRecipientId}`;
}

module.exports = {
  main,
  name: 'starter-code/normalize-facebook-for-conversation',
  validateParameters
};
