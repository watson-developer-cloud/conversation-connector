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
 * Unit tests for deploy endpoints, creating a Cloudant database.
 */

const assert = require('assert');
const nock = require('nock');

const deployCreateCloudantDbAction = require('./../../../deploy/create-cloudant-database.js');

const sampleUsername = 'sample_username';
const samplePassword = 'sample_password';
const sampleDbName = 'sample_database_name';
const host = `https://${sampleUsername}:${samplePassword}@${sampleUsername}.cloudant.com`;

const mockError = 'mock-error';

describe('Create Cloudant Databade Unit Tests', () => {
  let params;
  let mock;

  beforeEach(() => {
    params = {
      cloudant: {
        username: sampleUsername,
        password: samplePassword
      },
      db_name: sampleDbName
    };

    mock = createCloudantHostMock();
  });

  it('validate main works', () => {
    mock.put(`/${sampleDbName}`).reply(200, { ok: 'true' });

    return deployCreateCloudantDbAction(params)
      .then(result => {
        assert(mock.isDone());
        assert.deepEqual(result, { code: 200, message: 'OK' });
      })
      .catch(error => {
        assert(false, error);
      });
  });

  it('validate error when not enough input parameters', () => {
    delete params.cloudant;

    return deployCreateCloudantDbAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, {
          code: 400,
          message: 'No cloudant object provided.'
        });
      });
  });

  it('validate system works with database already existing', () => {
    mock
      .put(`/${sampleDbName}`)
      .reply(400, JSON.stringify({ error: 'file_exists' }));

    return deployCreateCloudantDbAction(params)
      .then(result => {
        assert(mock.isDone());
        assert.deepEqual(result, { code: 200, message: 'OK' });
      })
      .catch(error => {
        assert(false, error);
      });
  });

  it('validate system works with retries (error object)', () => {
    mock
      .put(`/${sampleDbName}`)
      .replyWithError({ error: 'service_unavailable' })
      .put(`/${sampleDbName}`)
      .reply(200, { ok: 'true' });

    return deployCreateCloudantDbAction(params)
      .then(result => {
        assert(mock.isDone());
        assert.deepEqual(result, { code: 200, message: 'OK' });
      })
      .catch(error => {
        assert(false, error);
      });
  });

  it('validate system works with retries (response object)', () => {
    mock
      .put(`/${sampleDbName}`)
      .reply(500, 'service_unavailable')
      .put(`/${sampleDbName}`)
      .reply(200, { ok: 'true' });

    return deployCreateCloudantDbAction(params)
      .then(result => {
        assert(mock.isDone());
        assert.deepEqual(result, { code: 200, message: 'OK' });
      })
      .catch(error => {
        assert(false, error);
      });
  });

  it('validate error when error is thrown by cloudant (error object)', () => {
    mock.put(`/${sampleDbName}`).replyWithError({ error: mockError });

    return deployCreateCloudantDbAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, { code: 400, message: mockError });
      });
  });

  it('validate error when error is thrown by cloudant (response object)', () => {
    mock
      .put(`/${sampleDbName}`)
      .reply(400, JSON.stringify({ error: mockError }));

    return deployCreateCloudantDbAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, { code: 400, message: mockError });
      });
  });

  function createCloudantHostMock() {
    return nock(host);
  }
});
