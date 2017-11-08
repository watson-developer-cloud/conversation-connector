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
 * Unit tests for second deploy endpoint;
 *    populating Slack-specific resources to a second namespace.
 */

const assert = require('assert');
const crypto = require('crypto');
const nock = require('nock');
const pick = require('object.pick');

const owHost = 'https://openwhisk.ng.bluemix.net';
const apiHost = 'https://api.ng.bluemix.net';

const deployVerifySlack = require('./../../../../../deploy/channels/slack/verify-slack.js');
const resourceCfPayloads = require('./../../../../resources/payloads/test.unit.deploy.cf-endpoint-payloads.json');

const supplierNamespace = 'supplierorg_supplierspace';
const userNamespace = 'sampleorganization_samplespace';
const realSupplierSpace = process.env.__OW_NAMESPACE;
const conversationGuid = 'sample_conversation_guid';
const deployName = 'sample-deploy-name';
const slackClientId = 'sample_client_id';
const slackClientSecret = 'sample_client_secret';

const packageContent = {
  annotations: [
    {
      key: 'unused',
      value: 'unused'
    },
    {
      key: 'cloudant_url',
      value: 'https://account:password@account.cloudant.com'
    },
    {
      key: 'cloudant_auth_key',
      value: 'KXXXXXXXXX'
    }
  ]
};

const mockError = 'mock-error';
const errorNoNamespaceFound = `Could not find user namespace: ${userNamespace}.`;

