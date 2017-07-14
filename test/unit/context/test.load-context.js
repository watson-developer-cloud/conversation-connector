'use strict';

const assert = require('assert');
const nock = require('nock');
const sc = require('../../../context/load-context.js');
const paramsJson = require('../../resources/test.unit.context.json').loadContextJson;
const Cloudant = require('cloudant');

const invalidCloudantUrl = 'invalid-url';

describe('load context unit tests', () => {
  let params = {};
  let func; // Function to test

  beforeEach(() => {
    // merge the two objects, deep copying packageBindings so it doesn't get changed between tests
    // and we only have to read it once
    params = Object.assign({}, JSON.parse(JSON.stringify(paramsJson)));
  });

  it('validate no url', () => {
    // Use request params for main function
    params = params.main.request;

    assert(params.cloudant_url, 'url absent in package bindings.');
    delete params.cloudant_url;

    func = sc.main;

    return func(params).then(
      response => {
        assert(false, response);
      },
      e => {
        assert.equal(
          e,
          'Illegal Argument Exception: Cloudant db url absent or not bound to the package.',
          'Should fail complaining about missing url'
        );
      }
    );
  });

  it('validate no dbname', () => {
    // Use request params for main function
    params = params.main.request;

    assert(params.dbname, 'dbname absent in package bindings.');
    delete params.dbname;

    func = sc.main;

    return func(params).then(
      response => {
        assert(false, response);
      },
      e => {
        assert.equal(
          e,
          'Illegal Argument Exception: dbname absent or not bound to the package.',
          'Should fail complaining about missing dbname'
        );
      }
    );
  });

  it('validate no cloudant_key', () => {
    // Use request params for main function
    params = params.main.request;

    assert(
      params.raw_input_data.cloudant_key,
      'cloudant_key absent in params.raw_input_data'
    );
    delete params.raw_input_data.cloudant_key;

    func = sc.main;

    return func(params).then(
      response => {
        assert(false, response);
      },
      e => {
        assert.equal(
          e,
          'Illegal Argument Exception: params.raw_input_data absent in params or cloudant_key absent in params.raw_input_data',
          'Should fail complaining about missing cloudant_key'
        );
      }
    );
  });

  it('validate no Conversation object', () => {
    // Use request params for main function
    params = params.main.request;

    assert(params.conversation, 'conversation object absent in params.');
    delete params.conversation;

    func = sc.main;

    return func(params).then(
      response => {
        assert(false, response);
      },
      e => {
        assert.equal(
          e,
          'Illegal Argument Exception: conversation object absent in params.',
          'Should fail complaining about missing conversation object'
        );
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
});
