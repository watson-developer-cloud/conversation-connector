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

const assert = require('assert');
const nock = require('nock');

process.env.__OW_ACTION_NAME = `/${process.env.__OW_NAMESPACE}/pipeline_pkg/action-to-test`;

const actionSaveContext = require('../../../context/save-context.js');
const paramsJson = require('../../resources/payloads/test.unit.context.json').saveContextJson;
const Cloudant = require('cloudant');

const invalidCloudantUrl = 'invalid-url';

const errorInvalidUrl = 'Cloudant object creation failed. Error from Cloudant: Error: invalid url.';
const errorNoRawInputData = 'raw_input_data absent in params.';
const errorNoCloudantContextKey = 'cloudant_context_key absent in params.raw_input_data.';
const errorNoConversationObj = 'conversation object absent in params.';

describe('Save Context Unit Tests: main()', () => {
  let params = {};
  let func; // Function to test

  beforeEach(() => {
    // merge the two objects, deep copying packageBindings so it doesn't get changed between tests
    // and we only have to read it once
    params = Object.assign({}, JSON.parse(JSON.stringify(paramsJson)));
  });

  it('main all ok', () => {
    // The expected response for main function when all ok.
    const expected = params.main.responses;

    // Use request params for main function when all ok.
    params = params.main.request;

    // This is what the mock calls should return.
    const nockResponseForGet = expected[0];
    const nockResponseForPut = expected[1].conversation.context;

    const apiHost = process.env.__OW_API_HOST;
    const namespace = process.env.__OW_NAMESPACE;
    const packageName = process.env.__OW_ACTION_NAME.split('/')[2];

    const cloudantUrl = 'https://pinkunicorns.cloudant.com';
    const cloudantContextDbName = 'conversation-context';

    const cloudantKey = params.raw_input_data.cloudant_context_key;

    const cloudFunctionsUrl = `https://${apiHost}/api/v1/namespaces`;

    const mockResponseCloudFunctions = {
      annotations: [
        {
          key: 'cloudant_url',
          value: cloudantUrl
        },
        {
          key: 'cloudant_context_dbname',
          value: cloudantContextDbName
        }
      ]
    };

    const mockCloudFunctions = nock(cloudFunctionsUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, mockResponseCloudFunctions);

    const mockGet = nock(cloudantUrl)
      .get(`/${cloudantContextDbName}/${cloudantKey}`)
      .query(() => {
        return true;
      })
      .reply(404, nockResponseForGet);

    const mockPut = nock(cloudantUrl)
      .put(`/${cloudantContextDbName}/${cloudantKey}`)
      .query(() => {
        return true;
      })
      .reply(200, nockResponseForPut);

    func = actionSaveContext.main;

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
        if (!mockCloudFunctions.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloud Functions server did not get called.');
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
});

describe('Save Context Unit Tests: setContext()', () => {
  let params = {};
  const func = actionSaveContext.setContext; // Function to test

  beforeEach(() => {
    // merge the two objects, deep copying packageBindings so it doesn't get changed between tests
    // and we only have to read it once
    params = Object.assign({}, JSON.parse(JSON.stringify(paramsJson)));
  });

  it('all ok', () => {
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

  it('works when saving for the first time', () => {
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

  it('should fail when inserting null context for the first time', () => {
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

  it('should fail when overwriting old context with Json Array', () => {
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

  it('should fail when Cloudant returns anything other than a 200 or 404', () => {
    const expected = params.setContext.cloudantError.responses;
    params = params.setContext.cloudantError.request;

    const nockResponseForGet = expected[0];

    const dbName = params.cloudant_context_dbname;
    const cloudantUrl = params.cloudant_url;
    const cloudantKey = params.cloudant_context_key;
    const doc = params.doc;

    const cloudant = Cloudant({
      url: cloudantUrl,
      plugin: 'retry',
      retryAttempts: 5,
      retryTimeout: 1000
    });

    const db = cloudant.use(dbName);

    const mockGet = nock(cloudantUrl)
      .get(`/${dbName}/${cloudantKey}`)
      .query(() => {
        return true;
      })
      .reply(500, nockResponseForGet);

    return func(db, cloudantKey, doc).then(
      response => {
        if (!mockGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Get server did not get called.');
        }
        nock.cleanAll();
        assert(false, response);
      },
      e => {
        nock.cleanAll();
        assert.equal(500, e.statusCode);
      }
    );
  });
});

describe('Save Context Unit Tests: getCloudantCreds()', () => {
  const func = actionSaveContext.getCloudantCreds; // function to test

  it('All OK', () => {
    const cloudantUrl = 'https://pinkunicorns.cloudant.com';
    const cloudantContextDbName = 'conversation-context';

    const apiHost = process.env.__OW_API_HOST;
    const namespace = process.env.__OW_NAMESPACE;
    const packageName = process.env.__OW_ACTION_NAME.split('/')[2];

    const cloudFunctionsUrl = `https://${apiHost}/api/v1/namespaces`;

    const mockResponseCloudFunctions = {
      annotations: [
        {
          key: 'cloudant_url',
          value: cloudantUrl
        },
        {
          key: 'cloudant_context_dbname',
          value: cloudantContextDbName
        }
      ]
    };
    const expected = {
      cloudant_url: cloudantUrl,
      cloudant_context_dbname: cloudantContextDbName
    };

    const mockCloudFunctions = nock(cloudFunctionsUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, mockResponseCloudFunctions);

    return func().then(
      response => {
        if (!mockCloudFunctions.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloud Functions server did not get called.');
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

describe('Save Context Unit Tests: createCloudantObj()', () => {
  const func = actionSaveContext.createCloudantObj;

  it('validate Cloudant url should be proper', () => {
    return func(invalidCloudantUrl).then(
      response => {
        assert(false, response);
      },
      e => {
        assert.equal(
          e,
          errorInvalidUrl,
          'Should fail complaining about invalid url.'
        );
      }
    );
  });
});

describe('Save Context Unit Tests: validateParams()', () => {
  const func = actionSaveContext.validateParams;
  it('should throw AssertionError for missing raw_input_data', () => {
    try {
      func({});
    } catch (e) {
      assert.equal(e.name, 'AssertionError');
      assert.equal(e.message, errorNoRawInputData);
    }
  });

  it('should throw AssertionError for missing cloudant_context_key', () => {
    try {
      func({ raw_input_data: {} });
    } catch (e) {
      assert.equal(e.name, 'AssertionError');
      assert.equal(e.message, errorNoCloudantContextKey);
    }
  });

  it('should throw AssertionError for missing Conversation object', () => {
    try {
      func({
        raw_input_data: { cloudant_context_key: 'xyz' }
      });
    } catch (e) {
      assert.equal(e.name, 'AssertionError');
      assert.equal(e.message, errorNoConversationObj);
    }
  });
});
