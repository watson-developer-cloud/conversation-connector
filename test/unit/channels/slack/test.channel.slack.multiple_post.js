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

describe('Slack Multi-post Unit Tests', () => {
  const apiHost = 'xxx';
  const apiKey = 'xxx';
  const namespace = 'xxx';

  let mockCloudFunctionsEndpoints = {};

  const cloudFunctionsUrl = `https://${apiHost}/api/v1/namespaces`;

  const cloudFunctionsStub = sinon.stub().returns(
    openwhisk({
      apihost: apiHost,
      api_key: apiKey,
      namespace
    })
  );

  const mockMultiplePost = proxyquire(
    '../../../../channels/slack/multiple_post/index.js',
    {
      openwhisk: cloudFunctionsStub
    }
  );

  beforeEach(() => {
    process.env.__OW_ACTION_NAME = '/org_space/deployname_postsequence';

    mockCloudFunctionsEndpoints = {
      url: cloudFunctionsUrl,
      actionsEndpoint: `/${namespace}/actions/deployname_postsequence?blocking=true`
    };
  });

  after(() => {
    process.env.__OW_ACTION_NAME = previousTestName;
  });

  it('validate multipost with single message', () => {
    const multiPostParams = {
      raw_input_data: {
        conversation: {
          input: {
            text: 'hi'
          },
          context: {
            conversation_id: 'xxx',
            system: {
              branch_exited_reason: 'completed',
              dialog_request_counter: 4,
              branch_exited: true,
              dialog_turn_counter: 4,
              dialog_stack: [
                {
                  dialog_node: 'root'
                }
              ]
            }
          }
        },
        provider: 'slack',
        auth: {
          conversation: {
            username: 'xxx',
            password: 'xxx',
            workspace_id: 'xxx'
          },
          _revs_info: [
            {
              rev: '2-e2a470f05b05c43208870457ad0f8db8',
              status: 'available'
            },
            {
              rev: '1-d792e5a468d5d351231dcb0968a36a56',
              status: 'available'
            }
          ],
          _id: '23a563c0-05d3-11e8-94cf-73584df37eea',
          slack: {
            client_id: 'xxx',
            client_secret: 'xxx',
            verification_token: 'xxx',
            bot_users: {
              xxx: {
                access_token: 'xxx',
                bot_access_token: 'xxx'
              }
            }
          },
          _rev: '2-e2a470f05b05c43208870457ad0f8db8'
        },
        bot_id: 'xxx',
        slack: {
          team_id: 'xxx',
          event: {
            channel: 'xxx',
            ts: '1517341663.000207',
            text: 'hi',
            event_ts: '1517341663.000207',
            type: 'message',
            user: 'xxx'
          },
          api_app_id: 'xxx',
          authed_users: ['xxx'],
          event_time: 1517341663,
          token: 'xxx',
          type: 'event_callback',
          event_id: 'xxx'
        },
        cloudant_context_key: 'xxx'
      },
      channel: 'xxx',
      url: 'https://slack.com/api/chat.postMessage',
      ts: '1517341663.000207',
      text: 'Hello! What can I help you with?',
      raw_output_data: {
        conversation: {
          entities: [],
          context: {
            conversation_id: 'fcc88abe-fd43-4361-adee-394f639d6d94',
            system: {
              branch_exited_reason: 'completed',
              dialog_request_counter: 5,
              branch_exited: true,
              dialog_turn_counter: 5,
              dialog_stack: [
                {
                  dialog_node: 'root'
                }
              ]
            }
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

    const postResponse = {
      duration: 433,
      name: 'post',
      subject: 'xxx',
      activationId: 'xxx',
      publish: false,
      annotations: [
        { key: 'causedBy', value: 'sequence' },
        { key: 'path', value: 'xxx/slackmulti_slack/post' },
        { key: 'kind', value: 'nodejs:6' },
        { key: 'limits', value: { timeout: 60000, memory: 256, logs: 10 } },
        { key: 'initTime', value: 220 }
      ],
      version: '0.0.4',
      response: {
        result: {
          channel: 'xxx',
          ts: '1517341663.000207',
          text: 'Hello! What can I help you with?',
          token: 'xxx',
          as_user: 'true'
        },
        success: true,
        status: 'success'
      },
      cause: '3456ad53d9e4431f96ad53d9e4131f19',
      end: 1517343090411,
      logs: [],
      start: 1517343089978,
      namespace: 'xxx'
    };

    const multiPostResponse = {
      postResponses: {
        successfulPosts: [
          {
            successResponse: {
              channel: 'xxx',
              ts: '1517341663.000207',
              text: 'Hello! What can I help you with?',
              token: 'xxx',
              as_user: 'true'
            },
            activationId: 'xxx'
          }
        ],
        failedPosts: []
      }
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

  it('validate multipost with empty message array', () => {
    const multiPostParams = {
      raw_input_data: {
        conversation: {
          input: {
            text: 'show me a multimedia response'
          },
          context: {
            conversation_id: 'fcc88abe-fd43-4361-adee-394f639d6d94',
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
                node_18_1484802647885: [0]
              }
            }
          }
        },
        provider: 'slack',
        auth: {
          conversation: {
            username: 'xxx',
            password: 'xxx',
            workspace_id: 'xxx'
          },
          _revs_info: [
            {
              rev: '2-e2a470f05b05c43208870457ad0f8db8',
              status: 'available'
            },
            {
              rev: '1-d792e5a468d5d351231dcb0968a36a56',
              status: 'available'
            }
          ],
          _id: '23a563c0-05d3-11e8-94cf-73584df37eea',
          slack: {
            client_id: 'xxx',
            client_secret: 'xxx',
            verification_token: 'xxx',
            bot_users: {
              xxx: {
                access_token: 'xxx',
                bot_access_token: 'xxx'
              }
            }
          },
          _rev: '2-e2a470f05b05c43208870457ad0f8db8'
        },
        bot_id: 'xxx',
        slack: {
          team_id: 'xxx',
          event: {
            channel: 'xxx',
            ts: '1517348453.000747',
            text: 'show me a multimedia response',
            event_ts: '1517348453.000747',
            type: 'message',
            user: 'xxx'
          },
          api_app_id: 'xxx',
          authed_users: ['xxx'],
          event_time: 1517348453,
          token: 'xxx',
          type: 'event_callback',
          event_id: 'Ev916HGH8S'
        },
        cloudant_context_key: 'xxx'
      },
      channel: 'xxx',
      url: 'https://slack.com/api/chat.postMessage',
      ts: '1517348453.000747',
      message: [],
      raw_output_data: {
        conversation: {
          entities: [],
          context: {
            conversation_id: 'fcc88abe-fd43-4361-adee-394f639d6d94',
            system: {
              branch_exited_reason: 'completed',
              dialog_request_counter: 7,
              branch_exited: true,
              dialog_turn_counter: 7,
              dialog_stack: [
                {
                  dialog_node: 'root'
                }
              ],
              _node_output_map: {
                node_18_1484802647885: [0]
              }
            }
          },
          intents: [
            {
              intent: 'multimodal',
              confidence: 0.8660579204559327
            }
          ],
          output: {
            text: [],
            nodes_visited: ['node_1_1514502764444'],
            generic: [
              {
                response_type: 'connect_to_agent',
                message_to_human_agent: 'Customer needs to know their PUK.',
                topic: 'Find PUK'
              }
            ],
            log_messages: []
          },
          input: {
            text: 'show me a multimedia response'
          }
        }
      }
    };

    const multiPostResponse = {
      postResponses: {
        successfulPosts: [],
        failedPosts: []
      }
    };

    return mockMultiplePost.main(multiPostParams).then(
      result => {
        assert.deepEqual(result, multiPostResponse);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate multipost with arrayed message', () => {
    const multiPostParams = {
      raw_input_data: {
        conversation: {
          input: {
            text: 'show me a multimedia response'
          },
          context: {
            conversation_id: 'fcc88abe-fd43-4361-adee-394f639d6d94',
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
                node_18_1484802647885: [0]
              }
            }
          }
        },
        provider: 'slack',
        auth: {
          conversation: {
            username: 'xxx',
            password: 'xxx',
            workspace_id: 'xxx'
          },
          _revs_info: [
            {
              rev: '2-e2a470f05b05c43208870457ad0f8db8',
              status: 'available'
            },
            {
              rev: '1-d792e5a468d5d351231dcb0968a36a56',
              status: 'available'
            }
          ],
          _id: '23a563c0-05d3-11e8-94cf-73584df37eea',
          slack: {
            client_id: 'xxx',
            client_secret: 'xxx',
            verification_token: 'xxx',
            bot_users: {
              xxx: {
                access_token: 'xxx',
                bot_access_token: 'xxx'
              }
            }
          },
          _rev: '2-e2a470f05b05c43208870457ad0f8db8'
        },
        bot_id: 'xxx',
        slack: {
          team_id: 'xxx',
          event: {
            channel: 'xxx',
            ts: '1517348453.000747',
            text: 'show me a multimedia response',
            event_ts: '1517348453.000747',
            type: 'message',
            user: 'xxx'
          },
          api_app_id: 'xxx',
          authed_users: ['xxx'],
          event_time: 1517348453,
          token: 'xxx',
          type: 'event_callback',
          event_id: 'Ev916HGH8S'
        },
        cloudant_context_key: 'xxx'
      },
      channel: 'xxx',
      url: 'https://slack.com/api/chat.postMessage',
      ts: '1517348453.000747',
      message: [
        {
          response_type: 'pause',
          time: 3000,
          typing: true
        },
        {
          text: 'Here is your multi-modal response.'
        },
        {
          attachments: [
            {
              title: 'Image title',
              pretext: 'Image description',
              image_url: 'https://s.w-x.co/240x180_twc_default.png'
            }
          ]
        },
        {
          response_type: 'pause',
          time: 3000
        },
        {
          attachments: [
            {
              text: 'Choose your location',
              callback_id: 'Choose your location',
              actions: [
                {
                  name: 'Location 1',
                  type: 'button',
                  text: 'Location 1',
                  value: 'Location 1'
                },
                {
                  name: 'Location 2',
                  type: 'button',
                  text: 'Location 2',
                  value: 'Location 2'
                },
                {
                  name: 'Location 3',
                  type: 'button',
                  text: 'Location 3',
                  value: 'Location 3'
                }
              ]
            }
          ]
        }
      ],
      raw_output_data: {
        conversation: {
          entities: [],
          context: {
            conversation_id: 'fcc88abe-fd43-4361-adee-394f639d6d94',
            system: {
              branch_exited_reason: 'completed',
              dialog_request_counter: 7,
              branch_exited: true,
              dialog_turn_counter: 7,
              dialog_stack: [
                {
                  dialog_node: 'root'
                }
              ],
              _node_output_map: {
                node_18_1484802647885: [0]
              }
            }
          },
          intents: [
            {
              intent: 'multimodal',
              confidence: 0.8660579204559327
            }
          ],
          output: {
            text: [],
            nodes_visited: ['node_1_1514502764444'],
            generic: [
              {
                response_type: 'pause',
                time: 3000,
                typing: true
              },
              {
                text: 'Here is your multi-modal response.',
                response_type: 'text'
              },
              {
                title: 'Image title',
                source: 'https://s.w-x.co/240x180_twc_default.png',
                description: 'Image description',
                response_type: 'image'
              },
              {
                response_type: 'pause',
                time: 3000
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
            text: 'show me a multimedia response'
          }
        }
      }
    };

    const postResponse1 = {
      duration: 181,
      name: 'post',
      subject: 'xxx',
      activationId: 'xxx',
      publish: false,
      annotations: [
        { key: 'limits', value: { timeout: 60000, memory: 256, logs: 10 } },
        { key: 'path', value: 'xxx/slackmulti_slack/post' },
        { key: 'kind', value: 'nodejs:6' },
        { key: 'causedBy', value: 'sequence' }
      ],
      version: '0.0.4',
      response: {
        result: {
          channel: 'xxx',
          ts: '1517348453.000747',
          text: 'Here is your multi-modal response.',
          token: 'xxx',
          as_user: 'true'
        },
        success: true,
        status: 'success'
      },
      cause: '2316e24494eb446796e24494ebe467f7',
      end: 1517348456414,
      logs: [],
      start: 1517348456233,
      namespace: 'xxx'
    };

    const postResponse2 = {
      duration: 164,
      name: 'post',
      subject: 'xxx',
      activationId: 'xxx',
      publish: false,
      annotations: [
        { key: 'limits', value: { timeout: 60000, memory: 256, logs: 10 } },
        { key: 'path', value: 'xxx/slackmulti_slack/post' },
        { key: 'kind', value: 'nodejs:6' },
        { key: 'causedBy', value: 'sequence' }
      ],
      version: '0.0.4',
      response: {
        result: {
          channel: 'xxx',
          ts: '1517348453.000747',
          token: 'xxx',
          as_user: 'true',
          attachments: [
            {
              title: 'Image title',
              pretext: 'Image description',
              image_url: 'https://s.w-x.co/240x180_twc_default.png'
            }
          ]
        },
        success: true,
        status: 'success'
      },
      cause: 'a5a701b2b2214a1ca701b2b221aa1c5b',
      end: 1517348456696,
      logs: [],
      start: 1517348456532,
      namespace: 'xxx'
    };

    const postResponse3 = {
      duration: 102,
      name: 'post',
      subject: 'xxx',
      activationId: 'xxx',
      publish: false,
      annotations: [
        { key: 'limits', value: { timeout: 60000, memory: 256, logs: 10 } },
        { key: 'path', value: 'xxx/slackmulti_slack/post' },
        { key: 'kind', value: 'nodejs:6' },
        { key: 'causedBy', value: 'sequence' }
      ],
      version: '0.0.4',
      response: {
        result: {
          channel: 'xxx',
          ts: '1517348453.000747',
          token: 'xxx',
          as_user: 'true',
          attachments: [
            {
              text: 'Choose your location',
              callback_id: 'Choose your location',
              actions: [
                {
                  name: 'Location 1',
                  type: 'button',
                  text: 'Location 1',
                  value: 'Location 1'
                },
                {
                  name: 'Location 2',
                  type: 'button',
                  text: 'Location 2',
                  value: 'Location 2'
                },
                {
                  name: 'Location 3',
                  type: 'button',
                  text: 'Location 3',
                  value: 'Location 3'
                }
              ]
            }
          ]
        },
        success: true,
        status: 'success'
      },
      cause: '9d92de09b2704cb692de09b270acb69a',
      end: 1517348456870,
      logs: [],
      start: 1517348456768,
      namespace: 'xxx'
    };

    const multiPostResponse = {
      postResponses: {
        successfulPosts: [
          {
            successResponse: {
              channel: 'xxx',
              ts: '1517348453.000747',
              text: 'Here is your multi-modal response.',
              token: 'xxx',
              as_user: 'true'
            },
            activationId: 'xxx'
          },
          {
            successResponse: {
              channel: 'xxx',
              ts: '1517348453.000747',
              token: 'xxx',
              as_user: 'true',
              attachments: [
                {
                  title: 'Image title',
                  pretext: 'Image description',
                  image_url: 'https://s.w-x.co/240x180_twc_default.png'
                }
              ]
            },
            activationId: 'xxx'
          },
          {
            successResponse: {
              channel: 'xxx',
              ts: '1517348453.000747',
              token: 'xxx',
              as_user: 'true',
              attachments: [
                {
                  text: 'Choose your location',
                  callback_id: 'Choose your location',
                  actions: [
                    {
                      name: 'Location 1',
                      type: 'button',
                      text: 'Location 1',
                      value: 'Location 1'
                    },
                    {
                      name: 'Location 2',
                      type: 'button',
                      text: 'Location 2',
                      value: 'Location 2'
                    },
                    {
                      name: 'Location 3',
                      type: 'button',
                      text: 'Location 3',
                      value: 'Location 3'
                    }
                  ]
                }
              ]
            },
            activationId: 'xxx'
          }
        ],
        failedPosts: []
      }
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
  }).timeout(7000);

  it('validate multipost simple failure case', () => {
    const failedPost = {
      duration: 648,
      name: 'post',
      subject: 'xxx',
      activationId: 'xxx',
      publish: false,
      annotations: [
        { key: 'limits', value: { timeout: 60000, memory: 256, logs: 10 } },
        { key: 'path', value: 'xxx/slackmulti_slack/post' },
        { key: 'kind', value: 'nodejs:6' },
        { key: 'causedBy', value: 'sequence' }
      ],
      version: '0.0.4',
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
      raw_input_data: {
        conversation: {
          input: {
            text: 'hi'
          },
          context: {
            conversation_id: 'xxx',
            system: {
              branch_exited_reason: 'completed',
              dialog_request_counter: 4,
              branch_exited: true,
              dialog_turn_counter: 4,
              dialog_stack: [
                {
                  dialog_node: 'root'
                }
              ]
            }
          }
        },
        provider: 'slack',
        auth: {
          conversation: {
            username: 'xxx',
            password: 'xxx',
            workspace_id: 'xxx'
          },
          _revs_info: [
            {
              rev: '2-e2a470f05b05c43208870457ad0f8db8',
              status: 'available'
            },
            {
              rev: '1-d792e5a468d5d351231dcb0968a36a56',
              status: 'available'
            }
          ],
          _id: '23a563c0-05d3-11e8-94cf-73584df37eea',
          slack: {
            client_id: 'xxx',
            client_secret: 'xxx',
            verification_token: 'xxx',
            bot_users: {
              xxx: {
                access_token: 'xxx',
                bot_access_token: 'xxx'
              }
            }
          },
          _rev: '2-e2a470f05b05c43208870457ad0f8db8'
        },
        bot_id: 'xxx',
        slack: {
          team_id: 'xxx',
          event: {
            channel: 'xxx',
            ts: '1517341663.000207',
            text: 'hi',
            event_ts: '1517341663.000207',
            type: 'message',
            user: 'xxx'
          },
          api_app_id: 'xxx',
          authed_users: ['xxx'],
          event_time: 1517341663,
          token: 'xxx',
          type: 'event_callback',
          event_id: 'xxx'
        },
        cloudant_context_key: 'xxx'
      },
      channel: 'xxx',
      url: 'https://slack.com/api/chat.postMessage',
      ts: '1517341663.000207',
      text: 'Hello! What can I help you with?',
      raw_output_data: {
        conversation: {
          entities: [],
          context: {
            conversation_id: 'fcc88abe-fd43-4361-adee-394f639d6d94',
            system: {
              branch_exited_reason: 'completed',
              dialog_request_counter: 5,
              branch_exited: true,
              dialog_turn_counter: 5,
              dialog_stack: [
                {
                  dialog_node: 'root'
                }
              ]
            }
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
      postResponses: {
        successfulPosts: [],
        failedPosts: [
          {
            failureResponse: {
              name: 'OpenWhiskError',
              message: 'POST https://xxx/api/v1/namespaces/xxx/actions/deployname_postsequence?blocking=true Returned HTTP 400 (Bad Request) --> "Action returned with status code 400, message: Bad Request"',
              error: {
                duration: 648,
                name: 'post',
                subject: 'xxx',
                activationId: 'xxx',
                publish: false,
                annotations: [
                  {
                    key: 'limits',
                    value: { timeout: 60000, memory: 256, logs: 10 }
                  },
                  { key: 'path', value: 'xxx/slackmulti_slack/post' },
                  { key: 'kind', value: 'nodejs:6' },
                  { key: 'causedBy', value: 'sequence' }
                ],
                version: '0.0.4',
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
      }
    };

    const mock = nock(`${mockCloudFunctionsEndpoints.url}`)
      .post(mockCloudFunctionsEndpoints.actionsEndpoint)
      .reply(400, failedPost);

    return mockMultiplePost.main(multiPostParams).then(
      result => {
        assert(false, result);
      },
      error => {
        if (!mock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server did not get called.');
        }
        assert.deepEqual(error, failedMultiPostResponse);
      }
    );
  });
});
