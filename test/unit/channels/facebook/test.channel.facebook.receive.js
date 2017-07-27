'use strict';

/**
 *  Facebook channel receive action unit tests.
 */

const assert = require('assert');
const facebookBindings = require('./../../../resources/facebook-bindings.json').facebook;
const facebookReceive = require('./../../../../channels/facebook/receive/index.js');

const errorNoVerificationToken = 'No verification token provided.';
const errorNoAppSecret = 'No app secret provided.';
const errorNoXHubSignature = 'x-hub-signature header not found.';
const errorVerificationXHubSignature = 'Verfication of facebook signature header failed. Please make sure you are passing the correct app secret';
const errorNeitherVerificationNorMessageTypeRequest = {
  status: 403,
  text: 'Neither a message type request nor a verfication type request detected'
};

describe('Facebook Receive Unit Tests', () => {
  let challengeParams = {};
  let challengeResult = {};
  let messageParams = {};
  let messageResult = {};

  beforeEach(() => {
    messageParams = {
      __ow_headers: {
        'x-hub-signature': facebookBindings['x-hub-signature']
      },
      verification_token: facebookBindings.verification_token,
      app_secret: facebookBindings.app_secret,
      object: 'page',
      entry: [
        {
          id: facebookBindings.sender.id,
          time: 1458692752478,
          messaging: [
            {
              sender: facebookBindings.recipient,
              recipient: facebookBindings.sender,
              message: {
                text: 'hello, world!'
              }
            }
          ]
        }
      ]
    };

    challengeParams = {
      verification_token: facebookBindings.verification_token,
      app_secret: facebookBindings.app_secret,
      'hub.mode': 'subscribe',
      'hub.verify_token': facebookBindings.verification_token,
      'hub.challenge': 'challenge_token'
    };

    challengeResult = 'challenge_token';

    messageResult = {
      provider: 'facebook',
      facebook: {
        object: 'page',
        entry: [
          {
            id: facebookBindings.sender.id,
            time: 1458692752478,
            messaging: [
              {
                sender: facebookBindings.recipient,
                recipient: facebookBindings.sender,
                message: {
                  text: 'hello, world!'
                }
              }
            ]
          }
        ]
      }
    };
  });

  it('validate facebook/receive passes on challenge', () => {
    return facebookReceive(challengeParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      challengeMessage => {
        assert.deepEqual(challengeMessage, challengeResult);
      }
    );
  });

  it('validate facebook/receive receives a legit message request', () => {
    return facebookReceive(messageParams).then(
      result => {
        assert.deepEqual(result, messageResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate error when no verification token', () => {
    delete messageParams.verification_token;

    return facebookReceive(messageParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoVerificationToken);
      }
    );
  });

  it('validate error when no app secret', () => {
    delete messageParams.app_secret;

    return facebookReceive(messageParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoAppSecret);
      }
    );
  });

  it('validate error when no verification signature header', () => {
    delete messageParams.__ow_headers['x-hub-signature'];

    return facebookReceive(messageParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoXHubSignature);
      }
    );
  });

  it('validate error when verification of x-hub-signature fails', () => {
    messageParams.app_secret = '123';

    return facebookReceive(messageParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorVerificationXHubSignature);
      }
    );
  });

  it('validate error when bad verification token', () => {
    challengeParams.verification_token = '123';

    return facebookReceive(challengeParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.deepEqual(error, errorNeitherVerificationNorMessageTypeRequest);
      }
    );
  });

  it('validate error when challenge header hub.mode is not equal to subscribe', () => {
    challengeParams['hub.mode'] = 'something_else';

    return facebookReceive(challengeParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.deepEqual(error, errorNeitherVerificationNorMessageTypeRequest);
      }
    );
  });

  it('validate error when message request object is not equal to page', () => {
    messageParams.object = 'something_else';

    return facebookReceive(messageParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.deepEqual(error, errorNeitherVerificationNorMessageTypeRequest);
      }
    );
  });
});
