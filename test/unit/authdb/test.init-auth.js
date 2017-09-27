'use strict';

/**
 * Tests all functions used by actions that need to load auth.
 */

const assert = require('assert');
const nock = require('nock');
const Cloudant = require('cloudant');

const scInitAuth = require('./../../../init-auth.js');

const errorBadCloudantUrl = 'invalid url';
const errorFromCloudant = 'server down';

describe('Init Auth Unit tests', () => {
  const cloudantUrl = 'https://some-cloudant-url.com';
  const cloudantAuthDbName = 'abc';
  const cloudantAuthKey = '123';

  it('should have a saveAuth function', () => {
    assert(scInitAuth.saveAuth, 'saveAuth function not found.');
  });

  it('should have a createCloudantObj function', () => {
    assert(
      scInitAuth.createCloudantObj,
      'createCloudantObj function not found.'
    );
  });

  it('should have a retrieveDoc function', () => {
    assert(scInitAuth.retrieveDoc, 'retrieveDoc function not found.');
  });

  it('should have a insertDoc function', () => {
    assert(scInitAuth.insertDoc, 'insertDoc function not found.');
  });

  it('createCloudantObj(): should throw error when supplied with an improper url', () => {
    const func = scInitAuth.createCloudantObj;

    return func('bad_url').then(
      response => {
        assert(false, response);
      },
      e => {
        assert.deepEqual(e.message, errorBadCloudantUrl);
      }
    );
  });

  it('retrieveDoc(): should return an empty JSON when doc absent.', () => {
    const cloudant = Cloudant({
      url: cloudantUrl,
      plugin: 'retry',
      retryAttempts: 5,
      retryTimeout: 1000
    });
    const db = cloudant.use(cloudantAuthDbName);

    const expected = {};

    const mock = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(404, { error: 'not_found', reason: 'missing' });

    const func = scInitAuth.retrieveDoc;
    return func(db, cloudantAuthKey)
      .then(response => {
        if (!mock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server did not get called.');
        }
        nock.cleanAll();
        assert.deepEqual(response, expected);
      })
      .catch(e => {
        assert(false, e);
      });
  });

  it('retrieveDoc(): should retrieve the auth document.', () => {
    const cloudant = Cloudant({
      url: cloudantUrl,
      plugin: 'retry',
      retryAttempts: 5,
      retryTimeout: 1000
    });
    const db = cloudant.use(cloudantAuthDbName);

    const expected = {
      facebook: {
        app_secret: 'xxxxx',
        page_access_token: 'xxxxx',
        verification_token: 'a1b2c3'
      },
      slack: {
        client_id: 'xxxxx',
        client_secret: 'xxxxxx',
        verification_token: 'xxxxxx'
      },
      conversation: {
        password: 'xxxxxxx',
        username: 'xxxxxxxxx',
        workspace_id: 'xxxxxxxxx'
      }
    };

    const mock = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, expected);

    const func = scInitAuth.retrieveDoc;
    return func(db, cloudantAuthKey)
      .then(response => {
        if (!mock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server did not get called.');
        }
        nock.cleanAll();
        assert.deepEqual(response, expected);
      })
      .catch(e => {
        assert(false, e);
      });
  });

  it('should reject when Cloudant returns other than 200 or 404.', () => {
    const cloudant = Cloudant({
      url: cloudantUrl,
      plugin: 'retry',
      retryAttempts: 5,
      retryTimeout: 1000
    });
    const db = cloudant.use(cloudantAuthDbName);

    const mock = nock(cloudantUrl)
      .put(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(500, { name: 'CloudantError', message: errorFromCloudant });

    const func = scInitAuth.insertDoc;
    return func(db, cloudantAuthKey)
      .then(response => {
        assert(false, response);
      })
      .catch(e => {
        if (!mock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server did not get called.');
        }
        nock.cleanAll();
        assert.equal(e.name, 'CloudantError');
        assert.equal(e.message, errorFromCloudant);
      });
  });

  it('saveAuth(): should return error when a non-404 returned from Cloudant', () => {
    const params = {
      cloudant_url: 'https://some-cloudant-url.com',
      cloudant_auth_dbname: 'abc',
      cloudant_auth_key: '123',
      pipeline: {}
    };

    const expected = {};

    const mock = nock(params.cloudant_url)
      .get(`/${params.cloudant_auth_dbname}/${params.cloudant_auth_key}`)
      .query(() => {
        return true;
      })
      .reply(500, expected);

    const func = scInitAuth.saveAuth;

    return func(params)
      .then(response => {
        assert(false, response);
      })
      .catch(e => {
        if (!mock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server did not get called.');
        }
        nock.cleanAll();
        assert.deepEqual(e.message, 'Unspecified error');
      });
  });

  it('saveAuth(): should save auth OK', () => {
    const params = {
      cloudant_url: 'https://some-cloudant-url.com',
      cloudant_auth_dbname: 'abc',
      cloudant_auth_key: '123',
      pipeline: {
        channel: {
          name: 'slack',
          slack: {
            client_id: 'xxxxxx',
            client_secret: 'xxxxxx',
            verification_token: 'xxxxxx'
          }
        },
        conversation: {
          username: 'xxxxxxxxxxxx',
          password: 'xxxxxx',
          workspace_id: 'xxxxxx-xxxxxx-xxxxxx-xxxxxx-xxxxxx'
        },
        name: 'flex-pipeline'
      }
    };

    const expGet = {};

    const expPut = params.pipeline;

    const mockGet = nock(params.cloudant_url)
      .get(`/${params.cloudant_auth_dbname}/${params.cloudant_auth_key}`)
      .query(() => {
        return true;
      })
      .reply(404, expGet);

    const mockPut = nock(params.cloudant_url)
      .put(`/${params.cloudant_auth_dbname}/${params.cloudant_auth_key}`)
      .query(() => {
        return true;
      })
      .reply(200, expPut);

    const func = scInitAuth.saveAuth;

    return func(params)
      .then(response => {
        if (!mockGet.isDone() || !mockPut.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server(s) did not get called.');
        }
        nock.cleanAll();
        assert.deepEqual(response, expPut);
      })
      .catch(e => {
        assert(false, e);
      });
  });

  it('main(): works OK', () => {
    const params = {
      cloudant_url: 'https://some-cloudant-url.com',
      cloudant_auth_dbname: 'abc',
      cloudant_auth_key: '123',
      pipeline: {
        channel: {
          name: 'slack',
          slack: {
            client_id: 'xxxxxx',
            client_secret: 'xxxxxx',
            verification_token: 'xxxxxx'
          }
        },
        conversation: {
          username: 'xxxxxxxxxxxx',
          password: 'xxxxxx',
          workspace_id: 'xxxxxx-xxxxxx-xxxxxx-xxxxxx-xxxxxx'
        },
        name: 'flex-pipeline'
      }
    };

    const expGet = {};

    const expPut = params.pipeline;

    const mockGet = nock(params.cloudant_url)
      .get(`/${params.cloudant_auth_dbname}/${params.cloudant_auth_key}`)
      .query(() => {
        return true;
      })
      .reply(404, expGet);

    const mockPut = nock(params.cloudant_url)
      .put(`/${params.cloudant_auth_dbname}/${params.cloudant_auth_key}`)
      .query(() => {
        return true;
      })
      .reply(200, expPut);

    const func = scInitAuth.main;

    return func(params)
      .then(response => {
        if (!mockGet.isDone() || !mockPut.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server(s) did not get called.');
        }
        nock.cleanAll();
        assert.deepEqual(response, expPut);
      })
      .catch(e => {
        assert(false, e);
      });
  });

  it('main(): works when overwriting the same auth key with new values', () => {
    const params = {
      cloudant_url: 'https://some-cloudant-url.com',
      cloudant_auth_dbname: 'abc',
      cloudant_auth_key: '123',
      pipeline: {
        channel: {
          name: 'slack',
          slack: {
            client_id: 'xxxxxx',
            client_secret: 'xxxxxx',
            verification_token: 'xxxxxx'
          }
        },
        conversation: {
          username: 'xxxxxxxxxxxx',
          password: 'xxxxxx',
          workspace_id: 'xxxxxx-xxxxxx-xxxxxx-xxxxxx-xxxxxx'
        },
        name: 'flex-pipeline'
      }
    };

    const expGet = {
      slack: {
        client_secret: 'yyyy',
        client_id: 'yy',
        verification_token: 'abc'
      },
      conversation: {
        username: 'abc',
        password: '123',
        workspace_id: '123-xyz'
      }
    };

    const expPut = params.pipeline;

    const mockGet = nock(params.cloudant_url)
      .get(`/${params.cloudant_auth_dbname}/${params.cloudant_auth_key}`)
      .query(() => {
        return true;
      })
      .reply(200, expGet);

    const mockPut = nock(params.cloudant_url)
      .put(`/${params.cloudant_auth_dbname}/${params.cloudant_auth_key}`)
      .query(() => {
        return true;
      })
      .reply(200, expPut);

    const func = scInitAuth.main;

    return func(params)
      .then(response => {
        if (!mockGet.isDone() || !mockPut.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server(s) did not get called.');
        }
        nock.cleanAll();
        assert.deepEqual(response, expPut);
      })
      .catch(e => {
        assert(false, e);
      });
  });

  it('main(): works in "test" mode', () => {
    const params = {
      cloudant_url: 'https://some-cloudant-url.com',
      cloudant_auth_dbname: 'abc',
      cloudant_auth_key: '123',
      setup_mode: 'test',
      pipeline: {
        channel: {
          name: 'slack',
          slack: {
            client_secret: 'yyyy',
            client_id: 'yy',
            verification_token: 'abc',
            access_token: '123',
            bot_access_token: 'abc-123-456-qqq'
          },
          facebook: {
            app_secret: 'yyyy',
            verification_token: 'yy',
            page_access_token: 'abc'
          }
        },
        conversation: {
          username: 'xxxxxxxxxxxx',
          password: 'xxxxxx',
          workspace_id: 'xxxxxx-xxxxxx-xxxxxx-xxxxxx-xxxxxx'
        },
        name: 'flex-pipeline'
      }
    };

    const expGet = {
      slack: {
        client_secret: 'yyyy',
        client_id: 'yy',
        verification_token: 'abc',
        access_token: '123',
        bot_access_token: 'abc-123-456-qqq'
      },
      facebook: {
        app_secret: 'yyyy',
        verification_token: 'yy',
        page_access_token: 'abc'
      },
      conversation: {
        username: 'abc',
        password: '123',
        workspace_id: '123-xyz'
      }
    };

    const expPut = params.pipeline;

    const mockGet = nock(params.cloudant_url)
      .get(`/${params.cloudant_auth_dbname}/${params.cloudant_auth_key}`)
      .query(() => {
        return true;
      })
      .reply(200, expGet);

    const mockPut = nock(params.cloudant_url)
      .put(`/${params.cloudant_auth_dbname}/${params.cloudant_auth_key}`)
      .query(() => {
        return true;
      })
      .reply(200, expPut);

    const func = scInitAuth.main;

    return func(params)
      .then(response => {
        if (!mockGet.isDone() || !mockPut.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server(s) did not get called.');
        }
        nock.cleanAll();
        assert.deepEqual(response, expPut);
      })
      .catch(e => {
        assert(false, e);
      });
  });
});
