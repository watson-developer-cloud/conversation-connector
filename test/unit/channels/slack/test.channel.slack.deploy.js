'use strict';

/**
 * Slack channel deploy action unit tests.
 */

const assert = require('assert');
const nock = require('nock');
const slackDeploy = require('./../../../../channels/slack/deploy/index.js');
const slackBindings = require('./../../../resources/slack-bindings.json').slack;
const openwhiskBindings = require('./../../../resources/openwhisk-bindings.json').openwhisk;

const errorBadHmacState = 'Security hash does not match hash from the server.';
const errorMissingSlackCredentials = 'Not enough slack credentials provided.';
const errorNoAccessToken = 'No access token found in http request.';
const errorNoBotCredentials = 'No bot credentials found in http request.';
const errorNoBotUserId = 'No bot ID found in http request.';
const errorNoResponseBody = 'No response body found in http request.';
const errorNoVerificationState = 'No verification state provided.';
const errorNoVerificationToken = 'No verification token provided.';
const errorPackageUpdateFailure = `PUT https://ibm.com/api/v1/namespaces/${openwhiskBindings.namespace}/packages/slack Returned HTTP 403 (Forbidden) --> "Response Missing Error Message."`;
const resultMessage = 'Authorized successfully!';

describe('Slack Deploy Unit Tests', () => {
  let mock;
  let params;
  let returnedResult;

  beforeEach(() => {
    params = {
      verification_token: slackBindings.verification_token,
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
  });

  it('validate slack/deploy works as intended', () => {
    mock = nock('https://slack.com')
      .get('/api/oauth.access')
      .query(() => {
        return true;
      })
      .reply(200, returnedResult);

    return slackDeploy(params).then(
      result => {
        if (!mock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server did not get called.');
        }
        nock.cleanAll();
        assert.equal(result.body, resultMessage);
      },
      error => {
        nock.cleanAll();
        assert(false, error);
      }
    );
  }).timeout(4000);

  it('validate error when no verification token provided', () => {
    delete params.verification_token;

    return slackDeploy(params).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorNoVerificationToken);
      }
    );
  });

  it('validate error when no verification state provided', () => {
    delete params.state;

    return slackDeploy(params).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorNoVerificationState);
      }
    );
  });

  it('validate error when no client id provided', () => {
    delete params.client_id;

    return slackDeploy(params).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorMissingSlackCredentials);
      }
    );
  });

  it('validate error when no client secret provided', () => {
    delete params.client_secret;

    return slackDeploy(params).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorMissingSlackCredentials);
      }
    );
  });

  it('validate error when no redirect uri provided', () => {
    delete params.redirect_uri;

    return slackDeploy(params).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorMissingSlackCredentials);
      }
    );
  });

  it('validate error when no code provided', () => {
    delete params.code;

    return slackDeploy(params).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorMissingSlackCredentials);
      }
    );
  });

  it('validate error when server sends response with no body', () => {
    mock = nock('https://slack.com')
      .get('/api/oauth.access')
      .query(() => {
        return true;
      })
      .reply(200, undefined);

    return slackDeploy(params).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        if (!mock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server did not get called.');
        }
        nock.cleanAll();
        assert.equal(error.message, errorNoResponseBody);
      }
    );
  });

  it('validate error when server sends response with no access token', () => {
    delete returnedResult.access_token;

    mock = nock('https://slack.com')
      .get('/api/oauth.access')
      .query(() => {
        return true;
      })
      .reply(200, returnedResult);

    return slackDeploy(params).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        if (!mock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server did not get called.');
        }
        nock.cleanAll();
        assert.equal(error.message, errorNoAccessToken);
      }
    );
  });

  it('validate error when server sends response with no bot access token', () => {
    delete returnedResult.bot.bot_access_token;

    mock = nock('https://slack.com')
      .get('/api/oauth.access')
      .query(() => {
        return true;
      })
      .reply(200, returnedResult);

    return slackDeploy(params).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        if (!mock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server did not get called.');
        }
        nock.cleanAll();
        assert.equal(error.message, errorNoBotCredentials);
      }
    );
  });

  it('validate error when server sends response with no bot user id', () => {
    delete returnedResult.bot.bot_user_id;

    mock = nock('https://slack.com')
      .get('/api/oauth.access')
      .query(() => {
        return true;
      })
      .reply(200, returnedResult);

    return slackDeploy(params).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        if (!mock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server did not get called.');
        }
        nock.cleanAll();
        assert.equal(error.message, errorNoBotUserId);
      }
    );
  });

  it('validate error when state does not match hmac key', () => {
    params.state = 'bad_state';

    return slackDeploy(params).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorBadHmacState);
      }
    );
  });

  it('validate error when server responds not OK', () => {
    mock = nock('https://slack.com')
      .get('/api/oauth.access')
      .query(() => {
        return true;
      })
      .reply(400, 'Bad Result');

    return slackDeploy(params).then(
      () => {
        nock.cleanAll();
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        if (!mock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server did not get called.');
        }
        nock.cleanAll();
        assert.equal(error.statusCode, 400);
      }
    );
  });

  it('validate error when openwhisk cannot update package', () => {
    const apihost = process.env.__OW_API_HOST;
    process.env.__OW_API_HOST = 'https://ibm.com';

    mock = nock('https://slack.com')
      .get('/api/oauth.access')
      .query(() => {
        return true;
      })
      .reply(200, returnedResult);

    return slackDeploy(params).then(
      () => {
        nock.cleanAll();
        process.env.__OW_API_HOST = apihost;
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        if (!mock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock server did not get called.');
        }
        nock.cleanAll();
        process.env.__OW_API_HOST = apihost;
        assert.equal(error.message, errorPackageUpdateFailure);
      }
    );
  }).timeout(4000);
});
