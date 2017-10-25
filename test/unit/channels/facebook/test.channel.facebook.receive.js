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
 *  Facebook channel receive action unit tests.
 */

const openwhisk = require('openwhisk');
const assert = require('assert');

const nock = require('nock');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const envParams = process.env;

process.env.__OW_ACTION_NAME = `/${envParams.__OW_NAMESPACE}/pipeline_pkg/action-to-test`;

const apiHost = envParams.__OW_API_HOST;
const apiKey = envParams.__OW_API_KEY;
const namespace = envParams.__OW_NAMESPACE;
const packageName = envParams.__OW_ACTION_NAME.split('/')[2];

const facebookCloudFunctionsResources = require('./../../../resources/payloads/test.unit.facebook.receive.json');

const facebookReceive = require('./../../../../channels/facebook/receive/index.js');

const errorNoXHubSignature = 'x-hub-signature header not found.';
const errorVerificationXHubSignature = 'Verfication of facebook signature header failed. Please make sure you are passing the correct app secret';
const errorNeitherVerificationNorMessageTypeRequest = {
  status: 400,
  text: 'Neither a page type request nor a verfication type request detected'
};
const errorNoSubpipelineName = "Subpipeline name does not exist. Please make sure your Cloud Functions channel package has the binding 'sub_pipeline'";
const errorNoBatchedMessageActionName = "Batched Messages action name does not exist. Please make sure your Cloud Functions channel package has the binding 'batched_messages'";
const errorNoSubpiplineInNamespace = {
  text: 400,
  actionName: 'facebook-connector-pipeline',
  message: 'There was an issue invoking facebook-connector-pipeline. Please make sure this action exists in your namespace'
};

