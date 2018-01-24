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
const openwhisk = require('openwhisk');

const safeExtractErrorMessage = require('./../utils/helper-methods.js').safeExtractErrorMessage;

const msgHelloWorld = 'hello, world!';
const msgHi = 'hi';
const msgTurnOnLights = 'Turn on the lights';
const msgShowMultimedia = 'Display multimedia response';

const carDashboardReplyWelcome = 'Hi. It looks like a nice drive today. What would you like me to do?  ';
const carDashboardReplyLights = "I'll turn on the lights for you.";
const carDashboardReplyHelp = 'Hello! What can I help you with?';

const multimodalReply = 'Here is your multi-modal response.';

const shaMap = {
  'hello, world!': 'sha1=7022aaa4676f7355e712d2427e204ff3f7be0e91',
  hi: 'sha1=3bcbbbd11ad8ef728dba5d9d903e55abdea24738',
  'Turn on the lights': 'sha1=dc7583f847527eccd75defd236e8daa302abb448',
  'Display multimedia response': 'sha=c9f86768a3878fdec6f9c6b0da48ca1b7d47c8a4'
};

const envParams = process.env;

const pipelineName = envParams.__TEST_PIPELINE_NAME;
const recipientId = envParams.__TEST_FACEBOOK_RECIPIENT_ID;

/** Function allows tests to sleep for certain amount of time
*/
function sleep(time) {
  return new Promise(resolve => {
    return setTimeout(resolve, time);
  });
}
/**
 * Facebook prerequisites test suite verifies the Facebook package
 * is properly deployed in Cloud Functions
 */
describe('End-to-End tests: Facebook prerequisites', () => {
  const ow = openwhisk();

  const requiredActions = [
    `${pipelineName}_facebook/post`,
    `${pipelineName}_facebook/receive`,
    `${pipelineName}_facebook/batched_messages`,
    `${pipelineName}_facebook/multiple_post`,
    `${pipelineName}_postsequence`,
    `${pipelineName}_starter-code/normalize-conversation-for-facebook`,
    `${pipelineName}_starter-code/normalize-facebook-for-conversation`
  ];

  requiredActions.forEach(action => {
    it(`${action} action is deployed in Cloud Functions namespace`, () => {
      return ow.actions.get({ name: action }).then(
        () => {},
        error => {
          assert(
            false,
            `${action}, ${safeExtractErrorMessage(error)} Try running setup scripts again.`
          );
        }
      );
    });
  });
});

