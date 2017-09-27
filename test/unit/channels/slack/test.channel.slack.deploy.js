'use strict';

/**
 * Slack channel deploy action unit tests.
 */

const assert = require('assert');
const nock = require('nock');

process.env.__OW_ACTION_NAME = `/${process.env.__OW_NAMESPACE}/pipeline_pkg/action-to-test`;

const scSlackDeploy = require('./../../../../channels/slack/deploy/index.js');

const slackBindings = require('./../../../resources/bindings/slack-bindings.json')
  .slack;

const errorBadHmacState = 'Security hash does not match hash from the server.';
const errorMissingSlackCode = 'No code provided in params.';
const errorNoAccessToken = 'No access token found in http request.';
const errorNoBotCredentials = 'No bot credentials found in http request.';
const errorNoBotUserId = 'No bot ID found in http request.';
const errorNoResponseBody = 'No response body found in http request.';
const errorNoVerificationState = 'No verification state provided.';
const errorMissingCloudantUrl = 'cloudant_url absent in cloudant credentials.';
const errorMissingCloudantAuthDbName =
  'cloudant_auth_dbname absent in cloudant credentials.';
const resultMessage = 'Authorized successfully!';

describe('Slack Deploy Unit Tests: main()', () => {
  let params;
  let returnedResult;
  let initAuth;

  const func = scSlackDeploy.main;

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

  beforeEach(() => {
    params = {
      state: slackBindings.state,
      client_id: slackBindings.client_id,
      client_secret: slackBindings.client_secret,
      redirect_uri: slackBindings.redirect_uri,
      code: 'code'
    };

    returnedResult = {
      access_token: slackBindings.access_token,
      scope: 'bot,chat:write:bot',
      team_name: 'Converastion Whisk Test Bot',
      team_id: 'XXXXXXXXXX',
      incoming_webhook: {
        url: 'https://hooks.slack.com/TXXXXX/XXXXXXXXXX',
        channel: slackBindings.channel,
        configuration_url: 'https://teamname.slack.com/services/BXXXX'
      },
      bot: {
        bot_user_id: slackBindings.bot_user_id,
        bot_access_token: slackBindings.bot_access_token
      }
    };
    initAuth = {
      slack: {
        client_id: params.client_id,
        client_secret: params.client_secret,
        verification_token: '123'
      }
    };
  });

  it('validate slack/deploy works as intended', () => {
    const updatedAuth = {
      slack: {
        client_id: 'xxx',
        client_secret: 'yyy',
        verification_token: '123',
        access_token: 'xxxxxx',
        bot_access_token: 'xxxxx'
      }
    };

    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockSlack = nock('https://slack.com')
      .get('/api/oauth.access')
      .query(() => {
        return true;
      })
      .reply(200, returnedResult);

    const mockCloudantGet2 = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, initAuth);

    const mockCloudantPut = nock(cloudantUrl)
      .put(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, updatedAuth);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, initAuth);

    return func(params).then(
      result => {
        if (!mockSlack.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Slack server did not get called.');
        }
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(
            false,
            'Mock Cloudant Get server did not get called the first time.'
          );
        }
        if (!mockCloudantGet2.isDone()) {
          nock.cleanAll();
          assert(
            false,
            'Mock Cloudant Get server did not get called the second time.'
          );
        }
        if (!mockCloudantPut.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Put server did not get called.');
        }

        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        nock.cleanAll();
        assert.equal(result.status, resultMessage);
      },
      error => {
        nock.cleanAll();
        assert(false, error);
      }
    );
  }).timeout(4000);

  it('validate error when server responds not OK', () => {
    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mock = nock('https://slack.com')
      .get('/api/oauth.access')
      .query(() => {
        return true;
      })
      .reply(400, 'Bad Result');

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, initAuth);

    return func(params).then(
      () => {
        nock.cleanAll();
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        if (!mock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server did not get called.');
        }
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(
            false,
            'Mock Cloudant Get server did not get called the first time.'
          );
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        nock.cleanAll();
        assert.equal(error.statusCode, 400);
      }
    );
  });

  it('validate error when state does not match hmac key', () => {
    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, initAuth);

    params.state.signature = 'bad_state';

    return func(params).then(
      () => {
        nock.cleanAll();
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(
            false,
            'Mock Cloudant Get server did not get called the first time.'
          );
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        nock.cleanAll();
        assert.equal(error, errorBadHmacState);
      }
    );
  });
});

describe('Slack Deploy Unit Tests: validateAndPreprocessParameters()', () => {
  const func = scSlackDeploy.validateAndPreprocessParameters;

  it('validate error when no verification state provided', () => {
    try {
      func({});
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorNoVerificationState);
    }
  });

  it('validate error when no code provided', () => {
    try {
      func({ state: {} });
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorMissingSlackCode);
    }
  });

  it('validates that stringified state object works', () => {
    try {
      const cleanedParams = func({
        code: '122',
        state:
          '{%22signature%22:%22xxx%22,%22pipeline_name%22:%22slack-flexible-pipeline%22,%22redirect_uri%22:%22https://xxxx/deploy.http%22}'
      });
      assert(
        cleanedParams && cleanedParams.state && cleanedParams.state.signature
      );
      assert.deepEqual(
        {
          code: 122,
          state: {
            signature: 'xxx',
            pipeline_name: 'slack-flexible-pipeline',
            redirect_uri: 'https://xxxx/deploy.http'
          }
        },
        cleanedParams
      );
    } catch (e) {
      assert(false, e);
    }
  });
});

describe('Slack Deploy Unit Tests: validateResponseBody()', () => {
  const func = scSlackDeploy.validateResponseBody;

  it('validate error when server sends response with no body', () => {
    try {
      func();
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorNoResponseBody);
    }
  });

  it('validate error when server sends response with no access token', () => {
    try {
      func({});
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorNoAccessToken);
    }
  });

  it('validate error when server sends response with no bot access token', () => {
    try {
      func({ access_token: 'xyz' });
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorNoBotCredentials);
    }
  });

  it('validate error when server sends response with no bot user id', () => {
    try {
      func({ access_token: 'xyz', bot: { bot_access_token: 'abc' } });
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorNoBotUserId);
    }
  });
});

describe('Slack Deploy Unit Tests: checkCloudantCredentials()', () => {
  const func = scSlackDeploy.checkCloudantCredentials;

  it('validate error when cloudant_url absent', () => {
    try {
      func({});
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorMissingCloudantUrl);
    }
  });

  it('validate error when cloudant_auth_dbname absent', () => {
    try {
      func({ cloudant_url: 'https://some-url' });
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorMissingCloudantAuthDbName);
    }
  });
});
