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
