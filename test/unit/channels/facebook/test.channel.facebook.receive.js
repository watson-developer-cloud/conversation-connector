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

// The following parameters are set to a dummy value for unit tests
// since the values flowing in through envParams will affect the Facebook
// signature. Setting these to a default ensures test outputs produce the
// same result irrespective of the env variables.
const appSecret = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const recipientId = 'xxxxxxxxxxxxxxx';
const senderId = 'xxxxxxxxxxxxxxxx';

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

  // The following is a mock response sent by the pipeline action
  const facebookCloudFunctionsResources = {
    owSuccessResponse: {
      duration: 2838,
      name: 'facebook-185643828639058-pipeline',
      subject: 'xyz@ibm.com',
      activationId: '2747c146f7e34f97b6cb1183f53xxxxx',
      publish: false,
      annotations: [
        { key: 'topmost', value: true },
        {
          key: 'path',
          value: 'bluemixOrg_bluemixSpace/facebook-185643828639058-pipeline'
        },
        { key: 'kind', value: 'sequence' },
        {
          key: 'limits',
          value: { timeout: 60000, memory: 256, logs: 10 }
        }
      ],
      version: '0.0.73',
      response: {
        result: {
          text: 200,
          params: {
            recipient: { id: senderId },
            page_id: recipientId,
            message: {
              text: "Hello! I'm doing good. I'm here to help you. Just say the word."
            },
            workspace_id: '08e17ca1-5b33-487a-83c9-xxxxxxxxxx'
          },
          url: 'https://graph.facebook.com/v2.6/me/messages'
        },
        success: true,
        status: 'success'
      },
      end: 1503426996862,
      logs: [
        '54430e1301534f9ebe2560a975xxxxxx',
        '5ebec5e8c08c4eff81cce37d1dxxxxxx',
        '30db5311de7b446bae33fa3c72xxxxxx',
        'c2eba4516e2541ccae96d1005exxxxxx',
        '9ba4b24337c54cc694455cf780xxxxxx',
        'd57124ee95334508b3df5e07c9xxxxxx',
        '7510eb4e01ce47f19729aaff04xxxxxx',
        'd6aa36cdcc9f4ffea8fe012054xxxxxx'
      ],
      start: 1503426993595,
      namespace: 'bluemixOrg_bluemixSpace'
    }
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
        'x-hub-signature': 'sha=ea4e385ab7d9511d2dda34b82e57fdbb16e3f75d'
      },
      verification_token: envParams.__TEST_FACEBOOK_VERIFICATION_TOKEN,
      app_secret: appSecret,
      object: 'page',
      entry: [
        {
          id: recipientId,
          time: 1458692752478,
          messaging: [
            {
              sender: {
                id: senderId
              },
              recipient: {
                id: recipientId
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
        'x-hub-signature': 'sha1=a7012d9f2bc141777afc02b28f302978d60c73c7'
      },
      verification_token: envParams.__TEST_FACEBOOK_VERIFICATION_TOKEN,
      object: 'page',
      entry: [
        {
          id: recipientId,
          time: 1458692752478,
          messaging: [
            {
              sender: '12345',
              recipient: {
                id: recipientId
              },
              timestamp: 1458692752467,
              message: {
                text: 'hi'
              }
            },
            {
              sender: {
                id: senderId
              },
              recipient: {
                id: recipientId
              },
              timestamp: 1458692752468,
              message: {
                text: 'hi'
              }
            }
          ]
        },
        {
          id: recipientId,
          time: 1458692752489,
          messaging: [
            {
              sender: {
                id: senderId
              },
              recipient: {
                id: recipientId
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
        app_secret: appSecret,
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

  it('validate appropriate escaping of characters', () => {
    const payload = {
      object: 'page',
      entry: [
        {
          id: 'x',
          time: 1531316946940,
          messaging: [
            {
              sender: { id: 'y' },
              recipient: { id: 'z' },
              timestamp: 1531316946634,
              message: {
                mid: 'tC5r1wf9jgfBMS35kXawBPFF_CSAABSKz_iJoG0xKU7shK3n4isF1blraNkKR1TlnYzd-8S_jxNfpsHxFfjuKQ',
                seq: 1867,
                text: '<@%/äöå'
              }
            }
          ]
        }
      ]
    };

    const expectedPayload = {
      object: 'page',
      entry: [
        {
          id: 'x',
          time: 1531316946940,
          messaging: [
            {
              sender: { id: 'y' },
              recipient: { id: 'z' },
              timestamp: 1531316946634,
              message: {
                mid: 'tC5r1wf9jgfBMS35kXawBPFF_CSAABSKz_iJoG0xKU7shK3n4isF1blraNkKR1TlnYzd-8S_jxNfpsHxFfjuKQ',
                seq: 1867,
                text: '\u003C\u0040\u0025\/\u00e4\u00f6\u00e5' // eslint-disable-line no-useless-escape
              }
            }
          ]
        }
      ]
    };

    const escapedPayload = facebookReceive.escapeSpecialChars(JSON.stringify(payload));

    assert.deepEqual(JSON.parse(escapedPayload), expectedPayload);
  });
});