describe('End-to-End tests: Facebook as channel package', () => {
  const ow = openwhisk();

  const actionFacebookPipeline = 'test-pipeline-facebook';
  const actionFacebookBatchedMessages = `${pipelineName}_facebook/batched_messages`;
  const facebookWebhook = `${pipelineName}_facebook/receive`;
  let params = {};
  const activationId = 'xxxxxxx';

  const expectedReceiveResult = {
    text: 200,
    activationId,
    actionName: actionFacebookPipeline,
    message: `Response code 200 above only tells you that receive action was invoked successfully. However, it does not really say if ${actionFacebookPipeline} was invoked successfully. Please use ${activationId} to get more details about this invocation.`
  };
  const expectedSimpleMultiPostResult = {
    postResponses: {
      successfulPosts: [
        {
          successResponse: {
            params: {
              message: {
                text: carDashboardReplyWelcome
              },
              recipient: {
                id: envParams.__TEST_FACEBOOK_SENDER_ID
              }
            },
            text: 200,
            url: 'https://graph.facebook.com/v2.6/me/messages'
          },
          activationId: 'xxxxx'
        }
      ],
      failedPosts: []
    }
  };

  beforeEach(done => {
    params = {
      sub_pipeline: actionFacebookPipeline,
      batched_messages: actionFacebookBatchedMessages,
      __ow_headers: {
        'x-hub-signature': shaMap[msgHelloWorld]
      },
      object: 'page',
      entry: [
        {
          id: envParams.__TEST_FACEBOOK_SENDER_ID,
          time: 1458692752478,
          messaging: [
            {
              sender: {
                id: envParams.__TEST_FACEBOOK_SENDER_ID
              },
              recipient: {
                id: envParams.__TEST_FACEBOOK_RECIPIENT_ID
              },
              message: {
                text: msgHelloWorld
              }
            }
          ]
        }
      ]
    };
    return done();
  });

  // Under validated circumstances, the channel (mocked parameters here) will send parameters
  // to facebook/receive. The architecture will flow the response to facebook/post, and
  // facebook/post will send its response to this ow.action invocation.
  it('system works under validated circumstances', done => {
    ow.actions
      .invoke({
        name: facebookWebhook,
        params,
        blocking: true,
        result: true
      })
      .then(
        success => {
          try {
            // The expected Result is modified since the activation id is generated
            // dynamically and in order to pass the test, we need to make sure that
            // the activation id is the same.
            const modifiedExpectedResult = Object.assign(
              {},
              expectedReceiveResult
            );
            modifiedExpectedResult.activationId = success.activationId;
            modifiedExpectedResult.message = modifiedExpectedResult.message.replace(
              activationId,
              success.activationId
            );
            assert.deepEqual(success, modifiedExpectedResult);

            // Get activation of the subpipeline invocation
            const successActivationId = success.activationId;
            return successActivationId;
          } catch (e) {
            return done(e);
          }
        },
        error => {
          return done(error);
        }
      )
      .then(successActivationId => {
        // Sleep for 10 seconds to ensure that the activation id
        // has been created
        sleep(20000).then(() => {
          // After the wait, get the response of the activation
          return ow.activations
            .get({
              activationId: successActivationId
            })
            .then(
              result => {
                try {
                  if (result.response.result) {
                    const res = result.response.result;
                    res.postResponses.successfulPosts[
                      0
                    ].activationId = expectedSimpleMultiPostResult.postResponses.successfulPosts[
                      0
                    ].activationId;
                    assert.deepEqual(res, expectedSimpleMultiPostResult);
                    return done();
                  }
                  assert(
                    false,
                    'Cloud Functions Action did not return a reponse'
                  );
                  return done();
                } catch (e) {
                  return done(e);
                }
              },
              error => {
                return done(error);
              }
            )
            .catch(e => {
              return done(e);
            });
        });
      })
      .catch(e => {
        return e;
      });
  })
    .timeout(40000)
    .retries(1);
});

