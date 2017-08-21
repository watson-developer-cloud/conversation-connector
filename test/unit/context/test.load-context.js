'use strict';

const assert = require('assert');
const nock = require('nock');
const sc = require('../../../context/load-context.js');
const paramsJson = require('../../resources/test.unit.context.json').loadContextJson;
const Cloudant = require('cloudant');

const invalidCloudantUrl = 'invalid-url';

const errorNoCloudantUrl = 'Cloudant db url absent or not bound to the package.';
const errorNoDbName = 'dbname absent or not bound to the package.';
const errorNoRawInputData = 'params.raw_input_data absent in params.';
const errorNoCloudantKey = 'cloudant_key absent in params.raw_input_data.';
const errorNoConversationObj = 'conversation object absent in params.';

describe('load context unit tests', () => {
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

    assert(params.raw_input_data, 'raw_input_data absent in package bindings.');
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

  it('validate error when no Conversation object', () => {
    // Use request params for main function
    params = params.main.request;

    assert(params.conversation, 'conversation object absent in params.');
    delete params.conversation;

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

  it('get context all ok', () => {
    // The expected response for getContext function when all ok.
    const expected = params.getContext.allOk.response;

    // Use request params for getContext function when all ok.
    params = params.getContext.allOk.request;

    const cloudant = Cloudant({
      url: params.config.cloudant_url,
      plugin: 'retry',
      retryAttempts: 5,
      retryTimeout: 1000
    });

    const dbname = params.config.db;
    const key = params.key;
    const db = cloudant.use(dbname);

    const mock = nock(params.config.cloudant_url)
      .get(`/${dbname}/${key}`)
      .query(() => {
        return true;
      })
      .reply(200, expected);

    func = sc.getContext;

    return func(db, key).then(
      response => {
        if (!mock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server did not get called.');
        }
        nock.cleanAll();
        assert.deepEqual(response, expected);
      },
      e => {
        nock.cleanAll();
        assert(false, e);
      }
    );
  });

  it('should return empty context for new user', () => {
    // The expected response for getContext function when a new user starts chatting.
    const expected = params.getContext.missingContext.response;

    // Use request params for getContext function when a new user starts chatting.
    params = params.getContext.missingContext.request;

    const cloudant = Cloudant({
      url: params.config.cloudant_url,
      plugin: 'retry',
      retryAttempts: 5,
      retryTimeout: 1000
    });

    const dbname = params.config.db;
    const key = params.key;
    const db = cloudant.use(dbname);

    const mock = nock(params.config.cloudant_url)
      .get(`/${dbname}/${key}`)
      .query(() => {
        return true;
      })
      .reply(404, expected);

    func = sc.getContext;

    return func(db, key).then(
      response => {
        if (!mock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server did not get called.');
        }
        nock.cleanAll();
        assert.deepEqual(response, expected);
      },
      e => {
        nock.cleanAll();
        assert(false, e);
      }
    );
  });

  it('should return error when a non-404 error occurs', () => {
    // The expected response for getContext function when a non-404 occurs.
    const expected = params.getContext.missingContext.response;

    // Use request params for getContext function when a non-404 occurs.
    params = params.getContext.missingContext.request;

    const cloudant = Cloudant({
      url: params.config.cloudant_url,
      plugin: 'retry',
      retryAttempts: 5,
      retryTimeout: 1000
    });

    const dbname = params.config.db;
    const key = params.key;
    const db = cloudant.use(dbname);

    const mock = nock(params.config.cloudant_url)
      .get(`/${dbname}/${key}`)
      .query(() => {
        return true;
      })
      .reply(500, expected);

    func = sc.getContext;

    return func(db, key).then(
      response => {
        if (!mock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server did not get called.');
        }
        nock.cleanAll();
        assert.deepEqual(response, expected);
      },
      e => {
        nock.cleanAll();
        assert.equal(e.statusCode, 500);
      }
    );
  });

  it('main all ok', () => {
    // The expected response for main function when all ok.
    const expected = params.main.response;

    // Use request params for main function when all ok.
    params = params.main.request;

    // This is what the mock call should return - the Convo context.
    const nockResponseToSend = expected.conversation.context;

    const mock = nock(params.cloudant_url)
      .get(`/${params.dbname}/${params.raw_input_data.cloudant_key}`)
      .query(() => {
        return true;
      })
      .reply(200, nockResponseToSend);

    func = sc.main;

    return func(params).then(
      response => {
        if (!mock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server did not get called.');
        }
        nock.cleanAll();
        assert.deepEqual(response, expected);
      },
      e => {
        nock.cleanAll();
        assert(false, e);
      }
    );
  });

  it('deleteCloudantFields should delete cloudant revision _id', () => {
    func = sc.deleteCloudantFields;
    // The params for func.
    const p = params.deleteCloudantFields.withCloudantDocId.params;
    const response = func(p);
    assert(!response._id, '_id present in Cloudant response.');
  });

  it('deleteCloudantFields should delete cloudant _rev', () => {
    func = sc.deleteCloudantFields;
    // The params for func.
    const p = params.deleteCloudantFields.withCloudantRev.params;
    const response = func(p);
    assert(!response._rev, '_rev present in Cloudant response.');
  });

  it('deleteCloudantFields should delete cloudant _revs_info', () => {
    func = sc.deleteCloudantFields;
    // The params for func.
    const p = params.deleteCloudantFields.withCloudantRevsInfo.params;
    const response = func(p);
    assert(!response._revs_info, '_revs_info present in Cloudant response.');
  });
});
