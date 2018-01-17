/**
 * Copyright IBM Corp. 2018
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

const openwhisk = require('openwhisk');
const assert = require('assert');
const nock = require('nock');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('Multi-post Unit Tests', () => {
  const apiHost = 'xxx';
  const apiKey = 'xxx';
  const namespace = 'xxx';

  let multiPostParams = {};
  let multiPostResponse = {};
  let postResponse = {};
  let mockCloudFunctionsEndpoints = {};
  let cloudFunctionsStub;
  let mockMultiplePost;

  const cloudFunctionsUrl = `https://${apiHost}/api/v1/namespaces`;
  process.env.__OW_ACTION_NAME = '/org_space/deployname_postsequence';

  beforeEach(() => {
    mockCloudFunctionsEndpoints = {
      url: cloudFunctionsUrl,
      actionsEndpoint: `/${namespace}/actions/deployname_postsequence?blocking=true`
    };

    cloudFunctionsStub = sinon.stub().returns(
      openwhisk({
        apihost: apiHost,
        api_key: apiKey,
        namespace
      })
    );

    mockMultiplePost = proxyquire('../../../../channels/facebook/multiple_post/index.js', {
      openwhisk: cloudFunctionsStub
    });

    multiPostParams = {
      recipient: {
        id: 'xxx'
      },
      message: {
        text: "Sorry, I don't understand.  Please ask another question"
      },
      raw_input_data: {
        conversation: {
          input: {
            text: 'hi'
          },
          context: {
            system: {
              branch_exited_reason: 'completed',
              dialog_request_counter: 11,
              branch_exited: true,
              dialog_turn_counter: 11,
              dialog_stack: [
                {
                  dialog_node: 'root'
                }
              ],
              _node_output_map: {
                Start: [0],
                'Anything else bucket': [0]
              }
            },
            conversation_id: 'a1a1492a-b464-4aaa-94bb-d32020aa0605'
          }
        },
        provider: 'facebook',
        auth: {
          conversation: {
            username: 'xxx',
            password: 'xxx',
            workspace_id: 'xxx'
          },
          _revs_info: [
            {
              rev: '1-446de853126f84ed5f55a1fad2465680',
              status: 'available'
            }
          ],
          _id: 'cea29300-f571-11e7-ab93-89e005a51dbb',
          facebook: {
            app_secret: 'xxx',
            page_access_token: 'xxx',
            verification_token: 'xxx'
          },
          _rev: '1-446de853126f84ed5f55a1fad2465680'
        },
        facebook: {
          sender: {
            id: 'xxx'
          },
          recipient: {
            id: 'xxx'
          },
          timestamp: 1515529732364,
          message: {
            mid: 'mid.$cAAdxoMih2R1nDeHJDFg3JygwescZ',
            seq: 393,
            text: 'hi'
          }
        },
        cloudant_context_key: 'xxx'
      },
      raw_output_data: {
        conversation: {
          entities: [],
          context: {
            system: {
              branch_exited_reason: 'completed',
              dialog_request_counter: 12,
              branch_exited: true,
              dialog_turn_counter: 12,
              dialog_stack: [
                {
                  dialog_node: 'root'
                }
              ],
              _node_output_map: {
                Start: [0],
                'Anything else bucket': [0]
              }
            },
            conversation_id: 'a1a1492a-b464-4aaa-94bb-d32020aa0605'
          },
          intents: [],
          output: {
            text: ["Sorry, I don't understand.  Please ask another question"],
            nodes_visited: ['Anything else bucket'],
            log_messages: []
          },
          input: {
            text: 'hi'
          }
        }
      }
    };

    multiPostResponse = {
      postResponses: [
        {
          successfulInvocation: {
            successResponse: {
              text: 200,
              params: {
                recipient: {
                  id: 'xxx'
                },
                message: {
                  text: "Sorry, I don't understand.  Please ask another question"
                }
              },
              url: 'https://graph.facebook.com/v2.6/me/messages'
            },
            activationId: 'xxx'
          }
        }
      ]
    };

    postResponse = {
      duration: 250,
      name: 'post',
      subject: 'xxx',
      activationId: 'xxx',
      publish: false,
      annotations: [
        { key: 'limits', value: { timeout: 60000, memory: 256, logs: 10 } },
        { key: 'path', value: 'xxx/xxx/post' },
        { key: 'kind', value: 'nodejs:6' },
        { key: 'waitTime', value: 39 }
      ],
      version: '0.0.3',
      response: {
        result: {
          text: 200,
          params: {
            recipient: { id: 'xxx' },
            message: {
              text: "Sorry, I don't understand.  Please ask another question"
            }
          },
          url: 'https://graph.facebook.com/v2.6/me/messages'
        },
        success: true,
        status: 'success'
      },
      end: 1515791952861,
      logs: [],
      start: 1515791952611,
      namespace: 'xxx'
    };
  });

  it('validate multipost use case', () => {
    const mock = nock(`${mockCloudFunctionsEndpoints.url}`)
      .post(mockCloudFunctionsEndpoints.actionsEndpoint)
      .reply(201, postResponse);

    return mockMultiplePost.main(multiPostParams).then(
      result => {
        if (!mock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server did not get called.');
        }
        assert.deepEqual(result, multiPostResponse);
      },
      error => {
        assert(false, error);
      }
    );
  });
});
