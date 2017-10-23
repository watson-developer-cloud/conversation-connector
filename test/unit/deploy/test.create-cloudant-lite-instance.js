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
 * Unit tests for deploy endpoints, creating a Cloudant Lite instance.
 */

const assert = require('assert');
const nock = require('nock');

const deployCreateCloudantInstanceAction = require('./../../../deploy/create-cloudant-lite-instance.js');
const resourceCfPayloads = require('./../../resources/payloads/test.unit.deploy.cf-endpoint-payloads.json');

const apiHost = 'https://api.ng.bluemix.net';

const mockError = 'mock-error';
const errorNoOrganization = 'Could not find an organization with name: sampleorganization.';
const errorNoSpace = 'Could not find a space with name: samplespace.';
const errorNoCloudantService = 'Could not find a service with name: cloudantNoSQLDB.';
const errorNoServicePlan = 'Could not find a plan with name: cloudant-lite.';
const errorServiceLimit = 'Number of Bluemix instances exceeded limit.';

const sampleAccessToken = 'sample-access-token';
const sampleRefreshToken = 'sample-refresh-token';
const orgId = resourceCfPayloads.get_organization_id.resources[0].metadata.guid;
const serviceId = resourceCfPayloads.get_service_id.resources[0].metadata.guid;

const instanceUrl = resourceCfPayloads.get_instance_key_url.resources[
  0
].entity.credentials.url;

