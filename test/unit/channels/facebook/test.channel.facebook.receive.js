'use strict';

/**
 *  Facebook channel receive action unit tests.
 */

const openwhisk = require('openwhisk');
const assert = require('assert');

const nock = require('nock');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

process.env.__OW_ACTION_NAME = `/${process.env.__OW_NAMESPACE}/pipeline_pkg/action-to-test`;

const facebookBindings = require('./../../../resources/bindings/facebook-bindings.json').facebook;
const facebookOpenwhiskResources = require('./../../../resources/payloads/test.unit.facebook.receive.json');

const facebookReceive = require('./../../../../channels/facebook/receive/index.js');

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
  let func;
  let auth;

  const cloudantUrl = 'https://some-cloudant-url.com';
  const cloudantAuthDbName = 'abc';
  const cloudantAuthKey = '123';

  const apiHost = process.env.__OW_API_HOST;
  const apiKey = process.env.__OW_API_KEY;
  const namespace = process.env.__OW_NAMESPACE;
  const packageName = process.env.__OW_ACTION_NAME.split('/')[2];

  const owUrl = `https://${apiHost}/api/v1/namespaces`;
  const expectedOW = {
    annotations: [
      {
        key: 'cloudant_url',
        value: cloudantUrl
      },
      {
        key: 'cloudant_auth_dbname',
        value: cloudantAuthDbName
      },
      {
        key: 'cloudant_auth_key',
        value: cloudantAuthKey
      }
    ]
  };

  beforeEach(() => {
    openwhiskStub = sinon.stub().returns(
      openwhisk({
        apihost: apiHost,
        api_key: apiKey,
        namespace
      })
    );

    mockFacebookReceive = proxyquire(
      './../../../../channels/facebook/receive/index.js',
      { openwhisk: openwhiskStub }
    );

    mockOpenwhiskEndpoints = {
      url: owUrl,
      actionsEndpoint: `/${namespace}/actions/facebook-flexible-pipeline?blocking=true`
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
          errorMessage: `Recipient id: 185643828639058 , Sender id: 1481847138543615 -- POST https://${apiHost}/api/v1/namespaces/${namespace}/actions/facebook-flexible-pipeline Returned HTTP 400 (Bad Request) --> "Action returned with status code 400, message: Bad Request"`
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

    auth = {
      facebook: {
        app_secret: facebookBindings.app_secret,
        verification_token: facebookBindings.verification_token,
        page_access_token: facebookBindings.page_access_token
      }
    };
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('validate facebook/receive passes on challenge', () => {
    func = facebookReceive.main;

    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);

    return func(challengeParams).then(
      result => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        assert.deepEqual(challengeResult, result);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate facebook/receive receives a legit message request', () => {
    nock(`${mockOpenwhiskEndpoints.url}`)
      .post(mockOpenwhiskEndpoints.actionsEndpoint)
      .reply(201, facebookOpenwhiskResources.owSuccessResponse);

    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);

    return mockFacebookReceive.main(messageParams).then(
      result => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }

        assert.deepEqual(result, messageSuccessfulResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate facebook/receive receives a legit batched message request', () => {
    nock(`${mockOpenwhiskEndpoints.url}`)
      .post(mockOpenwhiskEndpoints.actionsEndpoint)
      .reply(201, facebookOpenwhiskResources.owSuccessResponse)
      .post(mockOpenwhiskEndpoints.actionsEndpoint)
      .reply(201, facebookOpenwhiskResources.owSuccessResponse)
      .post(mockOpenwhiskEndpoints.actionsEndpoint)
      .reply(201, facebookOpenwhiskResources.owSuccessResponse);

    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);

    return mockFacebookReceive.main(batchedMessageParams).then(
      result => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        assert.deepEqual(result, batchedMessageSuccessResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate facebook/receive fails for certain batched messages', () => {
    const mock = nock(`${mockOpenwhiskEndpoints.url}`)
      .post(mockOpenwhiskEndpoints.actionsEndpoint)
      .reply(201, facebookOpenwhiskResources.owSuccessResponse)
      .post(mockOpenwhiskEndpoints.actionsEndpoint)
      .reply(201, facebookOpenwhiskResources.owSuccessResponse)
      .post(mockOpenwhiskEndpoints.actionsEndpoint)
      .reply(400, facebookOpenwhiskResources.owFailureResponse.error);

    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);

    return mockFacebookReceive.main(batchedMessageParams).then(
      result => {
        if (!mock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server did not get called.');
        }
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        assert.deepEqual(result, batchedMessageFailedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate error when no verification signature header', () => {
    delete messageParams.__ow_headers['x-hub-signature'];
    func = facebookReceive.verifyFacebookSignatureHeader;

    try {
      func(messageParams);
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorNoXHubSignature);
    }
  });

  it('validate error when verification of x-hub-signature fails', () => {
    messageParams.__ow_headers['x-hub-signature'] = '123';

    func = facebookReceive.verifyFacebookSignatureHeader;

    try {
      func(messageParams, auth);
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorVerificationXHubSignature);
    }
  });

  it('validate error when challenge header hub.mode is not equal to subscribe', () => {
    challengeParams['hub.mode'] = 'something_else';

    func = facebookReceive.isURLVerificationEvent;

    const res = func(challengeParams);
    assert.equal(false, res);
  });

  it('validate error when message request object is not equal to page', () => {
    messageParams.object = 'something_else';

    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);
    func = facebookReceive.main;

    return func(messageParams).then(
      result => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        assert(false, result);
      },
      error => {
        assert(errorNeitherVerificationNorMessageTypeRequest, error);
      }
    );
  });
});
