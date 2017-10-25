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
 * Unit tests for deploy endpoints, updating an Auth document
 */

const assert = require('assert');
const nock = require('nock');

const deployUpdateAuthDocAction = require('./../../../deploy/update-auth-document.js');

const sampleUsername = 'sample_username';
const samplePassword = 'sample_password';
const sampleDbName = 'sample_database_name';
const host = `https://${sampleUsername}:${samplePassword}@${sampleUsername}.cloudant.com`;
const sampleAuthKey = 'sample_auth_key';

const mockError = 'mock-error';

describe('Update Auth Document Unit Tests', () => {
  let params;
  let mock;

  beforeEach(() => {
    params = {
      cloudant: {
        username: sampleUsername,
        password: samplePassword
      },
      db_name: sampleDbName,
      pipeline: {
        channel: {
          name: 'slack',
          slack: {
            client_id: 'sample_client_id',
            client_secret: 'sample_client_secret',
            verification_token: 'sample_verification_token'
          }
        },
        conversation: {
          username: 'sample_conv_username',
          password: 'sample_conv_password'
        }
      },
      auth_key: sampleAuthKey
    };

    mock = createCloudantHostMock();
  });

  it('validate main works', () => {
    mock
      .get(`/${sampleDbName}/${sampleAuthKey}`)
      .reply(200, '{}')
      .put(`/${sampleDbName}/${sampleAuthKey}`)
      .reply(200, JSON.stringify({ ok: 'true' }));

    return deployUpdateAuthDocAction(params)
      .then(result => {
        assert.deepEqual(result, { code: 200, message: 'OK' });
      })
      .catch(error => {
        assert(false, error);
      });
  });

  it('validate error when not enough input parameters', () => {
    delete params.cloudant;

    return deployUpdateAuthDocAction(params)
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

  it('validate main works with no channel provided', () => {
    delete params.pipeline.channel;

    mock
      .get(`/${sampleDbName}/${sampleAuthKey}`)
      .reply(200, '{}')
      .put(`/${sampleDbName}/${sampleAuthKey}`)
      .reply(200, JSON.stringify({ ok: 'true' }));

    return deployUpdateAuthDocAction(params)
      .then(result => {
        assert.deepEqual(result, { code: 200, message: 'OK' });
      })
      .catch(error => {
        assert(false, error);
      });
  });

  it('validate system works with load document retries (error object)', () => {
    mock
      .get(`/${sampleDbName}/${sampleAuthKey}`)
      .replyWithError({ error: 'service_unavailable' })
      .get(`/${sampleDbName}/${sampleAuthKey}`)
      .reply(200, '{}')
      .put(`/${sampleDbName}/${sampleAuthKey}`)
      .reply(200, JSON.stringify({ ok: 'true' }));

    return deployUpdateAuthDocAction(params)
      .then(result => {
        assert.deepEqual(result, { code: 200, message: 'OK' });
      })
      .catch(error => {
        assert(false, error);
      });
  });

  it('validate system works with insert document retries (error object)', () => {
    mock
      .get(`/${sampleDbName}/${sampleAuthKey}`)
      .reply(200, '{}')
      .put(`/${sampleDbName}/${sampleAuthKey}`)
      .replyWithError({ error: 'service_unavailable' })
      .put(`/${sampleDbName}/${sampleAuthKey}`)
      .reply(200, JSON.stringify({ ok: 'true' }));

    return deployUpdateAuthDocAction(params)
      .then(result => {
        assert.deepEqual(result, { code: 200, message: 'OK' });
      })
      .catch(error => {
        assert(false, error);
      });
  });

  it('validate system works with load document retries (response object)', () => {
    mock
      .get(`/${sampleDbName}/${sampleAuthKey}`)
      .reply(500, 'service_unavailable')
      .get(`/${sampleDbName}/${sampleAuthKey}`)
      .reply(200, '{}')
      .put(`/${sampleDbName}/${sampleAuthKey}`)
      .reply(200, JSON.stringify({ ok: 'true' }));

    return deployUpdateAuthDocAction(params)
      .then(result => {
        assert.deepEqual(result, { code: 200, message: 'OK' });
      })
      .catch(error => {
        assert(false, error);
      });
  });

  it('validate system works with insert document retries (response object)', () => {
    mock
      .get(`/${sampleDbName}/${sampleAuthKey}`)
      .reply(200, '{}')
      .put(`/${sampleDbName}/${sampleAuthKey}`)
      .reply(500, 'service_unavailable')
      .put(`/${sampleDbName}/${sampleAuthKey}`)
      .reply(200, JSON.stringify({ ok: 'true' }));

    return deployUpdateAuthDocAction(params)
      .then(result => {
        assert.deepEqual(result, { code: 200, message: 'OK' });
      })
      .catch(error => {
        assert(false, error);
      });
  });

  it('validate system works with load document not found', () => {
    mock
      .get(`/${sampleDbName}/${sampleAuthKey}`)
      .reply(404, 'Object Not Found')
      .put(`/${sampleDbName}/${sampleAuthKey}`)
      .reply(200, JSON.stringify({ ok: 'true' }));

    return deployUpdateAuthDocAction(params)
      .then(result => {
        assert.deepEqual(result, { code: 200, message: 'OK' });
      })
      .catch(error => {
        assert(false, error);
      });
  });

  it('validate error when load document error is thrown by cloudant (error object)', () => {
    mock
      .get(`/${sampleDbName}/${sampleAuthKey}`)
      .replyWithError({ error: mockError });

    return deployUpdateAuthDocAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, {
          code: 400,
          message: mockError
        });
      });
  });

  it('validate error when update document error is thrown by cloudant (error object)', () => {
    mock
      .get(`/${sampleDbName}/${sampleAuthKey}`)
      .reply(200, '{}')
      .put(`/${sampleDbName}/${sampleAuthKey}`)
      .replyWithError({ error: mockError });

    return deployUpdateAuthDocAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, {
          code: 400,
          message: mockError
        });
      });
  });

  it('validate error when load document error is thrown by cloudant (response object)', () => {
    mock
      .get(`/${sampleDbName}/${sampleAuthKey}`)
      .reply(400, JSON.stringify({ error: mockError }));

    return deployUpdateAuthDocAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, {
          code: 400,
          message: mockError
        });
      });
  });

  it('validate error when update document error is thrown by cloudant (response object)', () => {
    mock
      .get(`/${sampleDbName}/${sampleAuthKey}`)
      .reply(200, '{}')
      .put(`/${sampleDbName}/${sampleAuthKey}`)
      .reply(400, JSON.stringify({ error: mockError }));

    return deployUpdateAuthDocAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, {
          code: 400,
          message: mockError
        });
      });
  });

  function createCloudantHostMock() {
    return nock(host);
  }
});
