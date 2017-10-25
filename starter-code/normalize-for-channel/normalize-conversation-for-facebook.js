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
 * Converts Conversation module output JSON data to JSON data of the Facebook API input format
 *
 * @param  {JSON} params - JSON data in the sent by Conversation module
 * @return {JSON}        - JSON data in Facebook Graph API /v2.6/me/messages format
 */
function main(params) {
  return new Promise((resolve, reject) => {
    try {
      validateParameters(params);
    } catch (e) {
      reject(e.message);
    }
    const normalizedJson = {
      recipient: {
        id: params.raw_input_data.facebook.sender.id
      },
      // Get payload for regular text message or interactive message
      message: getMessageType(params),
      raw_input_data: params.raw_input_data,
      raw_output_data: {
        conversation: params.conversation
      }
    };
    resolve(normalizedJson);
  });
}

/**
 * Function retrieves interactive message payload or regular text message payload
 * from the params that it receives from conversation
 * @param {JSON} params - Parameters coming into this action
 * @return {JSON} - Either an attachment or a text message payload
 */
function getMessageType(params) {
  const interactiveMessage = params.conversation.output.facebook;
  const textMessage = params.conversation.output.text.join(' ');
  // If dialog node sends back output.facebook (used for interactive messages such as
  // buttons and templates)
  if (interactiveMessage) {
    // An acceptable interactive JSON could either be of form -> output.facebook or
    // output.facebook.message. Facebook's Send API accepts the "message" payload. So,
    // if you already wrap your interactive message inside "message" object, then we
    // accept it as-is. And if you don't wrap your interactive message inside "message"
    // object, then the code wraps it for you.
    if (interactiveMessage.message) {
      return interactiveMessage.message;
    }
    return interactiveMessage;
  }
  // if regular text message is received
  return { text: textMessage };
}

/**
 *  Validates the required parameters for running this action.
 *
 *  @param {JSON} params The parameters passed into the action
 */
function validateParameters(params) {
  // Required: Conversation JSON data
  assert(params.conversation, 'No conversation output.');
  // Required: Conversation output text
  assert(
    params.conversation.output && params.conversation.output.text,
    'No conversation output text.'
  );
  // Required: raw input data
  assert(params.raw_input_data, 'No raw input data found.');
  // Required: Facebook input data
  assert(params.raw_input_data.facebook, 'No Facebook input data found.');
  // Required: Conversation input data
  assert(
    params.raw_input_data.conversation,
    'No Conversation input data found.'
  );
  // Required: Facebook event and channel
  assert(
    params.raw_input_data.facebook.sender &&
      params.raw_input_data.facebook.sender.id,
    'No Facebook sender_id found in raw data.'
  );
}

module.exports = main;