describe('Verify-Slack Unit Tests', () => {
  let params;
  let bxAuthPayload;
  let owMock;
  let bxMock;

  before(() => {
    process.env.__OW_NAMESPACE = supplierNamespace;
  });

  beforeEach(() => {
    params = {
      state: {
        auth: {
          access_token: 'sample_access_token',
          refresh_token: 'sample_refresh_token'
        },
        wsk: {
          namespace: userNamespace
        },
        conversation: {
          guid: conversationGuid,
          workspace_id: 'sample_conversation_workspace'
        },
        slack: {
          client_id: slackClientId,
          client_secret: slackClientSecret,
          verification_token: 'sample_verification_token'
        },
        name: deployName
      }
    };

    bxAuthPayload = {
      subject: 'mockuser@ibm.com',
      developer_guid: 'DXXXXXXXXX',
      namespaces: [
        {
          name: userNamespace,
          uuid: 'sampleuuid',
          key: 'samplekey'
        }
      ]
    };

    owMock = createCloudFunctionsMock();
    bxMock = createBluemixApiMock();
  });

  it('validate main works', () => {
    return deployVerifySlack(params)
      .then(result => {
        assert.deepEqual(result, generateOkResult());
      })
      .catch(error => {
        assert(false, error);
      });
  });

  it('validate error when not enough input parameters', () => {
    delete params.state.auth;

    return deployVerifySlack(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, {
          code: 400,
          message: "Could not get user's Bluemix credentials."
        });
      });
  });

  it('validate error when Cloud Functions host throws object error', () => {
    nock.cleanAll();

    owMock.post('/bluemix/v2/authenticate').replyWithError(mockError);

    return deployVerifySlack(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, { code: 400, message: mockError });
      });
  });

  it('validate error when Cloud Functions host throws response error', () => {
    nock.cleanAll();

    owMock
      .post('/bluemix/v2/authenticate')
      .reply(400, { error: { error: mockError } });

    return deployVerifySlack(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(pick(error, ['code', 'message']), {
          code: 400,
          message: mockError
        });
      });
  });

  it('validate error when Cloud Functions host does not find the correct namespace', () => {
    bxAuthPayload.namespaces[0].name = 'bad_namespace';

    nock.cleanAll();

    owMock.post('/bluemix/v2/authenticate').reply(200, bxAuthPayload);

    return deployVerifySlack(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, { code: 400, message: errorNoNamespaceFound });
      });
  });

  it('validate error when get conversation creds throws object error', () => {
    nock.cleanAll();
    owMock = createCloudFunctionsMock();
    bxMock
      .get(`/v2/service_instances/${conversationGuid}/service_keys`)
      .replyWithError(mockError);

    return deployVerifySlack(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, { code: 400, message: mockError });
      });
  });

  it('validate error when get conversation creds throws response error', () => {
    nock.cleanAll();
    owMock = createCloudFunctionsMock();
    bxMock
      .get(`/v2/service_instances/${conversationGuid}/service_keys`)
      .reply(400, JSON.stringify({ error_code: mockError }));

    return deployVerifySlack(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, { code: 400, message: mockError });
      });
  });

  after(() => {
    process.env.__OW_NAMESPACE = realSupplierSpace;
    nock.cleanAll();
  });

  function createCloudFunctionsMock() {
    return (
      nock(owHost)
        .persist()
        // get Cloud Functions credentials from bx tokens
        .post('/bluemix/v2/authenticate')
        .reply(200, bxAuthPayload)
        // update package for user namespace
        .put(uri => {
          return uri.indexOf(`/api/v1/namespaces/${userNamespace}/packages`) ===
            0;
        })
        .reply(200, {})
        // get action from supplier namespace
        .get(uri => {
          return uri.indexOf(
            `/api/v1/namespaces/${supplierNamespace}/actions`
          ) === 0;
        })
        .reply(200, { exec: { code: 'sample_code' } })
        // update actions to user namespace
        .put(uri => {
          return uri.indexOf(`/api/v1/namespaces/${userNamespace}/actions`) ===
            0;
        })
        .reply(200, {})
        // get action from user namespace (get annotations)
        .get(uri => {
          return uri.indexOf(`/api/v1/namespaces/${userNamespace}/packages`) ===
            0;
        })
        .reply(200, packageContent)
        // get action from user namespace (check pipeline actions)
        .get(uri => {
          return uri.indexOf(`/api/v1/namespaces/${userNamespace}/actions`) ===
            0;
        })
        .reply(200, {})
        // invoke supplier endpoint actions
        .post(uri => {
          return uri.indexOf(
            `/api/v1/namespaces/${supplierNamespace}/actions`
          ) === 0;
        })
        .query(true)
        .reply(
          200,
          createInvocationResult(
            createInvocationResult({ code: 200, message: 'OK' })
          )
        )
    );
  }

  function createBluemixApiMock() {
    return (
      nock(apiHost)
        .persist()
        // get conversation credentials
        .get(`/v2/service_instances/${conversationGuid}/service_keys`)
        .reply(200, JSON.stringify(resourceCfPayloads.get_conversation_creds))
    );
  }

  function createInvocationResult(object, error = false) {
    if (error) {
      return { response: { error: object } };
    }
    return { response: { result: object } };
  }

  function generateOkResult() {
    const redirectUrl = `${owHost}/api/v1/web/${userNamespace}/${deployName}_slack/deploy.http`;
    const requestUrl = `${owHost}/api/v1/web/${userNamespace}/${deployName}_slack/receive.json`;

    const state = JSON.stringify({
      signature: createHmacKey(slackClientId, slackClientSecret),
      redirect_url: redirectUrl
    });
    const authUrl = `/oauth/authorize?client_id=${slackClientId}&scope=bot+chat:write:bot&redirect_uri=${redirectUrl}&state=${state}`;
    const redirAuthUrl = `https://slack.com/signin?redir=${encodeURIComponent(authUrl)}`;

    return {
      code: 200,
      message: 'OK',
      redirect_url: redirectUrl,
      request_url: requestUrl,
      authorize_url: redirAuthUrl
    };

    function createHmacKey(clientId, clientSecret) {
      const hmacKey = `${clientId}&${clientSecret}`;
      return crypto
        .createHmac('sha256', hmacKey)
        .update('authorize')
        .digest('hex');
    }
  }
});
