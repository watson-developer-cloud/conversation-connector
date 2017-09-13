'use strict';

const assert = require('assert');

/**
 * Mock action receiving input from normalize-channel-for-conversation,
 *   and sending a Facebook-specific JSON in Conversation response
 *   to normalize-conversation-for-channel.
 *
 * @param  {JSON} params - input with Conversation (call-conversation) input
 * @return {JSON}        - text output from Conversation (call-conversation)
 */
function main(params) {
  return new Promise(resolve => {
    validateParameters(params);

    const facebookData = {
      attachment: {
        type: 'template',
        payload: {
          elements: [
            {
              title: 'Output text from mock-convo.',
              buttons: [
                {
                  type: 'postback',
                  title: 'Enter T-Shirt Store',
                  payload: 'List all t-shirts'
                }
              ],
              subtitle: 'I can help you find a t-shirt',
              image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTDQKvGUWTu5hStYHbjH8J3fZi6JgYqw6WY3CrfjB680uLjy2FF9A'
            }
          ],
          template_type: 'generic',
          image_aspect_ratio: 'square'
        }
      }
    };

    const returnParameters = {
      conversation: {
        output: {
          text: ['Output text from mock-convo.']
        },
        context: {
          conversation_id: '06aae48c-a5a9-4bbc-95eb-2ddd26db9a7b',
          system: {
            branch_exited_reason: 'completed',
            dialog_request_counter: 1,
            branch_exited: true,
            dialog_turn_counter: 1,
            dialog_stack: [
              {
                dialog_node: 'root'
              }
            ],
            _node_output_map: {
              'Anything else': [0]
            }
          }
        }
      }
    };
    returnParameters.raw_input_data = Object.assign({}, params.raw_input_data);
    returnParameters.raw_input_data.conversation = Object.assign(
      {},
      params.conversation
    );
    returnParameters.conversation.output.facebook = facebookData;
    resolve(returnParameters);
  });
}

/**
 * Validates the required parameters for running this action.
 *
 * @param  {JSON} params - the parameters passed into the action
 */
function validateParameters(params) {
  // Required: Conversation object
  assert(params.conversation, 'Conversation data not provided.');

  // Required: Conversation input text
  assert(
    params.conversation.input && params.conversation.input.text,
    'Input text not provided.'
  );

  // Required: channel raw data
  assert(
    params.raw_input_data &&
      params.raw_input_data.provider &&
      params.raw_input_data[params.raw_input_data.provider],
    'No channel raw input data provided.'
  );
}

module.exports = main;
