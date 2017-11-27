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
 * Tests all functions used by actions that need to load auth.
 */

const assert = require('assert');
const nock = require('nock');
const Cloudant = require('cloudant');

process.env.__OW_ACTION_NAME = `/${process.env.__OW_NAMESPACE}/pipeline_pkg/action-to-test`;

const actionSlackDeploy = require('./../../../channels/slack/deploy/index.js');
const actionSlackReceive = require('./../../../channels/slack/receive/index.js');

const actionFacebookReceive = require('./../../../channels/facebook/receive/index.js');

const actions = [actionSlackDeploy, actionSlackReceive, actionFacebookReceive];

const errorBadCloudantUrl = 'invalid url';

describe('Auth Db:: Loading Auth Pre-requisites', () => {
  actions.forEach(action => {
    it(`${action.name} should have a loadAuth function`, () => {
      assert(
        action.loadAuth,
        `loadAuth function not found for action ${action.name}`
      );
    });

    it(`${action.name} should have a getCloudantCreds function`, () => {
      assert(
        action.getCloudantCreds,
        `getCloudantCreds function not found for action ${action.name}`
      );
    });

    it(`${action.name} should have a retrieveDoc function`, () => {
      assert(
        action.retrieveDoc,
        `retrieveDoc function not found for action ${action.name}`
      );
    });

    it(`${action.name} should have a createCloudantObj function`, () => {
      assert(
        action.createCloudantObj,
        `createCloudantObj function not found for action ${action.name}`
      );
    });
  });
});

describe('Auth Db:: createCloudantObj()', () => {
  actions.forEach(action => {
    it(`${action.name} should have a createCloudantObj function`, () => {
      const func = action.createCloudantObj;

      return func({
        cloudant_url: 'bad_url',
        cloudant_auth_dbname: 'abc',
        cloudant_auth_key: '123'
      }).then(
        response => {
          assert(false, response);
        },
        e => {
          assert.deepEqual(e.message, errorBadCloudantUrl);
        }
      );
    });
  });
});

describe('Auth Db:: loadAuth()', () => {
  actions.forEach(action => {
    it('should return error when a non-404 returned from Cloudant', () => {
      const params = {
        cloudant_url: 'https://some-cloudant-url.com',
        cloudant_auth_dbname: 'abc',
        cloudant_auth_key: '123'
      };

      const expected = {};

      const mock = nock(params.cloudant_url)
        .get(`/${params.cloudant_auth_dbname}/${params.cloudant_auth_key}`)
        .query(() => {
          return true;
        })
        .reply(500, expected);

      const func = action.loadAuth;
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

    it(`${action.name}: should load auth OK`, () => {
      const params = {
        cloudant_url: 'https://some-cloudant-url.com',
        cloudant_auth_dbname: 'abc',
        cloudant_auth_key: '123'
      };

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

      const mock = nock(params.cloudant_url)
        .get(`/${params.cloudant_auth_dbname}/${params.cloudant_auth_key}`)
        .query(() => {
          return true;
        })
        .reply(200, expected);

      const func = action.loadAuth;
      return func(params)
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
  });
});

describe('Auth Db:: retrieveDoc()', () => {
  actions.forEach(action => {
    it(`${action.name}: should retrieve the auth document.`, () => {
      const cloudantUrl = 'https://some-cloudant-url.com';
      const cloudantAuthDbName = 'abc';
      const cloudantAuthKey = '123';

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

      const func = action.retrieveDoc;
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
  });
});

describe('Auth Db:: getCloudantCreds()', () => {
  actions.forEach(action => {
    it(`${action.name}: should get Cloudant credentials from Cloud Functions package annotations.`, () => {
      const mockResponse = {
        annotations: [
          {
            key: 'cloudant_url',
            value: 'https://some-cloudant-url.com'
          },
          {
            key: 'cloudant_auth_dbname',
            value: 'abc'
          },
          {
            key: 'cloudant_auth_key',
            value: '123'
          }
        ]
      };

      const expected = {
        cloudant_url: 'https://some-cloudant-url.com',
        cloudant_auth_dbname: 'abc',
        cloudant_auth_key: '123'
      };

      const apiHost = process.env.__OW_API_HOST;
      const namespace = process.env.__OW_NAMESPACE;
      const packageName = process.env.__OW_ACTION_NAME.split('/')[2];

      const cloudFunctionsUrl = `https://${apiHost}/api/v1/namespaces`;

      const mock = nock(cloudFunctionsUrl)
        .get(`/${namespace}/packages/${packageName}`)
        .reply(200, mockResponse);

      const func = action.getCloudantCreds;
      return func()
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

    it(`${action.name}: should throw error from Cloud Functions when getting package annotations.`, () => {
      const mockResponse = { name: 'OpenWhiskError', message: 'Not Found' };

      const apiHost = process.env.__OW_API_HOST;
      const namespace = process.env.__OW_NAMESPACE;
      const packageName = process.env.__OW_ACTION_NAME.split('/')[2];

      const cloudFunctionsUrl = `https://${apiHost}/api/v1/namespaces`;

      const mock = nock(cloudFunctionsUrl)
        .get(`/${namespace}/packages/${packageName}`)
        .reply(404, mockResponse);

      const func = action.getCloudantCreds;
      return func()
        .then(response => {
          assert(false, response);
        })
        .catch(e => {
          if (!mock.isDone()) {
            nock.cleanAll();
            assert(false, 'Mock server did not get called.');
          }
          nock.cleanAll();
          assert.equal(e.name, mockResponse.name);
        });
    });
  });
});
