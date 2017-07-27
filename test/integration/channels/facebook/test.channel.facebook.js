'use strict';

/**
 *  Facebook channel integration tests
 */
const assert = require('assert');
const openwhisk = require('openwhisk');
const openwhiskBindings = require('./../../../resources/openwhisk-bindings.json').openwhisk;
const facebookBindings = require('./../../../resources/facebook-bindings.json').facebook;

const actionFacebookPipeline = 'facebook/integration-pipeline';

describe('Facebook channel integration tests', () => {
  let ow;
  let facebookParams = {};
  const expectedPostResult = {
    text: 200,
    url: 'https://graph.facebook.com/v2.6/me/messages',
    params: {
      access_token: facebookBindings.page_access_token,
      message: {
        text: 'hello, world!'
      },
      recipient: facebookBindings.recipient
    }
  };

  beforeEach(done => {
    ow = openwhisk(openwhiskBindings);

    facebookParams = {
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

    return done();
  });

  it('validate facebook channel package works', done => {
    ow.actions
      .invoke({
        name: actionFacebookPipeline,
        params: facebookParams,
        blocking: true,
        result: true
      })
      .then(
        success => {
          try {
            assert.deepEqual(success, expectedPostResult);
            return done();
          } catch (e) {
            return done(e);
          }
        },
        error => {
          return done(error);
        }
      );
  })
    .timeout(8000)
    .retries(4);
});
