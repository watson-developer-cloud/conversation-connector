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
 *  Facebook channel integration tests
 */
const assert = require('assert');
const openwhisk = require('openwhisk');

const envParams = process.env;

const pipelineName = envParams.__TEST_PIPELINE_NAME;

const facebookWebhook = `${pipelineName}_facebook/receive`;
const facebookSubPipeline = `${pipelineName}_facebook/integration-pipeline`;
const facebookBatchedMessageAction = `${pipelineName}_facebook/batched_messages`;
const activationId = 'xxxxxx';
const actionName = 'yyyyyy';

/** Function allows tests to sleep for certain amount of time
*/
function sleep(time) {
  return new Promise(resolve => {
    return setTimeout(resolve, time);
  });
}

describe('Facebook channel integration tests', () => {
  const ow = openwhisk();
  let facebookTextParams = {};
  let facebookAttachmentParams = {};
  let facebookBatchedMessageParams = {};

  const expectedReceiveResult = {
    text: 200,
    activationId,
    actionName,
    message: `Response code 200 above only tells you that receive action was invoked successfully. However, it does not really say if ${actionName} was invoked successfully. Please use ${activationId} to get more details about this invocation.`
  };

  const expectedPostResult = {
    params: {
      message: {
        text: 'hello, world!'
      },
      recipient: {
        id: envParams.__TEST_FACEBOOK_SENDER_ID
      }
    },
    text: 200,
    url: 'https://graph.facebook.com/v2.6/me/messages'
  };

  const expectedPostAttachmentResult = {
    text: 200,
    url: 'https://graph.facebook.com/v2.6/me/messages',
    params: {
      message: {
        attachment: {
          type: 'template',
          payload: {
            elements: [
              {
                title: 'Welcome to Hogwarts T-Shirt Store',
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
      },
      recipient: {
        id: envParams.__TEST_FACEBOOK_SENDER_ID
      }
    }
  };

  const expectedBatchedResult = {
    failedActionInvocations: [
      {
        errorMessage: `Recipient id: 185643828639058 , Sender id: undefined -- POST https://openwhisk.ng.bluemix.net:443/api/v1/namespaces/${process.env.__OW_NAMESPACE}/actions/testflex_facebook/integration-pipeline?blocking=true Returned HTTP 502 (Bad Gateway) --> "Recepient id not provided."`,
        activationId: ''
      }
    ],
    successfulActionInvocations: [
      {
        successResponse: {
          text: 200,
          params: {
            recipient: {
              id: envParams.__TEST_FACEBOOK_SENDER_ID
            },
            message: { text: 'hi' }
          },
          url: 'https://graph.facebook.com/v2.6/me/messages'
        },
        activationId: ''
      },
      {
        successResponse: {
          text: 200,
          params: {
            recipient: {
              id: envParams.__TEST_FACEBOOK_SENDER_ID
            },
            message: { text: 'hi' }
          },
          url: 'https://graph.facebook.com/v2.6/me/messages'
        },
        activationId: ''
      }
    ]
  };

  beforeEach(done => {
    facebookTextParams = {
      sub_pipeline: facebookSubPipeline,
      batched_messages: facebookBatchedMessageAction,
      __ow_headers: {
        'x-hub-signature': envParams.__TEST_FACEBOOK_X_HUB_SIGNATURE
      },
      object: 'page',
      entry: [
        {
          id: envParams.__TEST_FACEBOOK_RECIPIENT_ID,
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
                text: 'hello, world!'
              }
            }
          ]
        }
      ]
    };

    facebookAttachmentParams = {
      sub_pipeline: facebookSubPipeline,
      batched_messages: facebookBatchedMessageAction,
      __ow_headers: {
        'x-hub-signature': 'sha1=c7fdff60a002338e23a1ac0ac47c746691bd07d5'
      },
      object: 'page',
      entry: [
        {
          id: envParams.__TEST_FACEBOOK_RECIPIENT_ID,
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
                attachment: {
                  type: 'template',
                  payload: {
                    elements: [
                      {
                        title: 'Welcome to Hogwarts T-Shirt Store',
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
              }
            }
          ]
        }
      ]
    };

    facebookBatchedMessageParams = {
      sub_pipeline: facebookSubPipeline,
      batched_messages: facebookBatchedMessageAction,
      __ow_headers: {
        'x-hub-signature': 'sha1=3bcbbbd11ad8ef728dba5d9d903e55abdea24738'
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
                text: 'hi'
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
                text: 'hi'
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
                text: 'hi'
              }
            }
          ]
        }
      ]
    };

    return done();
  });

  it('validate facebook channel package works for text messages', done => {
    ow.actions
      .invoke({
        name: facebookWebhook,
        params: facebookTextParams,
        blocking: true,
        result: true
      })
      .then(
        success => {
          try {
            const modifiedExpectedResult = Object.assign(
              {},
              expectedReceiveResult
            );
            // Modify the expected response to incorporate the action name as it's
            // picked up dynamically depending upon type of incoming params
            modifiedExpectedResult.actionName = facebookSubPipeline;
            modifiedExpectedResult.message = modifiedExpectedResult.message.replace(
              actionName,
              facebookSubPipeline
            );
            // Modify the expected response to incorporate the dynamically generated
            // activation ids
            modifiedExpectedResult.activationId = success.activationId;
            modifiedExpectedResult.message = modifiedExpectedResult.message.replace(
              activationId,
              success.activationId
            );
            assert.deepEqual(success, modifiedExpectedResult);

            // Return the activation id of the subpipeline invocation
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
        // Sleep for 10s to ensure the activation has been created
        sleep(10000).then(() => {
          // Invoke the subpipeline activation
          ow.activations
            .get({
              activationId: successActivationId
            })
            .then(
              result => {
                try {
                  if (result.response.result) {
                    assert.deepEqual(
                      result.response.result,
                      expectedPostResult
                    );
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

  it('validate facebook channel package works for attachments', done => {
    ow.actions
      .invoke({
        name: facebookWebhook,
        params: facebookAttachmentParams,
        blocking: true,
        result: true
      })
      .then(
        success => {
          try {
            const modifiedExpectedResult = Object.assign(
              {},
              expectedReceiveResult
            );
            // Modify the expected response to incorporate the action name as it's
            // picked up dynamically depending upon type of incoming params
            modifiedExpectedResult.actionName = facebookSubPipeline;
            modifiedExpectedResult.message = modifiedExpectedResult.message.replace(
              actionName,
              facebookSubPipeline
            );
            // Modify the expected response to incorporate the dynamically generated
            // activation ids
            modifiedExpectedResult.activationId = success.activationId;
            modifiedExpectedResult.message = modifiedExpectedResult.message.replace(
              activationId,
              success.activationId
            );
            assert.deepEqual(success, modifiedExpectedResult);

            // Return the activation id of the subpipeline invocation
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
        // Sleep for 10s to ensure the activation has been created
        sleep(10000).then(() => {
          // Invoke the subpipeline activation
          ow.activations
            .get({
              activationId: successActivationId,
              bocking: true
            })
            .then(
              result => {
                try {
                  if (result.response.result) {
                    assert.deepEqual(
                      result.response.result,
                      expectedPostAttachmentResult
                    );
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
    .retries(1);

  it('validate facebook channel package works for batched Messages', done => {
    ow.actions
      .invoke({
        name: facebookWebhook,
        params: facebookBatchedMessageParams,
        blocking: true,
        result: true
      })
      .then(
        success => {
          try {
            const modifiedExpectedResult = Object.assign(
              {},
              expectedReceiveResult
            );
            // Modify the expected response to incorporate the action name as it's
            // picked up dynamically depending upon type of incoming params
            modifiedExpectedResult.actionName = facebookBatchedMessageAction;
            modifiedExpectedResult.message = modifiedExpectedResult.message.replace(
              actionName,
              facebookBatchedMessageAction
            );
            // Modify the expected response to incorporate the dynamically generated
            // activation ids
            modifiedExpectedResult.activationId = success.activationId;
            modifiedExpectedResult.message = modifiedExpectedResult.message.replace(
              activationId,
              success.activationId
            );
            assert.deepEqual(success, modifiedExpectedResult);
            // Return the activation id of the batched messages action invocation
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
        // Sleep for 10s to ensure the activation has been created
        sleep(10000).then(() => {
          // Invoke the batched messages action activation
          ow.activations
            .get({
              activationId: successActivationId,
              bocking: true
            })
            .then(
              result => {
                try {
                  const res = result.response.result;
                  if (res) {
                    expectedBatchedResult.successfulActionInvocations[
                      0
                    ].activationId = res.successfulActionInvocations[
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
    .retries(1);
});
