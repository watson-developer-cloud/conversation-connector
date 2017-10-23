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
 * Tests all functions used by actions that need to save auth.
 */

const assert = require('assert');
const nock = require('nock');
const Cloudant = require('cloudant');

process.env.__OW_ACTION_NAME = `/${process.env.__OW_NAMESPACE}/pipeline_pkg/action-to-test`;

const actionSlackDeploy = require('./../../../channels/slack/deploy/index.js');

const errorFromCloudant = 'server down';
const actions = [actionSlackDeploy];

describe('Auth Db:: Saving Auth Pre-requisites', () => {
  actions.forEach(action => {
    it(`${action.name} should have a saveAuth function`, () => {
      assert(
        action.saveAuth,
        `saveAuth function not found for action ${action.name}`
      );
    });

    it(`${action.name} should have a insertDoc function`, () => {
      assert(
        action.insertDoc,
        `insertDoc function not found for action ${action.name}`
      );
    });
  });
});

describe('Auth Db:: saveAuth()', () => {
  actions.forEach(action => {
    it('should return error when a non-404 returned from Cloudant', () => {
      const cloudantCreds = {
        cloudant_url: 'https://some-cloudant-url.com',
        cloudant_auth_dbname: 'abc',
        cloudant_auth_key: '123'
      };

      const slackOAuth = {
        access_token: 'xxxxx',
        bot: {
          bot_access_token: 'xxxxx',
          bot_user_id: 'xxx'
        }
      };

      const expected = {};

      const mock = nock(cloudantCreds.cloudant_url)
        .get(
          `/${cloudantCreds.cloudant_auth_dbname}/${cloudantCreds.cloudant_auth_key}`
        )
        .query(() => {
          return true;
        })
        .reply(500, expected);

      const func = action.saveAuth;

      return func(cloudantCreds, slackOAuth)
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

    it(`${action.name}: should throw error when slack entry absent for given key`, () => {
      const cloudantCreds = {
        cloudant_url: 'https://some-cloudant-url.com',
        cloudant_auth_dbname: 'abc',
        cloudant_auth_key: '123'
      };

      const slackOAuth = {
        access_token: 'xxxxx',
        bot: {
          bot_access_token: 'xxxxx',
          bot_user_id: 'xxx'
        }
      };

      const expGet = {};

      const mockGet = nock(cloudantCreds.cloudant_url)
        .get(
          `/${cloudantCreds.cloudant_auth_dbname}/${cloudantCreds.cloudant_auth_key}`
        )
        .query(() => {
          return true;
        })
        .reply(200, expGet);

      const func = action.saveAuth;

      return func(cloudantCreds, slackOAuth)
        .then(response => {
          assert(false, response);
          nock.cleanAll();
        })
        .catch(e => {
          if (!mockGet.isDone()) {
            nock.cleanAll();
            assert(false, 'Mock Cloudant Get server did not get called.');
          }
          assert.deepEqual(e, 'No auth db entry for key 123. Re-run setup.');
        });
    });

    it(`${action.name}: should save auth OK`, () => {
      const cloudantCreds = {
        cloudant_url: 'https://some-cloudant-url.com',
        cloudant_auth_dbname: 'abc',
        cloudant_auth_key: '123'
      };

      const slackOAuth = {
        access_token: 'xxxxx',
        bot: {
          bot_access_token: 'xxxxx',
          bot_user_id: 'xxx'
        }
      };

      const expGet = {
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

      const expPut = {
        slack: {
          verification_token: 'xxxxxx',
          access_token: 'xxxxx',
          bot_access_token: 'xxxxx'
        },
        conversation: {
          password: 'xxxxxxx',
          username: 'xxxxxxxxx',
          workspace_id: 'xxxxxxxxx'
        }
      };

      const mockGet = nock(cloudantCreds.cloudant_url)
        .get(
          `/${cloudantCreds.cloudant_auth_dbname}/${cloudantCreds.cloudant_auth_key}`
        )
        .query(() => {
          return true;
        })
        .reply(200, expGet);

      const mockPut = nock(cloudantCreds.cloudant_url)
        .put(
          `/${cloudantCreds.cloudant_auth_dbname}/${cloudantCreds.cloudant_auth_key}`
        )
        .query(() => {
          return true;
        })
        .reply(200, expPut);

      const func = action.saveAuth;

      return func(cloudantCreds, slackOAuth)
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
});

describe('Auth Db:: insertDoc()', () => {
  actions.forEach(action => {
    it(`${action.name}: should insert the auth document OK`, () => {
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
          verification_token: 'xxxxxx',
          access_token: 'xxxxx',
          bot_access_token: 'xxxxx'
        },
        conversation: {
          password: 'xxxxxxx',
          username: 'xxxxxxxxx',
          workspace_id: 'xxxxxxxxx'
        }
      };

      const mock = nock(cloudantUrl)
        .put(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
        .query(() => {
          return true;
        })
        .reply(200, expected);

      const func = action.insertDoc;

      return func(db, cloudantAuthKey, expected)
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

    it(`${action.name}: should reject when Cloudant returns other than 200 or 404.`, () => {
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

      const mock = nock(cloudantUrl)
        .put(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
        .query(() => {
          return true;
        })
        .reply(500, { name: 'CloudantError', message: errorFromCloudant });

      const func = action.insertDoc;
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

    it(`${action.name}: should return an empty JSON when doc absent.`, () => {
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

      const expected = {};

      const mock = nock(cloudantUrl)
        .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
        .query(() => {
          return true;
        })
        .reply(404, { error: 'not_found', reason: 'missing' });

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
