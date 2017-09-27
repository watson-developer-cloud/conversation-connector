'use strict';

/**
 * Facebook channel post action unit tests.
 */

const assert = require('assert');
const nock = require('nock');

process.env.__OW_ACTION_NAME = `/${process.env.__OW_NAMESPACE}/pipeline_pkg/action-to-test`;

const facebookPost = require('./../../../../channels/facebook/post/index.js');
const facebookBindings = require('./../../../resources/bindings/facebook-bindings.json').facebook;

const defaultPostUrl = 'https://graph.facebook.com/v2.6/me/messages';
const badUri = 'badlink.hi';
const movedUri = 'http://www.ibm.com';

const errorBadUri = `Invalid URI "${badUri}"`;
const errorMovedPermanently = 'Action returned with status code 301, message: Moved Permanently';
const errorNoPageAccessToken = 'auth.facebook.page_access_token not found.';
const errorNoRecipientId = 'Recepient id not provided.';
const errorNoMessageText = 'Message object not provided.';

describe('Facebook Post Unit Tests', () => {
  let postParams = {};
  let func;
  let auth;

  const cloudantUrl = 'https://some-cloudant-url.com';
  const cloudantAuthDbName = 'abc';
  const cloudantAuthKey = '123';

  const apiHost = process.env.__OW_API_HOST;
  const namespace = process.env.__OW_NAMESPACE;
  const packageName = process.env.__OW_ACTION_NAME.split('/')[2];

  const owUrl = `https://${apiHost}/api/v1/namespaces`;
  const expectedOW = {
    annotations: [
      {
        key: 'cloudant_url',
        value: cloudantUrl
      },
      {
        key: 'cloudant_auth_dbname',
        value: cloudantAuthDbName
      },
      {
        key: 'cloudant_auth_key',
        value: cloudantAuthKey
      }
    ]
  };

  const expectedResult = {
    text: 200,
    url: defaultPostUrl,
    params: {
      message: {
        text: 'Hello, World!'
      },
      recipient: facebookBindings.sender
    }
  };

  beforeEach(() => {
    postParams = {
      page_access_token: facebookBindings.page_access_token,
      message: {
        text: 'Hello, World!'
      },
      recipient: facebookBindings.sender
    };

    auth = {
      facebook: {
        app_secret: facebookBindings.app_secret,
        verification_token: facebookBindings.verification_token,
        page_access_token: facebookBindings.page_access_token
      }
    };
  });

  it('validate facebook/post works as intended', () => {
    func = facebookPost.main;
    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);

    return func(postParams).then(
      result => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        assert.deepEqual(expectedResult, result);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate error when bad uri supplied', () => {
    func = facebookPost.postFacebook;

    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);

    return func(postParams, badUri, postParams.page_access_token).then(
      result => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        assert(false, result);
      },
      error => {
        nock.cleanAll();
        assert(error, errorBadUri);
      }
    );
  });

  it('validate error when not 200 uri supplied', () => {
    func = facebookPost.postFacebook;

    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);

    return func(postParams, movedUri, postParams.page_access_token).then(
      result => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        assert(false, result);
      },
      error => {
        nock.cleanAll();
        assert(error, errorMovedPermanently);
      }
    );
  }).timeout(8000);

  it('validate error when page access token absent in auth', () => {
    func = facebookPost.main;

    const badAuth = {
      facebook: {
        app_secret: facebookBindings.app_secret,
        verification_token: facebookBindings.verification_token
      }
    };

    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, badAuth);

    return func(postParams).then(
      result => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        assert(false, result);
      },
      error => {
        assert.equal(error.name, 'AssertionError');
        assert.equal(error.message, errorNoPageAccessToken);
      }
    );
  });

  it('validate error when no recipient Id provided', () => {
    delete postParams.recipient;
    func = facebookPost.validateParameters;
    try {
      func(postParams);
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorNoRecipientId);
    }
  });

  it('validate error when no message text provided', () => {
    delete postParams.message;
    func = facebookPost.validateParameters;
    try {
      func(postParams);
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorNoMessageText);
    }
  });
});