describe('Create Cloudant Lite Instance Unit Tests', () => {
  let mock;
  let params;
  const expectedResult = {
    code: 200,
    message: { url: instanceUrl }
  };

  before(() => {
    nock.disableNetConnect();
  });

  beforeEach(() => {
    params = {
      access_token: sampleAccessToken,
      refresh_token: sampleRefreshToken,
      namespace: 'sampleorganization_samplespace'
    };

    mock = createBluemixApiMock();
  });

  it('validate main works', () => {
    return deployCreateCloudantInstanceAction(params)
      .then(result => {
        assert.deepEqual(result, expectedResult);
      })
      .catch(error => {
        assert(false, error);
      });
  });

  it('validate error when not enough input parameters', () => {
    delete params.access_token;

    return deployCreateCloudantInstanceAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, {
          code: 400,
          message: 'No access token provided.'
        });
      });
  });

  it('validate cloudant service gets created', () => {
    const interceptor = nock(apiHost).get('/v2/service_instances');
    nock.removeInterceptor(interceptor);

    mock
      .get('/v2/service_instances')
      .query(true)
      .reply(200, JSON.stringify(resourceCfPayloads.get_bad_resource));

    return deployCreateCloudantInstanceAction(params)
      .then(result => {
        assert.deepEqual(result, expectedResult);
      })
      .catch(error => {
        assert(false, error.message);
      });
  });

  it('validate cloudant service key get created', () => {
    const interceptor = nock(apiHost).get('/v2/service_keys');
    nock.removeInterceptor(interceptor);

    mock
      .get('/v2/service_keys')
      .query(true)
      .reply(200, JSON.stringify(resourceCfPayloads.get_bad_resource));

    return deployCreateCloudantInstanceAction(params)
      .then(result => {
        assert.deepEqual(result, expectedResult);
      })
      .catch(error => {
        assert(false, error.message);
      });
  });

  it('validate error when create cloudant service throws error', () => {
    let interceptor;
    interceptor = nock(apiHost).get('/v2/service_instances');
    nock.removeInterceptor(interceptor);
    interceptor = nock(apiHost).post('/v2/service_instances');
    nock.removeInterceptor(interceptor);

    mock
      .get('/v2/service_instances')
      .query(true)
      .reply(200, JSON.stringify(resourceCfPayloads.get_bad_resource))
      .post('/v2/service_instances', {
        name: /.*/g,
        service_plan_guid: /.*/g,
        space_guid: /.*/g
      })
      .reply(400, JSON.stringify({ error_code: mockError }));

    return deployCreateCloudantInstanceAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, { code: 400, message: mockError });
      });
  });

  it('validate error when create cloudant instance key throws error', () => {
    let interceptor;
    interceptor = nock(apiHost).get('/v2/service_keys');
    nock.removeInterceptor(interceptor);
    interceptor = nock(apiHost).post('/v2/service_keys');
    nock.removeInterceptor(interceptor);

    mock
      .get('/v2/service_keys')
      .query(true)
      .reply(200, JSON.stringify(resourceCfPayloads.get_bad_resource))
      .post('/v2/service_keys', {
        name: /.*/g,
        service_instance_guid: /.*/g
      })
      .reply(400, JSON.stringify({ error_code: mockError }));

    return deployCreateCloudantInstanceAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, { code: 400, message: mockError });
      });
  });

  it('validate error when no matching organzation id', () => {
    const interceptor = nock(apiHost).get('/v2/organizations');
    nock.removeInterceptor(interceptor);

    mock
      .get('/v2/organizations')
      .reply(200, JSON.stringify(resourceCfPayloads.get_bad_resource));

    return deployCreateCloudantInstanceAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, { code: 400, message: errorNoOrganization });
      });
  });

  it('validate error when no matching space id', () => {
    const interceptor = nock(apiHost).get(`/v2/organizations/${orgId}/spaces`);
    nock.removeInterceptor(interceptor);

    mock
      .get(`/v2/organizations/${orgId}/spaces`)
      .query(true)
      .reply(200, JSON.stringify(resourceCfPayloads.get_bad_resource));

    return deployCreateCloudantInstanceAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, { code: 400, message: errorNoSpace });
      });
  });

  it('validate error when no matching service id', () => {
    const interceptor = nock(apiHost).get('/v2/services');
    nock.removeInterceptor(interceptor);

    mock
      .get('/v2/services')
      .query(true)
      .reply(200, JSON.stringify(resourceCfPayloads.get_bad_resource));

    return deployCreateCloudantInstanceAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, { code: 400, message: errorNoCloudantService });
      });
  });

  it('validate error when no matching service plan id', () => {
    const interceptor = nock(apiHost).get(
      `/v2/services/${serviceId}/service_plans`
    );
    nock.removeInterceptor(interceptor);

    mock
      .get(`/v2/services/${serviceId}/service_plans`)
      .query(true)
      .reply(200, JSON.stringify(resourceCfPayloads.get_bad_resource));

    return deployCreateCloudantInstanceAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, { code: 400, message: errorNoServicePlan });
      });
  });

  it('validate generic error for get request', () => {
    const interceptor = nock(apiHost).get('/v2/organizations');
    nock.removeInterceptor(interceptor);

    mock.get('/v2/organizations').replyWithError(mockError);

    return deployCreateCloudantInstanceAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, { code: 400, message: mockError });
      });
  });

  it('validate generic error for non-get request (create instance)', () => {
    let interceptor = nock(apiHost).get('/v2/service_instances');
    nock.removeInterceptor(interceptor);
    interceptor = nock(apiHost).post('/v2/service_instances');
    nock.removeInterceptor(interceptor);

    mock
      .get('/v2/service_instances')
      .query(true)
      .reply(200, JSON.stringify(resourceCfPayloads.get_bad_resource))
      .post('/v2/service_instances', {
        name: /.*/g,
        service_plan_guid: /.*/g,
        space_guid: /.*/g
      })
      .replyWithError(mockError);

    return deployCreateCloudantInstanceAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, { code: 400, message: mockError });
      });
  }).retries(4);

  it('validate generic error for non-get request (create instance key)', () => {
    let interceptor;
    interceptor = nock(apiHost).get('/v2/service_keys');
    nock.removeInterceptor(interceptor);
    interceptor = nock(apiHost).post('/v2/service_keys');
    nock.removeInterceptor(interceptor);

    mock
      .get('/v2/service_keys')
      .query(true)
      .reply(200, JSON.stringify(resourceCfPayloads.get_bad_resource))
      .post('/v2/service_keys', {
        name: /.*/g,
        service_instance_guid: /.*/g
      })
      .replyWithError(mockError);

    return deployCreateCloudantInstanceAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, { code: 400, message: mockError });
      });
  });

  it('validate error when get request returns response error', () => {
    const interceptor = nock(apiHost).get('/v2/organizations');
    nock.removeInterceptor(interceptor);

    mock
      .get('/v2/organizations')
      .reply(400, JSON.stringify({ error_code: mockError }));

    return deployCreateCloudantInstanceAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, { code: 400, message: mockError });
      });
  });

  it(
    'validate error when create instance throws service limit exceeded error',
    () => {
      const errorServiceLimitExceeded = 'CF-ServiceInstanceQuotaExceeded';

      let interceptor = nock(apiHost).get('/v2/service_instances');
      nock.removeInterceptor(interceptor);
      interceptor = nock(apiHost).post('/v2/service_instances');
      nock.removeInterceptor(interceptor);

      mock
        .get('/v2/service_instances')
        .query(true)
        .reply(200, JSON.stringify(resourceCfPayloads.get_bad_resource))
        .post('/v2/service_instances', {
          name: /.*/g,
          service_plan_guid: /.*/g,
          space_guid: /.*/g
        })
        .reply(200, JSON.stringify({ error_code: errorServiceLimitExceeded }));

      return deployCreateCloudantInstanceAction(params)
        .then(() => {
          assert(false, 'Action succeeded unexpectedly.');
        })
        .catch(error => {
          assert.deepEqual(error, { code: 400, message: errorServiceLimit });
        });
    }
  ).retries(4);

  it('validate error when create instance throws misc error', () => {
    let interceptor;
    interceptor = nock(apiHost).get('/v2/service_instances');
    nock.removeInterceptor(interceptor);
    interceptor = nock(apiHost).post('/v2/service_instances');
    nock.removeInterceptor(interceptor);

    mock
      .get('/v2/service_instances')
      .query(true)
      .reply(200, JSON.stringify(resourceCfPayloads.get_bad_resource))
      .post('/v2/service_instances', {
        name: /.*/g,
        service_plan_guid: /.*/g,
        space_guid: /.*/g
      })
      .reply(200, JSON.stringify({ error_code: mockError }));

    return deployCreateCloudantInstanceAction(params)
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
    nock.enableNetConnect();
  });

  function createBluemixApiMock() {
    return (
      nock(apiHost)
        .persist()
        // get organization id
        .get('/v2/organizations')
        .reply(200, JSON.stringify(resourceCfPayloads.get_organization_id))
        // get space id
        .get(`/v2/organizations/${orgId}/spaces`)
        .query(true)
        .reply(200, JSON.stringify(resourceCfPayloads.get_space_id))
        // get cloudant service
        .get('/v2/services')
        .query(true)
        .reply(200, JSON.stringify(resourceCfPayloads.get_service_id))
        // get cloudant lite service plan
        .get(`/v2/services/${serviceId}/service_plans`)
        .query(true)
        .reply(200, JSON.stringify(resourceCfPayloads.get_service_plan_id))
        // get cloudant service instance
        .get('/v2/service_instances')
        .query(true)
        .reply(200, JSON.stringify(resourceCfPayloads.get_instance_id))
        // get cloudant instance key url
        .get('/v2/service_keys')
        .query(true)
        .reply(200, JSON.stringify(resourceCfPayloads.get_instance_key_url))
        // create cloudant service instance
        .post('/v2/service_instances', {
          name: /.*/g,
          service_plan_guid: /.*/g,
          space_guid: /.*/g
        })
        .reply(200, JSON.stringify(resourceCfPayloads.create_cloudant_instance))
        // create cloudant instance key url
        .post('/v2/service_keys', {
          name: /.*/g,
          service_instance_guid: /.*/g
        })
        .reply(
          200,
          JSON.stringify(resourceCfPayloads.create_cloudant_instance_key)
        )
    );
  }
});
