'use strict';

const assert = require('assert');
const openwhisk = require('openwhisk');

const openwhiskBindings = require('./../resources/openwhisk-bindings.json').openwhisk;
const safeExtractErrorMessage = require('./../resources/helper-methods.js').safeExtractErrorMessage;
const facebookBindings = require('./../resources/facebook-bindings.json').facebook;
const conversationBindings = require('./../resources/conversation-bindings.json').conversation;
const cloudantBindings = require('./../resources/cloudant-bindings.json');

const clearContextDb = require('./../utils/cloudant-utils.js').clearContextDb;

const carDashboardReplyWelcome = 'Hi. It looks like a nice drive today. What would you like me to do?  ';
const carDashboardReplyLights = "I'll turn on the lights for you.";
/**
 * Facebook prerequisites test suite verifies the Facebook package is properly deployed in OpenWhisk
 */
describe('End-to-End tests: Facebook prerequisites', () => {
  const ow = openwhisk(openwhiskBindings);

  const requiredActions = [
    'facebook/post',
    'facebook/receive',
    'facebook/deploy',
    'starter-code/normalize-conversation-for-facebook',
    'starter-code/normalize-facebook-for-conversation'
  ];

  requiredActions.forEach(action => {
    it(`${action} action is deployed in OpenWhisk namespace`, () => {
      return ow.actions.get({ name: action }).then(
        () => {},
        error => {
          assert(
            false,
            `${action}, ${safeExtractErrorMessage(error)} Try running setup scripts again.`
          );
        }
      );
    });
  });
});

describe('End-to-End tests: Facebook as channel package', () => {
  const ow = openwhisk(openwhiskBindings);
  const actionFacebookPipeline = 'test-pipeline-facebook';
  let params = {};

  const expectedResult = {
    text: 200,
    url: 'https://graph.facebook.com/v2.6/me/messages',
    params: {
      access_token: facebookBindings.page_access_token,
      message: {
        text: carDashboardReplyWelcome
      },
      recipient: facebookBindings.recipient,
      workspace_id: conversationBindings.workspace_id
    }
  };

  beforeEach(() => {
    params = {
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
  });

  // Under validated circumstances, the channel (mocked parameters here) will send parameters
  // to facebook/receive. The architecture will flow the response to facebook/post, and
  // facebook/post will send its response to this ow.action invocation.
  it('system works under validated circumstances', () => {
    return ow.actions
      .invoke({
        name: actionFacebookPipeline,
        result: true,
        blocking: true,
        params
      })
      .then(
        result => {
          return assert.deepEqual(result, expectedResult);
        },
        error => {
          return assert(false, safeExtractErrorMessage(error));
        }
      );
  })
    .timeout(4000)
    .retries(4);
});

describe('End-to-End tests: Facebook context package works', () => {
  const ow = openwhisk(openwhiskBindings);
  const contextPipeline = 'test-pipeline-context-facebook';
  let params = {};

  const expAfterTurn1 = {
    text: 200,
    url: 'https://graph.facebook.com/v2.6/me/messages',
    params: {
      access_token: facebookBindings.page_access_token,
      message: {
        text: carDashboardReplyWelcome
      },
      recipient: facebookBindings.recipient,
      workspace_id: conversationBindings.workspace_id
    }
  };

  const expAfterTurn2 = {
    text: 200,
    url: 'https://graph.facebook.com/v2.6/me/messages',
    params: {
      access_token: facebookBindings.page_access_token,
      message: {
        text: carDashboardReplyLights
      },
      recipient: facebookBindings.recipient,
      workspace_id: conversationBindings.workspace_id
    }
  };

  beforeEach(() => {
    params = {
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
  });

  // Under validated circumstances, context package should load and save context
  // to complete a single-turn conversation successfully.
  it('context pipeline works for single Conversation turn', () => {
    return clearContextDb(
      cloudantBindings.database.dbname,
      cloudantBindings.database.cloudant_url
    ).then(() => {
      return ow.actions
        .invoke({
          name: contextPipeline,
          result: true,
          blocking: true,
          params
        })
        .then(
          result => {
            return assert.deepEqual(result, expAfterTurn1);
          },
          error => {
            return assert(false, safeExtractErrorMessage(error));
          }
        );
    });
  })
    .timeout(8000)
    .retries(4);

  // Under validated circumstances, context package should load and save context
  // to complete a multi-turn conversation successfully.
  it('context pipeline works for multiple Conversation turns', () => {
    return clearContextDb(
      cloudantBindings.database.dbname,
      cloudantBindings.database.cloudant_url
    ).then(() => {
      return ow.actions
        .invoke({
          name: contextPipeline,
          result: true,
          blocking: true,
          params
        })
        .then(result => {
          assert.deepEqual(result, expAfterTurn1);

          // Change the input text for the second turn.
          params.entry[0].messaging[0].message.text = 'Turn on the lights';
          // Change the signature header value for the second turn.
          params.__ow_headers[
            'x-hub-signature'
          ] = 'sha1=b64a5b4775828d69b5bcdd2bb580967dad9b0268';
          // Invoke the context pipeline sequence again.
          // The context package should read the updated context from the previous turn.
          return ow.actions.invoke({
            name: contextPipeline,
            result: true,
            blocking: true,
            params
          });
        })
        .then(result => {
          return assert.deepEqual(result, expAfterTurn2);
        })
        .catch(err => {
          return assert(false, safeExtractErrorMessage(err));
        });
    });
  })
    .timeout(8000)
    .retries(4);
});
