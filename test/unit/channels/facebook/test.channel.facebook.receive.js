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
const errorNoSubpipelineName = "Subpipeline name does not exist. Please make sure your openwhisk channel package has the binding 'sub_pipeline'";
const errorNoBatchedMessageActionName = "Batched Messages action name does not exist. Please make sure your openwhisk channel package has the binding 'batched_messages'";
const errorNoSubpiplineInNamespace = {
  text: 400,
  actionName: 'facebook-flexible-pipeline',
  message: 'There was an issue invoking facebook-flexible-pipeline. Please make sure this action exists in your namespace'
};

describe('Facebook Receive Unit Tests', () => {
  let challengeParams = {};
  let challengeResult = {};
  let messageParams = {};
  let messageSuccessfulResult = {};
  let mockOpenwhiskEndpoints = {};
  let batchedMessageParams = {};
  let batchedMessageSuccessResult = {};
  let openwhiskStub;
  let mockFacebookReceive;
  let auth;
  let actionName;

  const cloudantUrl = 'https://some-cloudant-url.com';
  const cloudantAuthDbName = 'abc';
  const cloudantAuthKey = '123';

  const apiHost = process.env.__OW_API_HOST;
  const apiKey = process.env.__OW_API_KEY;
  const namespace = process.env.__OW_NAMESPACE;
  const packageName = process.env.__OW_ACTION_NAME.split('/')[2];

  const subPipelineActionName = 'facebook-flexible-pipeline';
  const batchedMessageActionName = 'batched_messages';

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
      actionsEndpoint: `/${namespace}/actions/${actionName}`
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
      sub_pipeline: subPipelineActionName,
      batched_messages: batchedMessageActionName
    };

    messageSuccessfulResult = {
      text: 200,
      activationId: '2747c146f7e34f97b6cb1183f53xxxxx',
      actionName: subPipelineActionName,
      message: 'Response code 200 above only tells you that receive action was invoked successfully. However, it does not really say if facebook-flexible-pipeline was invoked successfully. Please use 2747c146f7e34f97b6cb1183f53xxxxx to get more details about this invocation.'
    };

    batchedMessageParams = {
      sub_pipeline: subPipelineActionName,
      batched_messages: batchedMessageActionName,
      __ow_headers: {
        'x-hub-signature': 'sha1=3bcbbbd11ad8ef728dba5d9d903e55abdea24738'
      },
      verification_token: facebookBindings.verification_token,
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
      activationId: '2747c146f7e34f97b6cb1183f53xxxxx',
      actionName: 'batched_messages',
      message: 'Response code 200 above only tells you that receive action was invoked successfully. However, it does not really say if batched_messages was invoked successfully. Please use 2747c146f7e34f97b6cb1183f53xxxxx to get more details about this invocation.'
    };

    challengeParams = {
      sub_pipeline: 'facebook-flexible-pipeline',
      batched_messages: 'batched_messages',
      'hub.mode': 'subscribe',
      'hub.verify_token': facebookBindings.verification_token,
      'hub.challenge': 'challenge_token'
    };

    challengeResult = {
      text: 'challenge_token'
    };

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
    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);

    return facebookReceive.main(challengeParams).then(
      result => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        nock.cleanAll();
        assert.deepEqual(challengeResult, result);
      },
      error => {
        nock.cleanAll();
        assert(false, error);
      }
    );
  });

  it('validate facebook/receive receives a legit message request', () => {
    mockOpenwhiskEndpoints.actionsEndpoint = `/${namespace}/actions/${subPipelineActionName}`;

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
        nock.cleanAll();
        assert.deepEqual(result, messageSuccessfulResult);
      },
      error => {
        nock.cleanAll();
        assert(false, error);
      }
    );
  });

  it('validate facebook/receive receives a legit batched message request', () => {
    mockOpenwhiskEndpoints.actionsEndpoint = `/${namespace}/actions/${batchedMessageActionName}`;

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
        nock.cleanAll();
        assert.deepEqual(result, batchedMessageSuccessResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate error when no verification signature header', () => {
    delete messageParams.__ow_headers['x-hub-signature'];

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
      () => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        nock.cleanAll();
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        nock.cleanAll();
        assert.equal(error, errorNoXHubSignature);
      }
    );
  });

  it('validate error when verification of x-hub-signature fails', () => {
    auth.facebook.app_secret = '123';

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
      () => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        nock.cleanAll();
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        nock.cleanAll();
        assert.equal(error, errorVerificationXHubSignature);
      }
    );
  });

  it('validate error when bad verification token', () => {
    auth.facebook.verification_token = '123';

    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);

    return mockFacebookReceive.main(challengeParams).then(
      () => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        nock.cleanAll();
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        nock.cleanAll();
        assert.deepEqual(error, errorNeitherVerificationNorMessageTypeRequest);
      }
    );
  });

  it('validate error when challenge header hub.mode is not equal to subscribe', () => {
    challengeParams['hub.mode'] = 'something_else';

    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);

    return mockFacebookReceive.main(challengeParams).then(
      () => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        nock.cleanAll();
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        nock.cleanAll();
        assert.deepEqual(error, errorNeitherVerificationNorMessageTypeRequest);
      }
    );
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

    return mockFacebookReceive.main(messageParams).then(
      () => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        nock.cleanAll();
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        nock.cleanAll();
        assert.deepEqual(error, errorNeitherVerificationNorMessageTypeRequest);
      }
    );
  });

  it('validate error when sub_pipeline name is not a part of facebook package bindings', () => {
    delete messageParams.sub_pipeline;

    return mockFacebookReceive.main(messageParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.deepEqual(error, errorNoSubpipelineName);
      }
    );
  });

  it('validate error when batched_messages name is not a part of facebook package bindings', () => {
    delete batchedMessageParams.batched_messages;

    return mockFacebookReceive.main(batchedMessageParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.deepEqual(error, errorNoBatchedMessageActionName);
      }
    );
  });

  it('validate that the sub_pipeline does not exist in openwhisk namespace', () => {
    mockOpenwhiskEndpoints.actionsEndpoint = `/${namespace}/actions/abc`;

    nock(`${mockOpenwhiskEndpoints.url}`)
      .post(mockOpenwhiskEndpoints.actionsEndpoint)
      .reply(400, '');

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
      () => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        nock.cleanAll();
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        nock.cleanAll();
        assert.deepEqual(error, errorNoSubpiplineInNamespace);
      }
    );
  });
});
