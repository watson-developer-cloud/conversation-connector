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

const previousTestName = process.env.__OW_ACTION_NAME;

describe('Multi-post Unit Tests', () => {
  const apiHost = 'xxx';
  const apiKey = 'xxx';
  const namespace = 'xxx';

  let mockCloudFunctionsEndpoints = {};
  let cloudFunctionsStub;
  let mockMultiplePost;

  const cloudFunctionsUrl = `https://${apiHost}/api/v1/namespaces`;
  process.env.__OW_ACTION_NAME = '/org_space/deployname_postsequence';

  beforeEach(() => {
    process.env.__OW_ACTION_NAME = '/org_space/deployname_postsequence';

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

    mockMultiplePost = proxyquire(
      '../../../../channels/facebook/multiple_post/index.js',
      {
        openwhisk: cloudFunctionsStub
      }
    );
  });

  after(() => {
    process.env.__OW_ACTION_NAME = previousTestName;
  });

  it('validate multipost with single message', () => {
    const multiPostParams = {
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

    const postResponse = {
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

    const multiPostResponse = {
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

  it('validate multipost with arrayed message', () => {
    const multiPostParams = {
      recipient: {
        id: 'xxx'
      },
      message: [
        {
          text: 'Here is your multi-modal response.'
        },
        {
          attachment: {
            type: 'image',
            payload: {
              url: 'https://xxx.com/xxx.png'
            }
          }
        },
        {
          text: 'Choose your location',
          quick_replies: [
            {
              content_type: 'text',
              title: 'Location 1',
              payload: 'Location 1'
            },
            {
              content_type: 'text',
              title: 'Location 2',
              payload: 'Location 2'
            },
            {
              content_type: 'text',
              title: 'Location 3',
              payload: 'Location 3'
            }
          ]
        }
      ],
      raw_input_data: {
        conversation: {
          input: {
            text: 'Show me an image'
          },
          context: {
            appl_action: '',
            default_counter: 0,
            volumeonoff: 'off',
            musiconoff: 'off',
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
                'Start And Initialize Context': [0, 0]
              }
            },
            heateronoff: 'off',
            AConoff: 'off',
            wipersonoff: 'off',
            conversation_id: '1a8ca013-ecce-4d50-a59e-f2c7495d4e6d',
            lightonoff: 'off'
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
              rev: '1-a11033fca1d3ccd1fad5c0b2ba5de0d3',
              status: 'available'
            }
          ],
          _id: '8bcca000-fbc2-11e7-8a63-0d454d7bbecd',
          facebook: {
            app_secret: 'xxx',
            page_access_token: 'xxx',
            verification_token: 'xxx'
          },
          _rev: '1-a11033fca1d3ccd1fad5c0b2ba5de0d3'
        },
        facebook: {
          sender: {
            id: 'xxx'
          },
          recipient: {
            id: 'xxx'
          },
          timestamp: 1516220585636,
          message: {
            mid: 'mid.$cAAdxoMih2R1nNw9epFhBcocloKpX',
            seq: 1084,
            text: 'Show me an image'
          }
        },
        cloudant_context_key: 'xxx'
      },
      raw_output_data: {
        conversation: {
          entities: [],
          context: {
            appl_action: '',
            default_counter: 0,
            volumeonoff: 'off',
            musiconoff: 'off',
            system: {
              branch_exited_reason: 'completed',
              dialog_request_counter: 2,
              branch_exited: true,
              dialog_turn_counter: 2,
              dialog_stack: [
                {
                  dialog_node: 'root'
                }
              ],
              _node_output_map: {
                'Start And Initialize Context': [0, 0]
              }
            },
            heateronoff: 'off',
            AConoff: 'off',
            wipersonoff: 'off',
            conversation_id: '1a8ca013-ecce-4d50-a59e-f2c7495d4e6d',
            lightonoff: 'off'
          },
          intents: [
            {
              intent: 'multimodal',
              confidence: 1
            }
          ],
          output: {
            text: [],
            nodes_visited: ['node_1_1514502764444'],
            generic: [
              {
                text: 'Here is your multi-modal response.',
                response_type: 'text'
              },
              {
                title: 'Image title',
                source: 'https://xxx.com/xxx.png',
                description: 'Image description',
                response_type: 'image'
              },
              {
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
                ],
                response_type: 'option'
              }
            ],
            log_messages: []
          },
          input: {
            text: 'Show me an image'
          }
        }
      }
    };

    const postResponse1 = {
      duration: 290,
      name: 'psequence_postsequence',
      subject: 'xxx',
      activationId: '4812cc2341964f6992cc234196cf69bf',
      publish: false,
      annotations: [
        { key: 'topmost', value: true },
        { key: 'path', value: 'xxx_xxx/psequence_postsequence' },
        { key: 'kind', value: 'sequence' },
        { key: 'limits', value: { timeout: 60000, memory: 256, logs: 10 } }
      ],
      version: '0.0.1',
      response: {
        result: {
          text: 200,
          params: {
            recipient: { id: 'xxx' },
            message: { text: 'Here is your multi-modal response.' }
          },
          url: 'https://graph.facebook.com/v2.6/me/messages'
        },
        success: true,
        status: 'success'
      },
      end: 1516220587532,
      logs: [
        '4b77186c543346e3b7186c543386e3cc',
        '441e31363e9141c09e31363e91e1c04f'
      ],
      start: 1516220587157,
      namespace: 'xxx_xxx'
    };

    const postResponse2 = {
      duration: 775,
      name: 'psequence_postsequence',
      subject: 'xxx',
      activationId: '7cbf03bbe6464a61bf03bbe646ea61b8',
      publish: false,
      annotations: [
        { key: 'topmost', value: true },
        { key: 'path', value: 'xxx_xxx/psequence_postsequence' },
        { key: 'kind', value: 'sequence' },
        { key: 'limits', value: { timeout: 60000, memory: 256, logs: 10 } }
      ],
      version: '0.0.1',
      response: {
        result: {
          text: 200,
          params: {
            recipient: { id: 'xxx' },
            message: {
              attachment: {
                type: 'image',
                payload: { url: 'https://xxx.com/xxx.png' }
              }
            }
          },
          url: 'https://graph.facebook.com/v2.6/me/messages'
        },
        success: true,
        status: 'success'
      },
      end: 1516220588400,
      logs: [
        '4aa22aba3169423ca22aba3169c23c9d',
        'd1dee2dcf0e54c5c9ee2dcf0e59c5c66'
      ],
      start: 1516220587566,
      namespace: 'xxx_xxx'
    };

    const postResponse3 = {
      duration: 570,
      name: 'psequence_postsequence',
      subject: 'xxx',
      activationId: 'e8db2d045464441d9b2d045464341d3b',
      publish: false,
      annotations: [
        { key: 'topmost', value: true },
        { key: 'path', value: 'xxx_xxx/psequence_postsequence' },
        { key: 'kind', value: 'sequence' },
        { key: 'limits', value: { timeout: 60000, memory: 256, logs: 10 } }
      ],
      version: '0.0.1',
      response: {
        result: {
          text: 200,
          params: {
            recipient: { id: 'xxx' },
            message: {
              attachment: {
                type: 'template',
                payload: {
                  template_type: 'button',
                  text: 'Choose your location',
                  buttons: [
                    { type: 'postback', title: 'Location 1', payload: ' ' },
                    { type: 'postback', title: 'Location 2', payload: ' ' },
                    { type: 'postback', title: 'Location 3', payload: ' ' }
                  ]
                }
              }
            }
          },
          url: 'https://graph.facebook.com/v2.6/me/messages'
        },
        success: true,
        status: 'success'
      },
      end: 1516220589062,
      logs: [
        '27450fb5183a44a4850fb5183a84a453',
        'd97e103d44dd4253be103d44dd22531e'
      ],
      start: 1516220588435,
      namespace: 'xxx_xxx'
    };

    const multiPostResponse = {
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
                  text: 'Here is your multi-modal response.'
                }
              },
              url: 'https://graph.facebook.com/v2.6/me/messages'
            },
            activationId: '4812cc2341964f6992cc234196cf69bf'
          }
        },
        {
          successfulInvocation: {
            successResponse: {
              text: 200,
              params: {
                recipient: {
                  id: 'xxx'
                },
                message: {
                  attachment: {
                    type: 'image',
                    payload: {
                      url: 'https://xxx.com/xxx.png'
                    }
                  }
                }
              },
              url: 'https://graph.facebook.com/v2.6/me/messages'
            },
            activationId: '7cbf03bbe6464a61bf03bbe646ea61b8'
          }
        },
        {
          successfulInvocation: {
            successResponse: {
              text: 200,
              params: {
                recipient: {
                  id: 'xxx'
                },
                message: {
                  attachment: {
                    type: 'template',
                    payload: {
                      template_type: 'button',
                      text: 'Choose your location',
                      buttons: [
                        {
                          type: 'postback',
                          title: 'Location 1',
                          payload: ' '
                        },
                        {
                          type: 'postback',
                          title: 'Location 2',
                          payload: ' '
                        },
                        {
                          type: 'postback',
                          title: 'Location 3',
                          payload: ' '
                        }
                      ]
                    }
                  }
                }
              },
              url: 'https://graph.facebook.com/v2.6/me/messages'
            },
            activationId: 'e8db2d045464441d9b2d045464341d3b'
          }
        }
      ]
    };

    const mock = nock(`${mockCloudFunctionsEndpoints.url}`)
      .post(mockCloudFunctionsEndpoints.actionsEndpoint)
      .reply(200, postResponse1)
      .post(mockCloudFunctionsEndpoints.actionsEndpoint)
      .reply(200, postResponse2)
      .post(mockCloudFunctionsEndpoints.actionsEndpoint)
      .reply(200, postResponse3);

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

  it('validate multipost simple failure case', () => {
    const failedPost = {
      duration: 648,
      name: 'psequence_postsequence',
      subject: 'xxx',
      activationId: 'ee7b6ad0eccd4bbbbb6ad0eccd4bbb96',
      publish: false,
      annotations: [
        { key: 'topmost', value: true },
        { key: 'path', value: 'xxx_xxx/psequence_postsequence' },
        { key: 'kind', value: 'sequence' },
        { key: 'limits', value: { timeout: 60000, memory: 256, logs: 10 } }
      ],
      version: '0.0.1',
      response: {
        result: {
          error: 'Action returned with status code 400, message: Bad Request'
        },
        success: false,
        status: 'application error'
      },
      end: 1516297990239,
      logs: [
        'fa2b88566e3d4577ab88566e3d6577b5',
        'c5218eff74ec472aa18eff74ecb72a57'
      ],
      start: 1516297989553,
      namespace: 'xxx_xxx'
    };

    const multiPostParams = {
      recipient: {
        id: 'xxx'
      },
      message: {
        text: 'Hello! What can I help you with?'
      },
      raw_input_data: {
        conversation: {
          input: {
            text: 'hi'
          },
          context: {
            appl_action: '',
            default_counter: 0,
            volumeonoff: 'off',
            musiconoff: 'off',
            system: {
              branch_exited_reason: 'completed',
              dialog_request_counter: 5,
              branch_exited: true,
              dialog_turn_counter: 5,
              dialog_stack: [
                {
                  dialog_node: 'root'
                }
              ],
              _node_output_map: {
                'Start And Initialize Context': [0, 0]
              }
            },
            heateronoff: 'off',
            AConoff: 'off',
            wipersonoff: 'off',
            conversation_id: '1a8ca013-ecce-4d50-a59e-f2c7495d4e6d',
            lightonoff: 'off'
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
              rev: '1-a11033fca1d3ccd1fad5c0b2ba5de0d3',
              status: 'available'
            }
          ],
          _id: '8bcca000-fbc2-11e7-8a63-0d454d7bbecd',
          facebook: {
            app_secret: 'xxx',
            page_access_token: 'xxx',
            verification_token: 'xxx'
          },
          _rev: '1-a11033fca1d3ccd1fad5c0b2ba5de0d3'
        },
        facebook: {
          sender: {
            id: 'xxx'
          },
          recipient: {
            id: 'xxx'
          },
          timestamp: 1516297987936,
          message: {
            mid: 'mid.$cAAdxoMih2R1nO6xvYFhCmcmvBMEH',
            seq: 1108,
            text: 'hi'
          }
        },
        cloudant_context_key: 'xxx'
      },
      raw_output_data: {
        conversation: {
          entities: [],
          context: {
            appl_action: '',
            default_counter: 0,
            volumeonoff: 'off',
            musiconoff: 'off',
            system: {
              branch_exited_reason: 'completed',
              dialog_request_counter: 6,
              branch_exited: true,
              dialog_turn_counter: 6,
              dialog_stack: [
                {
                  dialog_node: 'root'
                }
              ],
              _node_output_map: {
                'Start And Initialize Context': [0, 0]
              }
            },
            heateronoff: 'off',
            AConoff: 'off',
            wipersonoff: 'off',
            conversation_id: '1a8ca013-ecce-4d50-a59e-f2c7495d4e6d',
            lightonoff: 'off'
          },
          intents: [
            {
              intent: 'greetings',
              confidence: 1
            }
          ],
          output: {
            text: ['Hello! What can I help you with?'],
            nodes_visited: ['node_7_1468608329601'],
            log_messages: []
          },
          input: {
            text: 'hi'
          }
        }
      }
    };

    const failedMultiPostResponse = {
      postResponses: [
        {
          failedInvocation: {
            name: 'OpenWhiskError',
            message: 'POST https://xxx/api/v1/namespaces/xxx/actions/deployname_postsequence?blocking=true Returned HTTP 400 (Bad Request) --> "Action returned with status code 400, message: Bad Request"',
            error: {
              duration: 648,
              name: 'psequence_postsequence',
              subject: 'xxx',
              activationId: 'ee7b6ad0eccd4bbbbb6ad0eccd4bbb96',
              publish: false,
              annotations: [
                {
                  key: 'topmost',
                  value: true
                },
                {
                  key: 'path',
                  value: 'xxx_xxx/psequence_postsequence'
                },
                {
                  key: 'kind',
                  value: 'sequence'
                },
                {
                  key: 'limits',
                  value: {
                    timeout: 60000,
                    memory: 256,
                    logs: 10
                  }
                }
              ],
              version: '0.0.1',
              response: {
                result: {
                  error: 'Action returned with status code 400, message: Bad Request'
                },
                success: false,
                status: 'application error'
              },
              end: 1516297990239,
              logs: [
                'fa2b88566e3d4577ab88566e3d6577b5',
                'c5218eff74ec472aa18eff74ecb72a57'
              ],
              start: 1516297989553,
              namespace: 'xxx_xxx'
            },
            statusCode: 400
          }
        }
      ]
    };

    const mock = nock(`${mockCloudFunctionsEndpoints.url}`)
      .post(mockCloudFunctionsEndpoints.actionsEndpoint)
      .reply(400, failedPost);

    return mockMultiplePost.main(multiPostParams).then(
      result => {
        if (!mock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server did not get called.');
        }
        assert.deepEqual(result, failedMultiPostResponse);
      },
      error => {
        assert(false, error);
      }
    );
  });
});
