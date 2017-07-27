'use strict';

/**
 * Converts Conversation module output JSON data to JSON data of the Facebook API input format
 *
 * @param  {JSON} params - JSON data in the sent by Conversation module
 * @return {JSON}        - JSON data in Facebook Graph API /v2.6/me/messages format
 */
function main(params) {
  try {
    validateParameters(params);
  } catch (e) {
    return Promise.reject(e.message);
  }

  const normalizedJson = {
    recipient: {
      id: params.raw_input_data.facebook.entry[0].messaging[0].sender.id
    },
    message: {
      text: params.conversation.output.text.join(' ') // Combine multiple text responses from Conversation(if any)
    },
    raw_input_data: params.raw_input_data,
    raw_output_data: {
      conversation: params.conversation
    }
  };

  return Promise.resolve(normalizedJson);
}

/**
 *  Validates the required parameters for running this action.
 *
 *  @params The parameters passed into the action
 */
function validateParameters(params) {
  // Required: Conversation JSON data
  if (!params.conversation) {
    throw new Error('No conversation output.');
  }
  // Required: Conversation output text
  if (!params.conversation.output || !params.conversation.output.text) {
    throw new Error('No conversation output message.');
  }
  // Required: raw input data
  if (!params.raw_input_data) {
    throw new Error('No raw input data found.');
  }
  // Required: Facebook input data
  if (!params.raw_input_data.facebook) {
    throw new Error('No Facebook input data found.');
  }
  // Required: Conversation input data
  if (!params.raw_input_data.conversation) {
    throw new Error('No Conversation input data found.');
  }
  // Required: Facebook event and channel
  if (
    !params.raw_input_data.facebook.entry ||
    !params.raw_input_data.facebook.entry[0] ||
    !params.raw_input_data.facebook.entry[0].messaging ||
    !params.raw_input_data.facebook.entry[0].messaging[0] ||
    !params.raw_input_data.facebook.entry[0].messaging[0].sender ||
    !params.raw_input_data.facebook.entry[0].messaging[0].sender.id
  ) {
    throw new Error('No Facebook sender_id found in raw data.');
  }
}

module.exports = main;
