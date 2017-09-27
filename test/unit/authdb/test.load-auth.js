'use strict';

/**
 * Tests all functions used by actions that need to load auth.
 */

const assert = require('assert');
const nock = require('nock');
const Cloudant = require('cloudant');

process.env.__OW_ACTION_NAME = `/${process.env.__OW_NAMESPACE}/pipeline_pkg/action-to-test`;

const scSlackDeploy = require('./../../../channels/slack/deploy/index.js');
const scSlackReceive = require('./../../../channels/slack/receive/index.js');
const scSlackPost = require('./../../../channels/slack/post/index.js');

const scFacebookPost = require('./../../../channels/facebook/post/index.js');
const scFacebookReceive = require('./../../../channels/facebook/receive/index.js');

const scCallConversation = require('./../../../conversation/call-conversation.js');

const scStarterCodeNormSlackForConv = require('./../../../starter-code/normalize-for-conversation/normalize-slack-for-conversation.js');
const scStarterCodeNormFacebookForConv = require('./../../../starter-code/normalize-for-conversation/normalize-facebook-for-conversation.js');

const actions = [
  scSlackDeploy,
  scSlackReceive,
  scSlackPost,
  scFacebookPost,
  scFacebookReceive,
  scCallConversation,
  scStarterCodeNormSlackForConv,
  scStarterCodeNormFacebookForConv
];

const errorNoCloudantUrl = 'cloudant_url absent in cloudant credentials.';
const errorNoCloudantAuthDbName =
  'cloudant_auth_dbname absent in cloudant credentials.';
const errorNoCloudantAuthKey =
  'cloudant_auth_key absent in cloudant credentials.';
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

describe('Auth Db:: checkCloudantCredentials()', () => {
  actions.forEach(action => {
    it(`${action.name}: throws AssertionError when cloudant_url missing.`, () => {
      const func = action.checkCloudantCredentials;

      try {
        func({
          cloudant_auth_dbname: 'abc',
          cloudant_auth_key: '123'
        });
      } catch (e) {
        assert.equal('AssertionError', e.name);
        assert.equal(e.message, errorNoCloudantUrl);
      }
    });

    it(`${action.name}: throws AssertionError when cloudant_auth_dbname missing.`, () => {
      const func = action.checkCloudantCredentials;

      try {
        func({
          cloudant_url: 'https://some-cloudant-url.com',
          cloudant_auth_key: '123'
        });
      } catch (e) {
        assert.equal('AssertionError', e.name);
        assert.equal(e.message, errorNoCloudantAuthDbName);
      }
    });

    it(`${action.name}: throws AssertionError when cloudant_auth_key missing.`, () => {
      const func = action.checkCloudantCredentials;

      try {
        func({
          cloudant_url: 'https://some-cloudant-url.com',
          cloudant_auth_dbname: 'abc'
        });
      } catch (e) {
        assert.equal('AssertionError', e.name);
        assert.equal(e.message, errorNoCloudantAuthKey);
      }
    });
  });
});

describe('Auth Db:: getCloudantCreds()', () => {
  actions.forEach(action => {
    it(`${action.name}: should get Cloudant credentials from Openwhisk package annotations.`, () => {
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

      const owUrl = `https://${apiHost}/api/v1/namespaces`;

      const mock = nock(owUrl)
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

    it(`${action.name}: should throw error from Openwhisk when getting package annotations.`, () => {
      const mockResponse = { name: 'OpenWhiskError', message: 'Not Found' };

      const apiHost = process.env.__OW_API_HOST;
      const namespace = process.env.__OW_NAMESPACE;
      const packageName = process.env.__OW_ACTION_NAME.split('/')[2];

      const owUrl = `https://${apiHost}/api/v1/namespaces`;

      const mock = nock(owUrl)
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