describe('End-to-End tests: Facebook as channel package - for batched messages', () => {
  const ow = openwhisk();
  const actionFacebookPipeline = 'test-pipeline-facebook';
  const actionFacebookBatchedMessages = `${pipelineName}_facebook/batched_messages`;
  const facebookWebhook = `${pipelineName}_facebook/receive`;
  const activationId = 'xxxxxxx';
  let params = {};

  const expectedReceiveResult = {
    text: 200,
    activationId,
    actionName: actionFacebookBatchedMessages,
    message: `Response code 200 above only tells you that receive action was invoked successfully. However, it does not really say if ${actionFacebookBatchedMessages} was invoked successfully. Please use ${activationId} to get more details about this invocation.`
  };

  const expectedBatchedResult = {
    failedActionInvocations: [
      {
        errorMessage: `Recipient id: ${recipientId} , Sender id: undefined -- POST https://openwhisk.ng.bluemix.net:443/api/v1/namespaces/${process.env.__OW_NAMESPACE}/actions/test-pipeline-facebook?blocking=true Returned HTTP 502 (Bad Gateway) --> "No Facebook sender_id found in raw data."`,
        activationId: ''
      }
    ],
    successfulActionInvocations: [
      {
        successResponse: {
          postResponses: {
            successfulPosts: [
              {
                successResponse: {
                  text: 200,
                  params: {
                    recipient: {
                      id: envParams.__TEST_FACEBOOK_SENDER_ID
                    },
                    message: { text: carDashboardReplyWelcome }
                  },
                  url: 'https://graph.facebook.com/v2.6/me/messages'
                },
                activationId: ''
              }
            ],
            failedPosts: []
          }
        },
        activationId: ''
      },
      {
        successResponse: {
          postResponses: {
            successfulPosts: [
              {
                successResponse: {
                  text: 200,
                  params: {
                    recipient: {
                      id: envParams.__TEST_FACEBOOK_SENDER_ID
                    },
                    message: { text: carDashboardReplyWelcome }
                  },
                  url: 'https://graph.facebook.com/v2.6/me/messages'
                },
                activationId: ''
              }
            ],
            failedPosts: []
          }
        },
        activationId: ''
      }
    ]
  };

  beforeEach(() => {
    params = {
      sub_pipeline: actionFacebookPipeline,
      batched_messages: actionFacebookBatchedMessages,
      __ow_headers: {
        'x-hub-signature': shaMap[msgHi]
      },
      object: 'page',
      entry: [
        {
          id: envParams.__TEST_FACEBOOK_RECIPIENT_ID,
          time: 1458692752478,
          messaging: [
            {
              sender: '12345',
              recipient: {
                id: envParams.__TEST_FACEBOOK_RECIPIENT_ID
              },
              timestamp: 1458692752467,
              message: {
                text: msgHi
              }
            },
            {
              sender: {
                id: envParams.__TEST_FACEBOOK_SENDER_ID
              },
              recipient: {
                id: envParams.__TEST_FACEBOOK_RECIPIENT_ID
              },
              timestamp: 1458692752468,
              message: {
                text: msgHi
              }
            }
          ]
        },
        {
          id: envParams.__TEST_FACEBOOK_RECIPIENT_ID,
          time: 1458692752489,
          messaging: [
            {
              sender: {
                id: envParams.__TEST_FACEBOOK_SENDER_ID
              },
              recipient: {
                id: envParams.__TEST_FACEBOOK_RECIPIENT_ID
              },
              timestamp: 1458692752488,
              message: {
                text: msgHi
              }
            }
          ]
        }
      ]
    };
  });

  // Under validated circumstances, the channel (mocked parameters here) will send parameters
  // to facebook/receive. The architecture will flow the response to facebook/post, and
  // facebook/post will send its response to this ow.action invocation.
  it('validate facebook channel package works for batched Messages', done => {
    ow.actions
      .invoke({
        name: facebookWebhook,
        params,
        blocking: true,
        result: true
      })
      .then(
        success => {
          try {
            // The expected Result is modified since the activation id is generated
            // dynamically and in order to pass the test, we need to make sure that
            // the activation id is the same.
            const modifiedExpectedResult = Object.assign(
              {},
              expectedReceiveResult
            );
            modifiedExpectedResult.activationId = success.activationId;
            modifiedExpectedResult.message = modifiedExpectedResult.message.replace(
              activationId,
              success.activationId
            );
            assert.deepEqual(success, modifiedExpectedResult);

            // Get batched messages action invocation id
            const successActivationId = success.activationId;
            return successActivationId;
          } catch (e) {
            return done(e);
          }
        },
        error => {
          return done(error);
        }
      )
      .then(successActivationId => {
        // Sleep for 10 seconds to ensure that the activation id
        // has been created
        sleep(15000).then(() => {
          // After the wait, get the response of the activation
          ow.activations
            .get({
              activationId: successActivationId,
              blocking: true
            })
            .then(
              result => {
                try {
                  const res = result.response.result;
                  if (res) {
                    // Replace the activation ids with dynamically
                    // generated activation ids present in the response
                    expectedBatchedResult.successfulActionInvocations[
                      0
                    ].activationId = res.successfulActionInvocations[
                      0
                    ].activationId;

                    expectedBatchedResult.successfulActionInvocations[
                      0
                    ].successResponse.postResponses.successfulPosts[
                      0
                    ].activationId = res.successfulActionInvocations[
                      0
                    ].successResponse.postResponses.successfulPosts[
                      0
                    ].activationId;

                    expectedBatchedResult.successfulActionInvocations[
                      1
                    ].successResponse.postResponses.successfulPosts[
                      0
                    ].activationId = res.successfulActionInvocations[
                      1
                    ].successResponse.postResponses.successfulPosts[
                      0
                    ].activationId;

                    expectedBatchedResult.successfulActionInvocations[
                      1
                    ].activationId = res.successfulActionInvocations[
                      1
                    ].activationId;
                    expectedBatchedResult.failedActionInvocations[
                      0
                    ].activationId = res.failedActionInvocations[
                      0
                    ].activationId;
                    assert.deepEqual(res, expectedBatchedResult);
                    return done();
                  }
                  assert(
                    false,
                    'Cloud Functions Action did not return a reponse'
                  );
                  return done();
                } catch (e) {
                  return done(e);
                }
              },
              error => {
                return done(error);
              }
            );
        });
      })
      .catch(e => {
        return e;
      });
  })
    .timeout(40000)
    .retries(4);
});

