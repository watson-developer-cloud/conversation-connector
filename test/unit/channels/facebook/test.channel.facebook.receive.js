'use strict';

/**
 *  Facebook channel receive action unit tests.
 */

const openwhisk = require('openwhisk');
const assert = require('assert');
const nock = require('nock');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const facebookBindings = require('./../../../resources/facebook-bindings.json').facebook;
const facebookOpenwhiskResources = require('./../../../resources/test.unit.facebook.receive.json');
const facebookReceive = require('./../../../../channels/facebook/receive/index.js');

const errorNoVerificationToken = 'No verification token provided.';
const errorNoAppSecret = 'No app secret provided.';
const errorNoXHubSignature = 'x-hub-signature header not found.';
const errorVerificationXHubSignature = 'Verfication of facebook signature header failed. Please make sure you are passing the correct app secret';
const errorNeitherVerificationNorMessageTypeRequest = {
  status: 400,
  text: 'Neither a page type request nor a verfication type request detected'
};

describe('Facebook Receive Unit Tests', () => {
  let challengeParams = {};
  let challengeResult = {};
  let messageParams = {};
  let messageSuccessfulResult = {};
  let mockOpenwhiskEndpoints = {};
  let batchedMessageParams = {};
  let batchedMessageSuccessResult = {};
  let batchedMessageFailedResult = {};
  let openwhiskStub;
  let mockFacebookReceive;

  beforeEach(() => {
    openwhiskStub = sinon.stub().returns(
      openwhisk({
        apihost: 'https://ibm.com:80',
        api_key: '123-456',
        namespace: 'bluemixOrg_bluemixSpace'
      })
    );

    mockFacebookReceive = proxyquire(
      './../../../../channels/facebook/receive/index.js',
      { openwhisk: openwhiskStub }
    );

    mockOpenwhiskEndpoints = {
      url: 'https://ibm.com',
      port: '80',
      actionsEndpoint: '/api/v1/namespaces/bluemixOrg_bluemixSpace/actions/facebook-flexible-pipeline?blocking=true'
    };

    messageParams = {
      __ow_headers: {
        'x-hub-signature': facebookBindings['x-hub-signature']
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
              sender: facebookBindings.sender,
              recipient: facebookBindings.recipient,
              message: {
                text: 'hello, world!'
              }
            }
          ]
        }
      ],
      sub_pipeline: 'facebook-flexible-pipeline'
    };

    messageSuccessfulResult = {
      text: 200,
      failedActionInvocations: [],
      successfulActionInvocations: [
        {
          activationId: '2747c146f7e34f97b6cb1183f53xxxxx',
          successResponse: {
            params: {
              message: {
                text: "Hello! I'm doing good. I'm here to help you. Just say the word."
              },
              page_id: facebookBindings.recipient.id,
              recipient: {
                id: facebookBindings.sender.id
              },
              workspace_id: '08e17ca1-5b33-487a-83c9-xxxxxxxxxx'
            },
            text: 200,
            url: 'https://graph.facebook.com/v2.6/me/messages'
          }
        }
      ]
    };

    batchedMessageParams = {
      sub_pipeline: 'facebook-flexible-pipeline',
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

    batchedMessageSuccessResult = {
      text: 200,
      failedActionInvocations: [],
      successfulActionInvocations: [
        messageSuccessfulResult.successfulActionInvocations[0],
        messageSuccessfulResult.successfulActionInvocations[0],
        messageSuccessfulResult.successfulActionInvocations[0]
      ]
    };

    batchedMessageFailedResult = {
      text: 200,
      failedActionInvocations: [
        {
          activationId: '46a8fcba2c274db296f3e5602c6xxxxx',
          errorMessage: 'Recipient id: 185643828639058 , Sender id: 1481847138543615 -- POST https://ibm.com:80/api/v1/namespaces/bluemixOrg_bluemixSpace/actions/facebook-flexible-pipeline Returned HTTP 400 (Bad Request) --> "Action returned with status code 400, message: Bad Request"'
        }
      ],
      successfulActionInvocations: [
        messageSuccessfulResult.successfulActionInvocations[0],
        messageSuccessfulResult.successfulActionInvocations[0]
      ]
    };

    challengeParams = {
      verification_token: facebookBindings.verification_token,
      app_secret: facebookBindings.app_secret,
      'hub.mode': 'subscribe',
      'hub.verify_token': facebookBindings.verification_token,
      'hub.challenge': 'challenge_token'
    };

    challengeResult = { text: 'challenge_token' };
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('validate facebook/receive passes on challenge', () => {
    return facebookReceive(challengeParams).then(
      challengeMessage => {
        assert.deepEqual(challengeMessage, challengeResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate facebook/receive receives a legit message request', () => {
    nock(`${mockOpenwhiskEndpoints.url}:${mockOpenwhiskEndpoints.port}`)
      .post(mockOpenwhiskEndpoints.actionsEndpoint)
      .reply(201, facebookOpenwhiskResources.owSuccessResponse);

    return mockFacebookReceive(messageParams).then(
      result => {
        assert.deepEqual(result, messageSuccessfulResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate facebook/receive receives a legit batched message request', () => {
    nock(`${mockOpenwhiskEndpoints.url}:${mockOpenwhiskEndpoints.port}`)
      .post(mockOpenwhiskEndpoints.actionsEndpoint)
      .reply(201, facebookOpenwhiskResources.owSuccessResponse)
      .post(mockOpenwhiskEndpoints.actionsEndpoint)
      .reply(201, facebookOpenwhiskResources.owSuccessResponse)
      .post(mockOpenwhiskEndpoints.actionsEndpoint)
      .reply(201, facebookOpenwhiskResources.owSuccessResponse);

    return mockFacebookReceive(batchedMessageParams).then(
      result => {
        assert.deepEqual(result, batchedMessageSuccessResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate facebook/receive fails for certain batched messages', () => {
    nock(`${mockOpenwhiskEndpoints.url}:${mockOpenwhiskEndpoints.port}`)
      .post(mockOpenwhiskEndpoints.actionsEndpoint)
      .reply(201, facebookOpenwhiskResources.owSuccessResponse)
      .post(mockOpenwhiskEndpoints.actionsEndpoint)
      .reply(201, facebookOpenwhiskResources.owSuccessResponse)
      .post(mockOpenwhiskEndpoints.actionsEndpoint)
      .reply(400, facebookOpenwhiskResources.owFailureResponse.error);

    return mockFacebookReceive(batchedMessageParams).then(
      result => {
        assert.deepEqual(result, batchedMessageFailedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate error when no verification token', () => {
    delete messageParams.verification_token;

    return facebookReceive(messageParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoVerificationToken);
      }
    );
  });

  it('validate error when no app secret', () => {
    delete messageParams.app_secret;

    return facebookReceive(messageParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoAppSecret);
      }
    );
  });

  it('validate error when no verification signature header', () => {
    delete messageParams.__ow_headers['x-hub-signature'];

    return facebookReceive(messageParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoXHubSignature);
      }
    );
  });

  it('validate error when verification of x-hub-signature fails', () => {
    messageParams.app_secret = '123';

    return facebookReceive(messageParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorVerificationXHubSignature);
      }
    );
  });

  it('validate error when bad verification token', () => {
    challengeParams.verification_token = '123';

    return facebookReceive(challengeParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.deepEqual(error, errorNeitherVerificationNorMessageTypeRequest);
      }
    );
  });

  it('validate error when challenge header hub.mode is not equal to subscribe', () => {
    challengeParams['hub.mode'] = 'something_else';

    return facebookReceive(challengeParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.deepEqual(error, errorNeitherVerificationNorMessageTypeRequest);
      }
    );
  });

  it('validate error when message request object is not equal to page', () => {
    messageParams.object = 'something_else';

    return facebookReceive(messageParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.deepEqual(error, errorNeitherVerificationNorMessageTypeRequest);
      }
    );
  });
});
