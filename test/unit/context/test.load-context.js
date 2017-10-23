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

const actionLoadContext = require('../../../context/load-context.js');
const paramsJson = require('../../resources/payloads/test.unit.context.json').loadContextJson;
const Cloudant = require('cloudant');

const invalidCloudantUrl = 'invalid-url';

const errorNoRawInputData = 'params.raw_input_data absent in params.';
const errorNoCloudantContextKey = 'cloudant_context_key absent in params.raw_input_data.';
const errorNoConversationObj = 'conversation object absent in params.';

describe('Load Context Unit Tests: validateParams()', () => {
  let params = {};
  let func; // Function to test

  beforeEach(() => {
    // merge the two objects, deep copying packageBindings so it doesn't get changed between tests
    // and we only have to read it once
    params = Object.assign({}, JSON.parse(JSON.stringify(paramsJson)));
    func = actionLoadContext.validateParams;
  });

  it('validate error when no raw_input_data', () => {
    // Use request params for main function
    params = params.main.request;
    delete params.raw_input_data;

    try {
      func(params);
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorNoRawInputData);
    }
  });

  it('validate error when no cloudant_context_key', () => {
    // Use request params for main function
    params = params.main.request;
    delete params.raw_input_data.cloudant_context_key;

    try {
      func(params);
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorNoCloudantContextKey);
    }
  });

  it('validate error when no conversation object', () => {
    // Use request params for main function
    params = params.main.request;
    delete params.conversation;

    try {
      func(params);
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorNoConversationObj);
    }
  });
});

describe('Load Context Unit Tests: deleteCloudantFields()', () => {
  let params = {};
  let func; // Function to test

  beforeEach(() => {
    // merge the two objects, deep copying packageBindings so it doesn't get changed between tests
    // and we only have to read it once
    params = Object.assign({}, JSON.parse(JSON.stringify(paramsJson)));
    func = actionLoadContext.deleteCloudantFields;
  });

  it('deleteCloudantFields should delete cloudant revision _id', () => {
    func = actionLoadContext.deleteCloudantFields;
    // The params for func.
    const p = params.deleteCloudantFields.withCloudantDocId.params;
    const response = func(p);
    assert(!response._id, '_id present in Cloudant response.');
  });

  it('deleteCloudantFields should delete cloudant _rev', () => {
    func = actionLoadContext.deleteCloudantFields;
    // The params for func.
    const p = params.deleteCloudantFields.withCloudantRev.params;
    const response = func(p);
    assert(!response._rev, '_rev present in Cloudant response.');
  });

  it('deleteCloudantFields should delete cloudant _revs_info', () => {
    func = actionLoadContext.deleteCloudantFields;
    // The params for func.
    const p = params.deleteCloudantFields.withCloudantRevsInfo.params;
    const response = func(p);
    assert(!response._revs_info, '_revs_info present in Cloudant response.');
  });
});

describe('Load Context Unit Tests: createCloudantObj()', () => {
  const func = actionLoadContext.createCloudantObj;

  it('validate Cloudant url should be proper', () => {
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
});

describe('Load Context Unit Tests: getContext()', () => {
  let params = {};
  let func; // Function to test

  beforeEach(() => {
    // merge the two objects, deep copying packageBindings so it doesn't get changed between tests
    // and we only have to read it once
    params = Object.assign({}, JSON.parse(JSON.stringify(paramsJson)));
    func = actionLoadContext.deleteCloudantFields;
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

    func = actionLoadContext.getContext;

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

    func = actionLoadContext.getContext;

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

    func = actionLoadContext.getContext;

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
});

describe('Load Context Unit Tests: main()', () => {
  let params = Object.assign({}, JSON.parse(JSON.stringify(paramsJson)));
  const func = actionLoadContext.main;

  it('All OK', () => {
    // The expected response for main function when all ok.
    const expected = params.main.response;

    // Use request params for main function when all ok.
    params = params.main.request;

    const cloudantUrl = 'https://pinkunicorns.cloudant.com';
    const cloudantContextDbName = 'conversation-context';

    // This is what the mock call should return - the conversation context.
    const nockResponseCloudant = expected.conversation.context;
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
    const mockCloudant = nock(cloudantUrl)
      .get(
        `/${cloudantContextDbName}/${params.raw_input_data.cloudant_context_key}`
      )
      .query(() => {
        return true;
      })
      .reply(200, nockResponseCloudant);

    const apiHost = process.env.__OW_API_HOST;
    const namespace = process.env.__OW_NAMESPACE;
    const packageName = process.env.__OW_ACTION_NAME.split('/')[2];

    const cloudFunctionsUrl = `https://${apiHost}/api/v1/namespaces`;

    const mockCloudFunctions = nock(cloudFunctionsUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, mockResponseCloudFunctions);

    return func(params).then(
      response => {
        if (!mockCloudant.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant server did not get called.');
        }
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

describe('Load Context Unit Tests: getCloudantCreds()', () => {
  const func = actionLoadContext.getCloudantCreds; // function to test

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
