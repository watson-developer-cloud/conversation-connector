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

const envParams = process.env;

const pipelineName = envParams.__TEST_PIPELINE_NAME;

describe('starter-code integration tests for facebook', () => {
  const ow = openwhisk();

  let params;
  let expectedResult;
  let facebookData;
  const auth = {
    conversation: {
      username: envParams.__TEST_CONVERSATION_USERNAME,
      password: envParams.__TEST_CONVERSATION_PASSWORD,
      workspace_id: envParams.__TEST_CONVERSATION_WORKSPACE_ID
    }
  };

  beforeEach(() => {
    params = {
      facebook: {
        sender: {
          id: envParams.__TEST_FACEBOOK_SENDER_ID
        },
        recipient: {
          id: envParams.__TEST_FACEBOOK_RECIPIENT_ID
        },
        message: {
          text: 'hello, world!'
        }
      },
      provider: 'facebook',
      auth
    };

    expectedResult = {
      recipient: {
        id: envParams.__TEST_FACEBOOK_SENDER_ID
      },
      raw_input_data: {
        facebook: params.facebook,
        provider: 'facebook',
        auth,
        cloudant_context_key: `facebook_1481847138543615_${process.env.__TEST_CONVERSATION_WORKSPACE_ID}_185643828639058`,
        conversation: { input: { text: 'hello, world!' } }
      },
      message: { text: 'Output text from mock-conversation.' },
      raw_output_data: {
        conversation: {
          output: { text: ['Output text from mock-conversation.'] },
          context: {
            conversation_id: '06aae48c-a5a9-4bbc-95eb-2ddd26db9a7b',
            system: {
              branch_exited_reason: 'completed',
              dialog_request_counter: 1,
              branch_exited: true,
              dialog_turn_counter: 1,
              dialog_stack: [{ dialog_node: 'root' }],
              _node_output_map: { 'Anything else': [0] }
            }
          }
        }
      }
    };

    facebookData = {
      attachment: {
        type: 'template',
        payload: {
          elements: [
            {
              title: 'Output text from mock-conversation.',
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
  });

  it('validate starter-code-facebook actions work', () => {
    const actionName = `${pipelineName}_starter-code/integration-pipeline-facebook`;

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
  }).retries(5);

  it(
    'validate starter-code handles facebook-specific data from conversation',
    () => {
      const actionName = `${pipelineName}_starter-code/integration-pipeline-facebook-with-facebook-data`;
      expectedResult.message = facebookData;
      expectedResult.raw_output_data.conversation.output.facebook = {};
      expectedResult.raw_output_data.conversation.output.facebook = facebookData;

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
