'use strict';

/**
 *  Facebook channel integration tests
 */
const assert = require('assert');
const openwhisk = require('openwhisk');
const facebookBindings = require('./../../../resources/facebook-bindings.json').facebook;

const facebookWebhook = 'facebook/receive';
const facebookSubPipeline = 'facebook/integration-pipeline';

describe('Facebook channel integration tests', () => {
  const ow = openwhisk();
  let facebookTextParams = {};
  let facebookAttachmentParams = {};
  let facebookBatchedMessageParams = {};

  const expectedTextMsgResult = {
    text: 200,
    failedActionInvocations: [],
    successfulActionInvocations: [
      {
        activationId: '',
        successResponse: {
          params: {
            message: {
              text: 'hello, world!'
            },
            recipient: {
              id: facebookBindings.sender.id
            }
          },
          text: 200,
          url: 'https://graph.facebook.com/v2.6/me/messages'
        }
      }
    ]
  };

  const expectedAttachmentResult = {
    text: 200,
    failedActionInvocations: [],
    successfulActionInvocations: [
      {
        activationId: '',
        successResponse: {
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
              id: facebookBindings.sender.id
            }
          },
          text: 200,
          url: 'https://graph.facebook.com/v2.6/me/messages'
        }
      }
    ]
  };

  const expectedBatchedResult = {
    text: 200,
    failedActionInvocations: [
      {
        errorMessage: 'Recipient id: 185643828639058 , Sender id: undefined -- Action invocation failed, API returned error code. Check syntax errors? Recepient id not provided.',
        activationId: ''
      }
    ],
    successfulActionInvocations: [
      {
        successResponse: {
          text: 200,
          params: {
            recipient: facebookBindings.sender,
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
            recipient: facebookBindings.sender,
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
      __ow_headers: {
        'x-hub-signature': facebookBindings['x-hub-signature']
      },
      verification_token: facebookBindings.verification_token,
      app_secret: facebookBindings.app_secret,
      page_access_token: facebookBindings.page_access_token,
      object: 'page',
      entry: [
        {
          id: facebookBindings.recipient.id,
          time: 1458692752478,
          messaging: [
            {
              sender: facebookBindings.sender,
              recipient: facebookBindings.recipient,
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
      __ow_headers: {
        'x-hub-signature': 'sha1=eb4412b17e32da9656bb3e3551094d531438b6da'
      },
      verification_token: facebookBindings.verification_token,
      app_secret: facebookBindings.app_secret,
      page_access_token: facebookBindings.page_access_token,
      object: 'page',
      entry: [
        {
          id: facebookBindings.recipient.id,
          time: 1458692752478,
          messaging: [
            {
              sender: facebookBindings.sender,
              recipient: facebookBindings.recipient,
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
      __ow_headers: {
        'x-hub-signature': 'sha1=3bcbbbd11ad8ef728dba5d9d903e55abdea24738'
      },
      verification_token: facebookBindings.verification_token,
      app_secret: facebookBindings.app_secret,
      object: 'page',
      entry: [
        {
          id: facebookBindings.recipient.id,
          time: 1458692752478,
          messaging: [
            {
              sender: '12345',
              recipient: facebookBindings.recipient,
              timestamp: 1458692752467,
              message: {
                text: 'hi'
              }
            },
            {
              sender: facebookBindings.sender,
              recipient: facebookBindings.recipient,
              timestamp: 1458692752468,
              message: {
                text: 'hi'
              }
            }
          ]
        },
        {
          id: facebookBindings.recipient.id,
          time: 1458692752489,
          messaging: [
            {
              sender: facebookBindings.sender,
              recipient: facebookBindings.recipient,
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
            expectedTextMsgResult.successfulActionInvocations[
              0
            ].activationId = success.successfulActionInvocations[
              0
            ].activationId;
            assert.deepEqual(success, expectedTextMsgResult);
            return done();
          } catch (e) {
            return done(e);
          }
        },
        error => {
          return done(error);
        }
      );
  })
    .timeout(8000)
    .retries(4);

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
            expectedAttachmentResult.successfulActionInvocations[
              0
            ].activationId = success.successfulActionInvocations[
              0
            ].activationId;
            assert.deepEqual(success, expectedAttachmentResult);
            return done();
          } catch (e) {
            return done(e);
          }
        },
        error => {
          return done(error);
        }
      );
  })
    .timeout(8000)
    .retries(4);

  it('validate facebook channel package works for batched messages', done => {
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
            expectedBatchedResult.successfulActionInvocations[
              0
            ].activationId = success.successfulActionInvocations[
              0
            ].activationId;
            expectedBatchedResult.successfulActionInvocations[
              1
            ].activationId = success.successfulActionInvocations[
              1
            ].activationId;
            expectedBatchedResult.failedActionInvocations[
              0
            ].activationId = success.failedActionInvocations[0].activationId;
            assert.deepEqual(success, expectedBatchedResult);
            return done();
          } catch (e) {
            return done(e);
          }
        },
        error => {
          return done(error);
        }
      );
  })
    .timeout(8000)
    .retries(4);
});
