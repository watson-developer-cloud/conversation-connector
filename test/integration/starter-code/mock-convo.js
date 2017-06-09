'use strict';

/**
 * Mock conversation action used by the starter code.
 *
 * @param  {JSON} params - parameters sent by starter-code/pre-conversation
 * @return {JSON} - parameters sent to starter-code/post-conversation
 */
function main(params) {
  try {
    validateParams(params);
  } catch (e) {
    return Promise.reject(e.message);
  }

  return {
    conversation: {
      input: {
        text: params.conversation.input.text
      },
      output: {
        text: ['Output text from mock-convo.']
      }
    },
    raw_data: params.raw_data
  };
}

/**
 *  Validates the required parameters for running this action.
 *
 *  @params The parameters passed into the action
 */
function validateParams(params) {
  // Required: Conversation object
  if (!params.conversation) {
    throw new Error('Conversation data not provided.');
  }
  // Required: Conversation input text
  if (!params.conversation.input || !params.conversation.input.text) {
    throw new Error('Input text not provided.');
  }
  // Required: channel raw data
  if (!params.raw_data) {
    throw new Error('No channel raw data provided.');
  }
}

module.exports = main;
