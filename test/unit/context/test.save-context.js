'use strict';

const assert = require('assert');
const nock = require('nock');
const sc = require('../../../context/save-context.js');
const paramsJson = require('../../resources/test.unit.context.json').saveContextJson;
const Cloudant = require('cloudant');

const invalidCloudantUrl = 'invalid-url';

const errorNoCloudantUrl = 'Cloudant db url absent or not bound to the package.';
const errorNoDbName = 'dbname absent or not bound to the package.';
const errorNoRawInputData = 'raw_input_data absent in params.';
const errorNoCloudantKey = 'cloudant_key absent in params.raw_input_data.';
const errorNoRawOutputData = 'raw_output_data absent in params.';
const errorNoConversationObj = 'conversation object absent in params.raw_output_data.';

describe('save context unit tests', () => {
  let params = {};
  let func; // Function to test

  beforeEach(() => {
    // merge the two objects, deep copying packageBindings so it doesn't get changed between tests
    // and we only have to read it once
    params = Object.assign({}, JSON.parse(JSON.stringify(paramsJson)));
  });

  it('validate error when no url', () => {
    // Use request params for main function
    params = params.main.request;

    assert(params.cloudant_url, 'url absent in package bindings.');
    delete params.cloudant_url;

    func = sc.main;

    return func(params).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorNoCloudantUrl);
      }
    );
  });

  it('validate error when no dbname', () => {
    // Use request params for main function
    params = params.main.request;

    assert(params.dbname, 'dbname absent in package bindings.');
    delete params.dbname;

    func = sc.main;

    return func(params).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorNoDbName);
      }
    );
  });

  it('validate error when no raw_input_data', () => {
    // Use request params for main function
    params = params.main.request;

    assert(params.raw_input_data, 'raw_input_data absent in params.');
    delete params.raw_input_data;

    func = sc.main;

    return func(params).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorNoRawInputData);
      }
    );
  });

  it('validate error when no cloudant_key', () => {
    // Use request params for main function
    params = params.main.request;

    assert(params.raw_input_data.cloudant_key, 'cloudant_key absent in params.raw_input_data');
    delete params.raw_input_data.cloudant_key;

    func = sc.main;

    return func(params).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorNoCloudantKey);
      }
    );
  });

  it('validate error when no raw_output_data', () => {
    // Use request params for main function
    params = params.main.request;

    assert(params.raw_output_data, 'raw_output_data absent in package bindings.');
    delete params.raw_output_data;

    func = sc.main;

    return func(params).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorNoRawOutputData);
      }
    );
  });

  it('validate error when no Conversation object', () => {
    // Use request params for main function
    params = params.main.request;

    assert(params.raw_output_data.conversation, 'conversation object absent in package bindings.');
    delete params.raw_output_data.conversation;

    func = sc.main;

    return func(params).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorNoConversationObj);
      }
    );
  });

  it('set context all ok', () => {
    // The expected responses for setContext function when all ok.
    const expected = params.setContext.allOk.responses;

    // Use request params for setContext function when all ok.
    params = params.setContext.allOk.request;

    const cloudantUrl = params.config.cloudant_url;
    const cloudant = Cloudant({
      url: cloudantUrl,
      plugin: 'retry',
      retryAttempts: 5,
      retryTimeout: 1000
    });

    const dbname = params.config.db;
    const key = params.key;
    const db = cloudant.use(dbname);
    const doc = params.doc;

    const exp0 = expected[0]; // Expected response from GET request
    const exp1 = expected[1]; // Expected response from PUT request

    const mockGet = nock(cloudantUrl)
      .get(`/${dbname}/${key}`)
      .query(() => {
        return true;
      })
      .reply(200, exp0);

    const mockPut = nock(cloudantUrl)
      .put(`/${dbname}/${key}`)
      .query(() => {
        return true;
      })
      .reply(200, exp1);

    func = sc.setContext;

    return func(db, key, doc).then(
      response => {
        if (!mockGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Get server did not get called.');
        }
        if (!mockPut.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Put server did not get called.');
        }
        nock.cleanAll();
        assert.deepEqual(response, exp1);
      },
      e => {
        nock.cleanAll();
        assert(false, e);
      }
    );
  });

  it('set context works when saving for the first time', () => {
    // The expected responses for setContext function when saving for the first time.
    const expected = params.setContext.missingContext.responses;

    // Use request params for setContext function when saving for the first time.
    params = params.setContext.missingContext.request;

    const cloudantUrl = params.config.cloudant_url;
    const cloudant = Cloudant({
      url: cloudantUrl,
      plugin: 'retry',
      retryAttempts: 5,
      retryTimeout: 1000
    });

    const dbname = params.config.db;
    const key = params.key;
    const db = cloudant.use(dbname);
    const doc = params.doc;

    const exp0 = expected[0]; // Expected response from GET request
    const exp1 = expected[1]; // Expected response from PUT request

    const mockGet = nock(cloudantUrl)
      .get(`/${dbname}/${key}`)
      .query(() => {
        return true;
      })
      .reply(404, exp0);

    const mockPut = nock(cloudantUrl)
      .put(`/${dbname}/${key}`)
      .query(() => {
        return true;
      })
      .reply(200, exp1);

    func = sc.setContext;

    return func(db, key, doc).then(
      response => {
        if (!mockGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Get server did not get called.');
        }
        if (!mockPut.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Put server did not get called.');
        }
        nock.cleanAll();
        assert.deepEqual(response, exp1);
      },
      e => {
        nock.cleanAll();
        assert(false, e);
      }
    );
  });

  it('validate Cloudant url should be proper', () => {
    func = sc.getCloudantObj;

    return func(invalidCloudantUrl).then(
      response => {
        assert(false, response);
      },
      e => {
        assert.equal(
          e,
          'Cloudant object creation failed. Error from Cloudant: Error: invalid url.',
          'Should fail complaining about invalid url.'
        );
      }
    );
  });

  it('set context should fail when inserting null context for the first time', () => {
    // The expected error for setContext function when inserting null context.
    const expected = params.setContext.insertNullContext.responses;

    // Use request params for setContext function when inserting null context.
    params = params.setContext.insertNullContext.request;

    const cloudantUrl = params.config.cloudant_url;

    const cloudant = Cloudant({
      url: cloudantUrl,
      plugin: 'retry',
      retryAttempts: 5,
      retryTimeout: 1000
    });

    const dbname = params.config.db;
    const key = params.key;
    const db = cloudant.use(dbname);
    const doc = params.doc;
    const exp0 = expected[0]; // Expected response from GET request
    const exp1 = expected[1]; // Expected response from PUT request

    const mockGet = nock(cloudantUrl)
      .get(`/${dbname}/${key}`)
      .query(() => {
        return true;
      })
      .reply(404, exp0);

    const mockPut = nock(cloudantUrl)
      .put(`/${dbname}/${key}`)
      .query(() => {
        return true;
      })
      .reply(400, exp1);

    func = sc.setContext;

    return func(db, key, doc).then(
      response => {
        if (!mockGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Get server did not get called.');
        }
        if (!mockPut.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Put server did not get called.');
        }
        nock.cleanAll();
        assert.deepEqual(response, exp1);
      },
      e => {
        nock.cleanAll();
        assert.equal(400, e.statusCode);
      }
    );
  });

  it('set context should fail when overwriting old context with Json Array', () => {
    // The expected error for setContext function when overwriting context with a JsonArray.
    const expected = params.setContext.overwriteContextWithJsonArray.responses;

    // Use request params for setContext function when overwriting context with a JsonArray.
    params = params.setContext.overwriteContextWithJsonArray.request;

    const cloudantUrl = params.config.cloudant_url;
    const cloudant = Cloudant({
      url: cloudantUrl,
      plugin: 'retry',
      retryAttempts: 5,
      retryTimeout: 1000
    });

    const dbname = params.config.db;
    const key = params.key;
    const db = cloudant.use(dbname);
    const doc = params.doc;
    const exp0 = expected[0];
    const exp1 = expected[1];

    const mockGet = nock(cloudantUrl)
      .get(`/${dbname}/${key}`)
      .query(() => {
        return true;
      })
      .reply(200, exp0);

    const mockPut = nock(cloudantUrl)
      .put(`/${dbname}/${key}`)
      .query(() => {
        return true;
      })
      .reply(400, exp1);

    func = sc.setContext;

    return func(db, key, doc).then(
      response => {
        if (!mockGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Get server did not get called.');
        }
        if (!mockPut.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Put server did not get called.');
        }
        nock.cleanAll();
        assert.deepEqual(response, exp1);
      },
      e => {
        nock.cleanAll();
        assert.equal(400, e.statusCode);
        assert.deepEqual(e.message, 'Document must be a JSON object');
      }
    );
  });

  it('main all ok', () => {
    // The expected response for main function when all ok.
    const expected = params.main.responses;

    // Use request params for main function when all ok.
    params = params.main.request;

    // This is what the mock calls should return.
    const nockResponseForGet = expected[0];
    const nockResponseForPut = expected[1].raw_output_data.conversation.context;

    const dbName = params.dbname;
    const cloudantUrl = params.cloudant_url;
    const cloudantKey = params.raw_input_data.cloudant_key;

    const mockGet = nock(cloudantUrl)
      .get(`/${dbName}/${cloudantKey}`)
      .query(() => {
        return true;
      })
      .reply(404, nockResponseForGet);

    const mockPut = nock(cloudantUrl)
      .put(`/${dbName}/${cloudantKey}`)
      .query(() => {
        return true;
      })
      .reply(200, nockResponseForPut);

    func = sc.main;

    return func(params).then(
      response => {
        if (!mockGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Get server did not get called.');
        }
        if (!mockPut.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Put server did not get called.');
        }
        nock.cleanAll();
        assert.deepEqual(response, expected[1]);
      },
      e => {
        nock.cleanAll();
        assert(false, e);
      }
    );
  });

  it('main handle error from Cloudant', () => {
    // The expected error for main function when Cloudant throws an error.
    const expected = params.main.responses;

    // Use request params for main function when Cloudant throws an error.
    params = params.main.request;

    // This is what the mock call should return.
    const nockResponseForGet = expected[0];

    const dbName = params.dbname;
    const cloudantUrl = params.cloudant_url;
    const cloudantKey = params.raw_input_data.cloudant_key;

    const mockGet = nock(cloudantUrl)
      .get(`/${dbName}/${cloudantKey}`)
      .query(() => {
        return true;
      })
      .reply(500, nockResponseForGet);

    func = sc.main;

    return func(params).then(
      response => {
        if (!mockGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Get server did not get called.');
        }
        nock.cleanAll();
        assert.deepEqual(response, expected[0]);
      },
      e => {
        nock.cleanAll();
        assert.equal(500, e.statusCode);
      }
    );
  });

  it('validateResponseParams response should not contain cloudant_url', () => {
    func = sc.validateResponseParams;
    // The params for func.
    const p = params.validateResponseParams.withCloudantUrl.params;
    try {
      func(p);
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal('cloudant_url present in the response.', e.message);
    }
  });

  it('validateResponseParams response should not contain cloudant auth dbname', () => {
    func = sc.validateResponseParams;
    // The params for func.
    const p = params.validateResponseParams.withCloudantDbName.params;
    try {
      func(p);
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal('dbname present in the response.', e.message);
    }
  });
});
