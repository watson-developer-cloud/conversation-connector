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

const errorNoSubpipelineName = "Subpipeline name does not exist. Please make sure your Cloud Functions channel package has the binding 'sub_pipeline'";

// The following parameters are set to a dummy value for unit tests
// since the values flowing in through envParams will affect the Facebook
// signature. Setting these to a default ensures test outputs produce the
// same result irrespective of the env variables.
const appSecret = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const recipientId = 'xxxxxxxxxxxxxxx';
const senderId = 'xxxxxxxxxxxxxxxx';

describe('Facebook Batched Messages Unit Tests', () => {
  let invocationResults = {};
  let mockCloudFunctionsEndpoints = {};
  let batchedMessageParams = {};
  let batchedMessageSuccessResult = {};
  let batchedMessageFailedResult = {};
  let CloudFunctionsStub;
  let mockFacebookBatchedMessages;

  const envParams = process.env;

  const apiHost = envParams.__OW_API_HOST;
  const apiKey = envParams.__OW_API_KEY;
  const namespace = envParams.__OW_NAMESPACE;

  const cloudFunctionsUrl = `https://${apiHost}/api/v1/namespaces`;

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
    },
    owFailureResponse: {
      name: 'BaseOperationError',
      message: 'Action invocation failed, API returned error code. Check syntax errors? Action returned with status code 400, message: Bad Request',
      error: {
        duration: 651,
        name: 'facebook-connector-pipeline',
        subject: 'xyz@ibm.com',
        activationId: '46a8fcba2c274db296f3e5602c6xxxxx',
        publish: false,
        annotations: [
          { key: 'topmost', value: true },
          {
            key: 'path',
            value: 'bluemixOrg_bluemixSpace/facebook-connector-pipeline'
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
            error: 'Action returned with status code 400, message: Bad Request'
          },
          success: false,
          status: 'application error'
        },
        end: 1503428120503,
        logs: [
          '2d62dd422176461ab03f45215cxxxxxx',
          'bc17b9f6dfd54a51a80cf1fe48xxxxxx',
          '1d4034e8e9944a908d196bc182xxxxxx',
          '53105abf69fc4e978dd9499d91xxxxxx',
          'cd2c94cfcf4d4722a9f76374b2xxxxxx',
          'cdd064b2ae1547608ab1f95289xxxxxx',
          'fc334eddb5414159a50ae97c45xxxxxx',
          'b9fe26f1e5c34062b3e8135530xxxxxx'
        ],
        start: 1503428119764,
        namespace: 'bluemixOrg_bluemixSpace'
      }
    }
  };
  beforeEach(() => {
    CloudFunctionsStub = sinon.stub().returns(
      openwhisk({
        apihost: apiHost,
        api_key: apiKey,
        namespace
      })
    );

    mockFacebookBatchedMessages = proxyquire(
      './../../../../channels/facebook/batched_messages/index.js',
      { openwhisk: CloudFunctionsStub }
    );

    mockCloudFunctionsEndpoints = {
      url: cloudFunctionsUrl,
      actionsEndpoint: `/${namespace}/actions/facebook-connector-pipeline?blocking=true`
    };

    invocationResults = {
      failedActionInvocations: [
        {
          activationId: '46a8fcba2c274db296f3e5602c6xxxxx',
          errorMessage: `Recipient id: ${recipientId} , Sender id: ${senderId} -- POST https://${apiHost}/api/v1/namespaces/${namespace}/actions/facebook-connector-pipeline?blocking=true Returned HTTP 400 (Bad Request) --> "Action returned with status code 400, message: Bad Request"`
        }
      ],
      successfulActionInvocations: [
        {
          activationId: '2747c146f7e34f97b6cb1183f53xxxxx',
          successResponse: {
            params: {
              message: {
                text: "Hello! I'm doing good. I'm here to help you. Just say the word."
              },
              page_id: recipientId,
              recipient: {
                id: senderId
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
      sub_pipeline: 'facebook-connector-pipeline',
      __ow_headers: {
        'x-hub-signature': 'sha1=01d4a593a537a6b987f0178c0e18531e5b296ef6'
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
      failedActionInvocations: [],
      successfulActionInvocations: [
        invocationResults.successfulActionInvocations[0],
        invocationResults.successfulActionInvocations[0],
        invocationResults.successfulActionInvocations[0]
      ]
    };

    batchedMessageFailedResult = {
      failedActionInvocations: [invocationResults.failedActionInvocations[0]],
      successfulActionInvocations: [
        invocationResults.successfulActionInvocations[0],
        invocationResults.successfulActionInvocations[0]
      ]
    };
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('validate facebook/batched_messages receives a legit batched message request', () => {
    const mock = nock(`${mockCloudFunctionsEndpoints.url}`)
      .post(mockCloudFunctionsEndpoints.actionsEndpoint)
      .reply(201, facebookCloudFunctionsResources.owSuccessResponse)
      .post(mockCloudFunctionsEndpoints.actionsEndpoint)
      .reply(201, facebookCloudFunctionsResources.owSuccessResponse)
      .post(mockCloudFunctionsEndpoints.actionsEndpoint)
      .reply(201, facebookCloudFunctionsResources.owSuccessResponse);

    return mockFacebookBatchedMessages.main(batchedMessageParams).then(
      result => {
        if (!mock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server did not get called.');
        }
        assert.deepEqual(result, batchedMessageSuccessResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate facebook/batched_messages fails for certain batched messages', () => {
    const mock = nock(`${mockCloudFunctionsEndpoints.url}`)
      .post(mockCloudFunctionsEndpoints.actionsEndpoint)
      .reply(201, facebookCloudFunctionsResources.owSuccessResponse)
      .post(mockCloudFunctionsEndpoints.actionsEndpoint)
      .reply(201, facebookCloudFunctionsResources.owSuccessResponse)
      .post(mockCloudFunctionsEndpoints.actionsEndpoint)
      .reply(400, facebookCloudFunctionsResources.owFailureResponse.error);

    return mockFacebookBatchedMessages.main(batchedMessageParams).then(
      result => {
        if (!mock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server did not get called.');
        }
        assert.deepEqual(result, batchedMessageFailedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate error when subpipeline name is not present', () => {
    delete batchedMessageParams.sub_pipeline;
    return mockFacebookBatchedMessages.main(batchedMessageParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoSubpipelineName);
      }
    );
  });
});
