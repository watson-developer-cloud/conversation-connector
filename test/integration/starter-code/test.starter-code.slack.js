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
 * Starter Code Integration Tests (pre-conversation and post-conversation)
 */

const assert = require('assert');
const openwhisk = require('openwhisk');

const chatPostUrl = 'https://slack.com/api/chat.postMessage';

const envParams = process.env;

const pipelineName = envParams.__TEST_PIPELINE_NAME;

const inputText = 'Turn on lights';
const outputText = 'Output text from mock-conversation.';

describe('starter-code integration tests for slack', () => {
  // Setup the ow module for the upcoming calls
  const ow = openwhisk();

  let params;
  let expectedResult;
  let slackData;
  const auth = {
    conversation: {
      username: envParams.__TEST_CONVERSATION_USERNAME,
      password: envParams.__TEST_CONVERSATION_PASSWORD,
      workspace_id: envParams.__TEST_CONVERSATION_WORKSPACE_ID
    }
  };

  beforeEach(() => {
    params = {
      slack: {
        token: 'XXYYZZ',
        team_id: 'TXXXXXXXX',
        api_app_id: 'AXXXXXXXXX',
        event: {
          type: 'message',
          channel: 'D024BE91L',
          user: 'U2147483697',
          text: inputText,
          ts: '1355517523.000005'
        },
        type: 'event_callback',
        authed_users: ['UXXXXXXX1', 'UXXXXXXX2'],
        event_id: 'Ev08MFMKH6',
        event_time: 1234567890
      },
      provider: 'slack',
      auth,
      channel_id: 'D024BE91L',
      message: inputText,
      context: {}
    };

    expectedResult = {
      channel: 'D024BE91L',
      text: outputText,
      ts: '1355517523.000005',
      url: chatPostUrl,
      raw_input_data: {
        conversation: {
          input: {
            text: inputText
          }
        },
        slack: params.slack,
        provider: 'slack',
        auth,
        cloudant_context_key: `slack_TXXXXXXXX_${process.env.__TEST_CONVERSATION_WORKSPACE_ID}_U2147483697_D024BE91L`
      },
      raw_output_data: {
        conversation: {
          output: {
            text: [outputText]
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
      }
    };

    slackData = {
      text: outputText,
      attachments: [
        {
          actions: [
            {
              name: 'test_option_one',
              text: 'Test Option One',
              type: 'button',
              value: 'test option one'
            },
            {
              name: 'test_option_two',
              text: 'Test Option Two',
              type: 'button',
              value: 'test option two'
            },
            {
              name: 'test_option_three',
              text: 'Test Option Three',
              type: 'button',
              value: 'test option three'
            }
          ],
          fallback: 'Buttons not working...',
          callback_id: 'test_integration_options'
        }
      ]
    };
  });

  it('validate starter-code handles text from conversation', () => {
    const actionName = `${pipelineName}_starter-code/integration-pipeline-slack`;

    return ow.actions
      .invoke({
        name: actionName,
        blocking: true,
        result: true,
        params
      })
      .then(
        success => {
          assert.deepEqual(success, expectedResult);
        },
        error => {
          assert(false, error);
        }
      );
  }).retries(4);

  it(
    'validate starter-code handles slack-specific data from conversation',
    () => {
      const actionName = `${pipelineName}_starter-code/integration-pipeline-slack-with-slack-data`;

      expectedResult.raw_output_data.conversation.output.slack = {};
      expectedResult.raw_output_data.conversation.output.slack = slackData;
      expectedResult.attachments = slackData.attachments;
      delete expectedResult.ts;

      return ow.actions
        .invoke({ name: actionName, blocking: true, result: true, params })
        .then(
          result => {
            assert.deepEqual(result, expectedResult);
          },
          error => {
            assert(false, error);
          }
        );
    }
  ).retries(4);
});