describe('End-to-End tests: Facebook context package works', () => {
  const ow = openwhisk();

  const facebookWebhook = `${pipelineName}_facebook/receive`;
  const contextPipeline = 'test-pipeline-context-facebook';
  let params = {};

  const expAfterTurn1 = {
    postResponses: [
      {
        successfulInvocation: {
          activationId: 'xxxxx',
          successResponse: {
            params: {
              message: {
                text: carDashboardReplyWelcome
              },
              recipient: {
                id: envParams.__TEST_FACEBOOK_SENDER_ID
              }
            },
            text: 200,
            url: 'https://graph.facebook.com/v2.6/me/messages'
          }
        }
      }
    ]
  };

  const expAfterTurn2 = {
    postResponses: [
      {
        successfulInvocation: {
          activationId: 'xxxxx',
          successResponse: {
            params: {
              message: {
                text: carDashboardReplyLights
              },
              recipient: {
                id: envParams.__TEST_FACEBOOK_SENDER_ID
              }
            },
            text: 200,
            url: 'https://graph.facebook.com/v2.6/me/messages'
          }
        }
      }
    ]
  };

  beforeEach(() => {
    params = {
      sub_pipeline: contextPipeline,
      __ow_headers: {
        'x-hub-signature': shaMap[msgHelloWorld]
      },
      object: 'page',
      entry: [
        {
          id: envParams.__TEST_FACEBOOK_SENDER_ID,
          time: 1458692752478,
          messaging: [
            {
              sender: {
                id: envParams.__TEST_FACEBOOK_SENDER_ID
              },
              recipient: {
                id: envParams.__TEST_FACEBOOK_RECIPIENT_ID
              },
              message: {
                text: msgHelloWorld
              }
            }
          ]
        }
      ]
    };
  });

  // Under validated circumstances, context package should load and save context
  // to complete a single-turn conversation successfully.
  it('context pipeline works for single Conversation turn', () => {
    let actId1 = 'xxxxx';
    return ow.actions
      .invoke({
        name: facebookWebhook,
        result: true,
        blocking: true,
        params
      })
      .then(
        success => {
          try {
            // Get activation of the subpipeline invocation
            actId1 = success.activationId;
            return sleep(10000);
          } catch (e) {
            return assert(false, safeExtractErrorMessage(e));
          }
        },
        error => {
          return assert(false, safeExtractErrorMessage(error));
        }
      )
      .then(() => {
        // After the wait, get the response of the activation
        return ow.activations.get({
          activationId: actId1,
          blocking: true
        });
      })
      .then(
        actResult => {
          try {
            if (actResult.response.result) {
              return assert.deepEqual(actResult.response.result, expAfterTurn1);
            }
            return assert(
              false,
              'Cloud Functions Action did not return a reponse'
            );
          } catch (e) {
            return assert(false, safeExtractErrorMessage(e));
          }
        },
        error => {
          return assert(false, safeExtractErrorMessage(error));
        }
      )
      .catch(e => {
        return e;
      });
  }).timeout(40000);

  // Under validated circumstances, context package should load and save context
  // to complete a multi-turn conversation successfully.
  it('context pipeline works for multiple Conversation turns', () => {
    let actId1 = 'xxxxx';
    let actId2 = 'yyyyy';
    expAfterTurn1.postResponses[
      0
    ].successfulInvocation.successResponse.params.message.text = carDashboardReplyHelp;

    return ow.actions
      .invoke({
        name: facebookWebhook,
        result: true,
        blocking: true,
        params
      })
      .then(
        success => {
          try {
            // Get activation of the subpipeline invocation
            actId1 = success.activationId;
            return sleep(10000);
          } catch (e) {
            return assert(false, safeExtractErrorMessage(e));
          }
        },
        error => {
          return assert(false, safeExtractErrorMessage(error));
        }
      )
      .then(() => {
        // After the wait, get the response of the activation
        return ow.activations.get({
          activationId: actId1,
          blocking: true
        });
      })
      .then(
        actResult => {
          try {
            if (actResult.response.result) {
              return assert.deepEqual(actResult.response.result, expAfterTurn1);
            }
            return assert(
              false,
              'Cloud Functions Action did not return a reponse'
            );
          } catch (e) {
            return assert(false, safeExtractErrorMessage(e));
          }
        },
        error => {
          return assert(false, safeExtractErrorMessage(error));
        }
      )
      .then(() => {
        // Change the input text for the second turn.
        params.entry[0].messaging[0].message.text = msgTurnOnLights;
        // Change the signature header value for the second turn.
        params.__ow_headers['x-hub-signature'] = shaMap[msgTurnOnLights];
        // Invoke the context pipeline sequence again.
        // The context package should read the updated context from the previous turn.
        return ow.actions.invoke({
          name: facebookWebhook,
          result: true,
          blocking: true,
          params
        });
      })
      .then(
        success => {
          try {
            // Get activation of the subpipeline invocation
            actId2 = success.activationId;
            return sleep(10000);
          } catch (e) {
            return assert(false, safeExtractErrorMessage(e));
          }
        },
        error => {
          return assert(false, safeExtractErrorMessage(error));
        }
      )
      .then(() => {
        // After the wait, get the response of the activation
        return ow.activations.get({
          activationId: actId2,
          blocking: true
        });
      })
      .then(
        actResult => {
          try {
            if (actResult.response.result) {
              return assert.deepEqual(actResult.response.result, expAfterTurn2);
            }
            return assert(
              false,
              'Cloud Functions Action did not return a reponse'
            );
          } catch (e) {
            return assert(false, safeExtractErrorMessage(e));
          }
        },
        error => {
          return assert(false, safeExtractErrorMessage(error));
        }
      )
      .catch(e => {
        return e;
      });
  }).timeout(60000);
});

