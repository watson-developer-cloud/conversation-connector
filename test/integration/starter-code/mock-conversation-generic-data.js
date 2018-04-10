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
 * Mock action receiving input from normalize-channel-for-conversation,
 *   and sending a generic multi-modal Conversation response
 *   to normalize-conversation-for-channel.
 *
 * @param  {JSON} params - input with Conversation (call-conversation) input
 * @return {JSON}        - multi-modal output from Conversation (call-conversation)
 */
function main(params) {
  return new Promise(resolve => {
    validateParameters(params);

    const genericData = [
      {
        response_type: 'pause',
        time: 1000,
        typing: true
      },
      {
        response_type: 'text',
        text: 'Output text from mock-conversation.'
      },
      {
        response_type: 'image',
        source: 'https://a.slack-edge.com/66f9/img/api/attachment_image.png',
        title: 'Image title',
        description: 'Image description'
      },
      {
        response_type: 'option',
        title: 'Choose your location',
        options: [
          {
            label: 'Location 1',
            value: 'Location 1'
          },
          {
            label: 'Location 2',
            value: 'Location 2'
          },
          {
            label: 'Location 3',
            value: 'Location 3'
          }
        ]
      }
    ];

    const returnParameters = {
      conversation: {
        output: {
          generic: genericData
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