describe('Facebook Receive Unit Tests', () => {
  let challengeParams = {};
  let challengeResult = {};
  let messageParams = {};
  let messageSuccessfulResult = {};
  let mockCloudFunctionsEndpoints = {};
  let batchedMessageParams = {};
  let batchedMessageSuccessResult = {};
  let cloudFunctionsStub;
  let mockFacebookReceive;
  let auth;
  let actionName;

  const cloudantUrl = 'https://some-cloudant-url.com';
  const cloudantAuthDbName = 'abc';
  const cloudantAuthKey = '123';

  const subPipelineActionName = 'facebook-connector-pipeline';
  const batchedMessageActionName = 'batched_messages';

  const cloudFunctionsUrl = `https://${apiHost}/api/v1/namespaces`;
  const expectedCloudFunctions = {
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
    cloudFunctionsStub = sinon.stub().returns(
      openwhisk({
        apihost: apiHost,
        api_key: apiKey,
        namespace
      })
    );

    mockFacebookReceive = proxyquire(
      './../../../../channels/facebook/receive/index.js',
      { openwhisk: cloudFunctionsStub }
    );

    mockCloudFunctionsEndpoints = {
      url: cloudFunctionsUrl,
      actionsEndpoint: `/${namespace}/actions/${actionName}`
    };

    messageParams = {
      __ow_headers: {
        'x-hub-signature': envParams.__TEST_FACEBOOK_X_HUB_SIGNATURE
      },
      verification_token: envParams.__TEST_FACEBOOK_VERIFICATION_TOKEN,
      app_secret: envParams.__TEST_FACEBOOK_APP_SECRET,
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
      ],
      sub_pipeline: subPipelineActionName,
      batched_messages: batchedMessageActionName
    };

    messageSuccessfulResult = {
      text: 200,
      activationId: '2747c146f7e34f97b6cb1183f53xxxxx',
      actionName: subPipelineActionName,
      message: 'Response code 200 above only tells you that receive action was invoked successfully. However, it does not really say if facebook-connector-pipeline was invoked successfully. Please use 2747c146f7e34f97b6cb1183f53xxxxx to get more details about this invocation.'
    };

    batchedMessageParams = {
      sub_pipeline: subPipelineActionName,
      batched_messages: batchedMessageActionName,
      __ow_headers: {
        'x-hub-signature': 'sha1=3bcbbbd11ad8ef728dba5d9d903e55abdea24738'
      },
      verification_token: envParams.__TEST_FACEBOOK_VERIFICATION_TOKEN,
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

    batchedMessageSuccessResult = {
      text: 200,
      activationId: '2747c146f7e34f97b6cb1183f53xxxxx',
      actionName: 'batched_messages',
      message: 'Response code 200 above only tells you that receive action was invoked successfully. However, it does not really say if batched_messages was invoked successfully. Please use 2747c146f7e34f97b6cb1183f53xxxxx to get more details about this invocation.'
    };

    challengeParams = {
      sub_pipeline: 'facebook-connector-pipeline',
      batched_messages: 'batched_messages',
      'hub.mode': 'subscribe',
      'hub.verify_token': envParams.__TEST_FACEBOOK_VERIFICATION_TOKEN,
      'hub.challenge': 'challenge_token'
    };

    challengeResult = {
      text: 'challenge_token'
    };

    auth = {
      facebook: {
        app_secret: envParams.__TEST_FACEBOOK_APP_SECRET,
        verification_token: envParams.__TEST_FACEBOOK_VERIFICATION_TOKEN,
        page_access_token: envParams.__TEST_FACEBOOK_PAGE_ACCESS_TOKEN
      }
    };
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('validate facebook/receive passes on challenge', () => {
    const mockCloudFunctions = nock(cloudFunctionsUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedCloudFunctions);

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
        if (!mockCloudFunctions.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloud Functions Get server did not get called.');
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
    mockCloudFunctionsEndpoints.actionsEndpoint = `/${namespace}/actions/${subPipelineActionName}`;

    nock(`${mockCloudFunctionsEndpoints.url}`)
      .post(mockCloudFunctionsEndpoints.actionsEndpoint)
      .reply(201, facebookCloudFunctionsResources.owSuccessResponse);

    const mockCloudFunctions = nock(cloudFunctionsUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedCloudFunctions);

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
        if (!mockCloudFunctions.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloud Functions Get server did not get called.');
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
    mockCloudFunctionsEndpoints.actionsEndpoint = `/${namespace}/actions/${batchedMessageActionName}`;

    nock(`${mockCloudFunctionsEndpoints.url}`)
      .post(mockCloudFunctionsEndpoints.actionsEndpoint)
      .reply(201, facebookCloudFunctionsResources.owSuccessResponse)
      .post(mockCloudFunctionsEndpoints.actionsEndpoint)
      .reply(201, facebookCloudFunctionsResources.owSuccessResponse)
      .post(mockCloudFunctionsEndpoints.actionsEndpoint)
      .reply(201, facebookCloudFunctionsResources.owSuccessResponse);

    const mockCloudFunctions = nock(cloudFunctionsUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedCloudFunctions);

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
        if (!mockCloudFunctions.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloud Functions Get server did not get called.');
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

    const mockCloudFunctions = nock(cloudFunctionsUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedCloudFunctions);

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
        if (!mockCloudFunctions.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloud Functions Get server did not get called.');
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

    const mockCloudFunctions = nock(cloudFunctionsUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedCloudFunctions);

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
        if (!mockCloudFunctions.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloud Functions Get server did not get called.');
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

    const mockCloudFunctions = nock(cloudFunctionsUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedCloudFunctions);

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
        if (!mockCloudFunctions.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloud Functions Get server did not get called.');
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

    const mockCloudFunctions = nock(cloudFunctionsUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedCloudFunctions);

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
        if (!mockCloudFunctions.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloud Functions Get server did not get called.');
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

    const mockCloudFunctions = nock(cloudFunctionsUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedCloudFunctions);

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
        if (!mockCloudFunctions.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloud Functions Get server did not get called.');
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

  it('validate that the sub_pipeline does not exist in Cloud Functions namespace', () => {
    mockCloudFunctionsEndpoints.actionsEndpoint = `/${namespace}/actions/abc`;

    nock(`${mockCloudFunctionsEndpoints.url}`)
      .post(mockCloudFunctionsEndpoints.actionsEndpoint)
      .reply(400, '');

    const mockCloudFunctions = nock(cloudFunctionsUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedCloudFunctions);

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
        if (!mockCloudFunctions.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloud Functions Get server did not get called.');
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