describe('End-to-End tests: Multimodal messages work', () => {
  const ow = openwhisk();

  const facebookWebhook = `${pipelineName}_facebook/receive`;
  const contextPipeline = 'test-pipeline-context-facebook';
  let params = {};

  const expAfterTurn1 = {
    params: {
      message: [
        {
          text: multimodalReply
        },
        {
          attachment: {
            payload: {
              url: 'https://s.w-x.co/240x180_twc_default.png'
            },
            type: 'image'
          }
        },
        {
          quick_replies: [
            {
              content_type: 'text',
              payload: 'Location 1',
              title: 'Location 1'
            },
            {
              content_type: 'text',
              payload: 'Location 2',
              title: 'Location 2'
            },
            {
              content_type: 'text',
              payload: 'Location 3',
              title: 'Location 3'
            }
          ],
          text: 'Choose your location'
        }
      ],
      recipient: {
        id: envParams.__TEST_FACEBOOK_SENDER_ID
      }
    },
    text: 200,
    url: 'https://graph.facebook.com/v2.6/me/messages'
  };

  beforeEach(() => {
    params = {
      sub_pipeline: contextPipeline,
      __ow_headers: {
        'x-hub-signature': shaMap[msgShowMultimedia]
      },
      object: 'page',
      entry: [
        {
          id: envParams.__TEST_FACEBOOK_SENDER_ID,
          time: 1458692752478,
          messaging: [
            {
              sender: {
                id: envParams.__TEST_FACEBOOK_SENDER_ID
              },
              recipient: {
                id: envParams.__TEST_FACEBOOK_RECIPIENT_ID
              },
              message: {
                text: msgShowMultimedia
              }
            }
          ]
        }
      ]
    };
  });

  /* Under validated circumstances, starter-code package should correctly handle
  generic multi-media replies from Conversation by translating them
  to Facebook-understandable messages.
  */
  it(
    'validate that generic Conversation responses are properly translated to Facebook format',
    () => {
      let actId1 = 'xxxxx';
      return ow.actions
        .invoke({
          name: facebookWebhook,
          result: true,
          blocking: true,
          params
        })
        .then(
          success => {
            try {
              // Get activation of the subpipeline invocation
              actId1 = success.activationId;
              return sleep(10000);
            } catch (e) {
              return assert(false, safeExtractErrorMessage(e));
            }
          },
          error => {
            return assert(false, safeExtractErrorMessage(error));
          }
        )
        .then(() => {
          // After the wait, get the response of the activation
          return ow.activations.get({
            activationId: actId1,
            blocking: true
          });
        })
        .then(
          actResult => {
            try {
              if (actResult.response.result) {
                const res = actResult.response.result;
                assert(res.raw_input_data && res.raw_output_data); // Must be present.
                // We don't care about the actual values so ignore them for now.
                delete res.raw_input_data;
                delete res.raw_output_data;
                return assert.deepEqual(res, expAfterTurn1);
              }
              return assert(
                false,
                'Cloud Functions Action did not return a reponse'
              );
            } catch (e) {
              return assert(false, safeExtractErrorMessage(e));
            }
          },
          error => {
            return assert(false, safeExtractErrorMessage(error));
          }
        )
        .catch(e => {
          return e;
        });
    }
  ).timeout(60000);
});

