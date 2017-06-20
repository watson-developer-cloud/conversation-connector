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

  const returnParameters = {
    conversation: {
      output: {
        text: ['Output text from mock-convo.']
      }
    },
    raw_input_data: params.raw_input_data
  };
  returnParameters.raw_input_data.conversation = params.conversation;

  return Promise.resolve(returnParameters);
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
  if (
    !params.raw_input_data ||
    !params.raw_input_data.provider ||
    !params.raw_input_data[params.raw_input_data.provider]
  ) {
    throw new Error('No channel raw input data provided.');
  }
}

module.exports = main;
