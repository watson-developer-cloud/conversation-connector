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

/**
 * Mock action needed for integration tests of the context package actions.
 *
 * @param  {JSON} params - parameters sent by context/load-context
 * @return {JSON} - parameters sent to context/save-context
 */
function main(params) {
  try {
    validateParams(params);
  } catch (e) {
    return Promise.reject(e.message);
  }

  // Add a mock response like it would come back from call-conversation.
  // Add provider-specific fields which normalize-conversation-for-channel would add.
  let conversationData;
  let conversationId;
  if (
    params.raw_input_data.cloudant_context_key ===
    'slack_TXXXXXXXX_abcd-123_U2147483697_D024BE91M'
  ) {
    // This corresponds to the first turn of a multi-turn request so
    // set the conversation id accordingly.
    conversationId = '2';
  } else {
    conversationId = '1';
  }
  if (Object.keys(params.conversation.context).length > 0) {
    // If the Conversation context is not empty, it's not the first turn.
    // Respond with a dummy payload for a second turn.
    // For testing purposes we can just reply with the "turn on lights" example.
    conversationData = {
      entities: [],
      context: {
        conversation_id: conversationId,
        system: {
          branch_exited_reason: 'completed',
          dialog_request_counter: 2,
          branch_exited: true,
          dialog_turn_counter: 2,
          dialog_stack: [
            {
              dialog_node: 'root'
            }
          ]
        }
      },
      intents: [],
      output: {
        text: ['Ok. Turning on the lights.'],
        nodes_visited: ['node_2_1473880041309'],
        log_messages: []
      },
      input: {
        text: 'Turn on lights'
      }
    };
  } else {
    // Context is empty so reply with a dummy welcome message.

    conversationData = {
      entities: [],
      context: {
        conversation_id: conversationId,
        system: {
          branch_exited_reason: 'completed',
          dialog_request_counter: 1,
          branch_exited: true,
          dialog_turn_counter: 1,
          dialog_stack: [
            {
              dialog_node: 'root'
            }
          ]
        }
      },
      intents: [],
      output: {
        text: [
          'Hi. It looks like a nice drive today. What would you like me to do?  '
        ],
        nodes_visited: ['node_1_1473880041309'],
        log_messages: []
      },
      input: {
        text: ''
      }
    };
  }
  const rawInputData = params.raw_input_data;
  const responseJson = {
    channel: rawInputData[rawInputData.provider].event.channel,
    text: conversationData.output.text.join(' '),
    raw_input_data: rawInputData,
    conversation: conversationData
  };
  return responseJson;
}

/**
 *  Validates the required parameters for running this action.
 *
 *  @params The parameters passed into the action
 */
function validateParams(params) {
  if (!params.conversation.context) {
    throw new Error('No context in params.');
  }
}

module.exports = main;
