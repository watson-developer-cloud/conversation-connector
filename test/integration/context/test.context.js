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
   * Context Package Integration Tests (load-context and save-context)
   */

const assert = require('assert');
const openwhisk = require('openwhisk');

const envParams = process.env;

const pipelineName = envParams.__TEST_PIPELINE_NAME;

const actionName = `${pipelineName}_context/integration-pipeline`;

describe('context package integration tests', () => {
  const ow = openwhisk();

  let params;
  let expectedResult;

  beforeEach(() => {
    params = {
      conversation: {
        input: {
          text: ''
        }
      },
      raw_input_data: {
        slack: {
          bot_access_token: 'xoxb-197154261526-JFcrTQgmN9pubm8nYMcXXXXX',
          access_token: 'xoxp-186464790945-187081019828-196275302867-9dcd597b2590c1f371dcf938f4eXXXXX',
          team_id: 'TXXXXXXXX',
          event: {
            channel: 'D024BE91L',
            ts: '1355517523.000005',
            text: '',
            type: 'message',
            user: 'U2147483697'
          },
          api_app_id: 'AXXXXXXXXX',
          authed_users: ['UXXXXXXX1', 'UXXXXXXX2'],
          event_time: 1234567890,
          token: 'XXYYZZ',
          type: 'event_callback',
          event_id: 'Ev08MFMKH6'
        },
        provider: 'slack',
        cloudant_context_key: 'slack_TXXXXXXXX_abcd-123_U2147483697_D024BE91L'
      }
    };

    expectedResult = {
      raw_input_data: params.raw_input_data,
      channel: params.raw_input_data.slack.event.channel,
      text: 'Hi. It looks like a nice drive today. What would you like me to do?  ',
      conversation: {
        entities: [],
        context: {
          conversation_id: '1',
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
  });

  it('validate actions work properly for single turn', () => {
    return ow.actions
      .invoke({
        name: actionName,
        blocking: true,
        result: true,
        params
      })
      .then(success => {
        assert.deepEqual(success, expectedResult);
      })
      .catch(err => {
        assert(false, err);
      });
  })
    .timeout(15000)
    .retries(4);

  it('validate actions work properly for multiple turns', () => {
    // Get the json params for the multi turn case.
    params.raw_input_data.slack.event.channel = 'D024BE91L';
    params.raw_input_data.cloudant_context_key = 'slack_TXXXXXXXX_abcd-123_U2147483697_D024BE91M';

    // The expected responses from the system.
    expectedResult.conversation.context.conversation_id = '2';

    return ow.actions
      .invoke({
        name: actionName,
        blocking: true,
        result: true,
        params
      })
      .then(result => {
        assert.deepEqual(result, expectedResult);

        // Update params text for the second turn.
        params.conversation.input.text = 'Turn on lights';

        // Update the expected JSON for the second turn.
        expectedResult.text = 'Ok. Turning on the lights.';
        expectedResult.conversation.context.system.dialog_request_counter = 2;
        expectedResult.conversation.context.system.dialog_turn_counter = 2;
        expectedResult.conversation.output.text[0] = expectedResult.text;
        expectedResult.conversation.output.nodes_visited[
          0
        ] = 'node_2_1473880041309';
        expectedResult.conversation.input.text = params.conversation.input.text;

        // Invoke the context sequence actions again.
        // The context package should read the updated context from the previous turn.
        return ow.actions.invoke({
          name: actionName,
          result: true,
          blocking: true,
          params
        });
      })
      .then(result => {
        assert.deepEqual(result, expectedResult);
      })
      .catch(err => {
        assert(false, err);
      });
  })
    .timeout(20000)
    .retries(4);
});
