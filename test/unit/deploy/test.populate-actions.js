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
 * Unit tests for first deploy endpoints, populating parameters to a second namespace.
 */

const assert = require('assert');
const nock = require('nock');
const pick = require('object.pick');

const deployPopulateActions = require('./../../../deploy/populate-actions.js');
const resourceCfPayloads = require('./../../resources/payloads/test.unit.deploy.cf-endpoint-payloads.json');

const owHost = 'https://openwhisk.ng.bluemix.net';
const apiHost = 'https://api.ng.bluemix.net';

const supplierNamespace = 'supplierorg_supplierspace';
const userNamespace = 'sampleorganization_samplespace';
const realSupplierSpace = process.env.__OW_NAMESPACE;
const conversationGuid = 'sample_conversation_guid';

const mockError = 'mock-error';
const errorNoNamespaceFound = `Could not find user namespace: ${userNamespace}.`;

describe('Populate-Actions Unit Tests', () => {
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
        name: 'sample_deployment_name'
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
    return deployPopulateActions(params)
      .then(result => {
        assert.deepEqual(result, { code: 200, message: 'OK' });
      })
      .catch(error => {
        assert(false, error);
      });
  });

  it('validate error when not enough input parameters', () => {
    delete params.state.auth;

    return deployPopulateActions(params)
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

    return deployPopulateActions(params)
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

    return deployPopulateActions(params)
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

    return deployPopulateActions(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, { code: 400, message: errorNoNamespaceFound });
      });
  });

  it('validate error when transfer wsk actions throws error', () => {
    nock.cleanAll();

    owMock
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
      .reply(400, { error: { error: mockError } })
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
      );

    return deployPopulateActions(params)
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

  it('validate error when get conversation creds throws object error', () => {
    nock.cleanAll();
    owMock = createCloudFunctionsMock();
    bxMock
      .get(`/v2/service_instances/${conversationGuid}/service_keys`)
      .replyWithError(mockError);

    return deployPopulateActions(params)
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

    return deployPopulateActions(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, { code: 400, message: mockError });
      });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  after(() => {
    process.env.__OW_NAMESPACE = realSupplierSpace;
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
        // invoke supplier endpoint actions
        .post(uri => {
          return uri.indexOf(
            `/api/v1/namespaces/${supplierNamespace}/actions`
          ) === 0;
        })
        .query(true)
        .reply(200, createInvocationResult({ code: 200, message: 'OK' }))
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
});