describe('End-to-End tests: Facebook as channel package - for multipost messages', () => {
  const ow = openwhisk();
  const actionFacebookPipeline = 'test-pipeline-context-facebook';
  const actionFacebookBatchedMessages = `${pipelineName}_facebook/batched_messages`;
  const facebookWebhook = `${pipelineName}_facebook/receive`;
  const activationId = 'xxxxxxx';
  let params = {};

  const expectedReceiveResult = {
    text: 200,
    activationId,
    actionName: actionFacebookPipeline,
    message: `Response code 200 above only tells you that receive action was invoked successfully. However, it does not really say if ${actionFacebookPipeline} was invoked successfully. Please use ${activationId} to get more details about this invocation.`
  };

  const expectedMultiPostResult = {
    postResponses: {
      successfulPosts: [
        {
          successResponse: {
            text: 200,
            params: {
              recipient: { id: envParams.__TEST_FACEBOOK_SENDER_ID },
              message: { text: 'Here is your multi-modal response.' }
            },
            url: 'https://graph.facebook.com/v2.6/me/messages'
          },
          activationId: ''
        },
        {
          successResponse: {
            text: 200,
            params: {
              recipient: { id: envParams.__TEST_FACEBOOK_SENDER_ID },
              message: {
                attachment: {
                  type: 'image',
                  payload: { url: 'https://s.w-x.co/240x180_twc_default.png' }
                }
              }
            },
            url: 'https://graph.facebook.com/v2.6/me/messages'
          },
          activationId: ''
        },
        {
          successResponse: {
            text: 200,
            params: {
              recipient: { id: envParams.__TEST_FACEBOOK_SENDER_ID },
              message: {
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
            },
            url: 'https://graph.facebook.com/v2.6/me/messages'
          },
          activationId: ''
        }
      ],
      failedPosts: []
    }
  };

  beforeEach(() => {
    params = {
      sub_pipeline: actionFacebookPipeline,
      batched_messages: actionFacebookBatchedMessages,
      __ow_headers: {
        'x-hub-signature': shaMap[msgShowMultimedia]
      },
      object: 'page',
      entry: [
        {
          id: envParams.__TEST_FACEBOOK_SENDER_ID,
          time: 1458692752478,
          messaging: [
            {
              sender: {
                id: envParams.__TEST_FACEBOOK_SENDER_ID
              },
              recipient: {
                id: envParams.__TEST_FACEBOOK_RECIPIENT_ID
              },
              message: {
                text: msgShowMultimedia
              }
            }
          ]
        }
      ]
    };
  });

  // Under validated circumstances, the channel (mocked parameters here) will send parameters
  // to facebook/receive. The architecture will flow the response to facebook/post, and
  // facebook/post will send its response to this ow.action invocation.
  it('validate facebook channel package works for multipost messages', done => {
    ow.actions
      .invoke({
        name: facebookWebhook,
        params,
        blocking: true,
        result: true
      })
      .then(
        success => {
          try {
            // The expected Result is modified since the activation id is generated
            // dynamically and in order to pass the test, we need to make sure that
            // the activation id is the same.
            const modifiedExpectedResult = Object.assign(
              {},
              expectedReceiveResult
            );
            modifiedExpectedResult.activationId = success.activationId;
            modifiedExpectedResult.message = modifiedExpectedResult.message.replace(
              activationId,
              success.activationId
            );
            assert.deepEqual(success, modifiedExpectedResult);

            // Get activation of the subpipleine invocation
            const successActivationId = success.activationId;
            return successActivationId;
          } catch (e) {
            return done(e);
          }
        },
        error => {
          return done(error);
        }
      )
      .then(successActivationId => {
        // Sleep for 10 seconds to ensure that the activation id
        // has been created
        sleep(15000).then(() => {
          // After the wait, get the response of the activation
          ow.activations
            .get({
              activationId: successActivationId,
              blocking: true
            })
            .then(
              result => {
                try {
                  const res = result.response.result;
                  if (res) {
                    // Replace the activation ids with dynamically
                    // generated activation ids present in the response
                    // Update the activation id in the expected result as it is dynamically generated
                    assert.equal(
                      expectedMultiPostResult.postResponses.successfulPosts.length,
                      3
                    );

                    expectedMultiPostResult.postResponses.successfulPosts[
                      0
                    ].activationId = result.response.result.postResponses.successfulPosts[
                      0
                    ].activationId;
                    expectedMultiPostResult.postResponses.successfulPosts[
                      1
                    ].activationId = result.response.result.postResponses.successfulPosts[
                      1
                    ].activationId;
                    expectedMultiPostResult.postResponses.successfulPosts[
                      2
                    ].activationId = result.response.result.postResponses.successfulPosts[
                      2
                    ].activationId;

                    assert.deepEqual(res, expectedMultiPostResult);
                    return done();
                  }
                  assert(
                    false,
                    'Cloud Functions Action did not return a reponse'
                  );
                  return done();
                } catch (e) {
                  return done(e);
                }
              },
              error => {
                return done(error);
              }
            );
        });
      })
      .catch(e => {
        return e;
      });
  })
    .timeout(40000)
    .retries(4);
});
