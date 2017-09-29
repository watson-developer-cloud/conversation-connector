'use strict';

/**
 *  Facebook channel receive action unit tests.
 */

const openwhisk = require('openwhisk');
const assert = require('assert');

const nock = require('nock');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const facebookBindings = require('./../../../resources/bindings/facebook-bindings.json').facebook;
const facebookOpenwhiskResources = require('./../../../resources/payloads/test.unit.facebook.receive.json');

const errorNoSubpipelineName = "Subpipeline name does not exist. Please make sure your openwhisk channel package has the binding 'sub_pipeline'";

describe('Facebook Batched Messages Unit Tests', () => {
  let invocationResults = {};
  let mockOpenwhiskEndpoints = {};
  let batchedMessageParams = {};
  let batchedMessageSuccessResult = {};
  let batchedMessageFailedResult = {};
  let openwhiskStub;
  let mockFacebookBatchedMessages;

  const apiHost = process.env.__OW_API_HOST;
  const apiKey = process.env.__OW_API_KEY;
  const namespace = process.env.__OW_NAMESPACE;

  const owUrl = `https://${apiHost}/api/v1/namespaces`;

  beforeEach(() => {
    openwhiskStub = sinon.stub().returns(
      openwhisk({
        apihost: apiHost,
        api_key: apiKey,
        namespace
      })
    );

    mockFacebookBatchedMessages = proxyquire(
      './../../../../channels/facebook/batched_messages/index.js',
      { openwhisk: openwhiskStub }
    );

    mockOpenwhiskEndpoints = {
      url: owUrl,
      actionsEndpoint: `/${namespace}/actions/facebook-flexible-pipeline?blocking=true`
    };

    invocationResults = {
      failedActionInvocations: [
        {
          activationId: '46a8fcba2c274db296f3e5602c6xxxxx',
          errorMessage: `Recipient id: 185643828639058 , Sender id: 1481847138543615 -- POST https://${apiHost}/api/v1/namespaces/${namespace}/actions/facebook-flexible-pipeline Returned HTTP 400 (Bad Request) --> "Action returned with status code 400, message: Bad Request"`
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
    const mock = nock(`${mockOpenwhiskEndpoints.url}`)
      .post(mockOpenwhiskEndpoints.actionsEndpoint)
      .reply(201, facebookOpenwhiskResources.owSuccessResponse)
      .post(mockOpenwhiskEndpoints.actionsEndpoint)
      .reply(201, facebookOpenwhiskResources.owSuccessResponse)
      .post(mockOpenwhiskEndpoints.actionsEndpoint)
      .reply(201, facebookOpenwhiskResources.owSuccessResponse);

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
    const mock = nock(`${mockOpenwhiskEndpoints.url}`)
      .post(mockOpenwhiskEndpoints.actionsEndpoint)
      .reply(201, facebookOpenwhiskResources.owSuccessResponse)
      .post(mockOpenwhiskEndpoints.actionsEndpoint)
      .reply(201, facebookOpenwhiskResources.owSuccessResponse)
      .post(mockOpenwhiskEndpoints.actionsEndpoint)
      .reply(400, facebookOpenwhiskResources.owFailureResponse.error);

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
