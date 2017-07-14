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
  let rawOutputData;
  if (Object.keys(params.conversation.context).length > 0) {
    // If the Conversation context is not empty, it's not the first turn.
    // Respond with a dummy payload for a second turn.
    // For testing purposes we can just reply with the "turn on lights" example.
    rawOutputData = {
      conversation: {
        entities: [],
        context: {
          conversation_id: '364be902-40ac-421c-ac6c-04069d7ea14d',
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
      }
    };
  } else {
    // Context is empty so reply with a dummy welcome message.
    rawOutputData = {
      conversation: {
        entities: [],
        context: {
          conversation_id: '364be902-40ac-421c-ac6c-04069d7ea14d',
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
      }
    };
  }
  const rawInputData = params.raw_input_data;
  const responseJson = {
    channel: rawInputData[rawInputData.provider].event.channel,
    text: rawOutputData.conversation.output.text.join(' '),
    raw_input_data: rawInputData,
    raw_output_data: rawOutputData
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
