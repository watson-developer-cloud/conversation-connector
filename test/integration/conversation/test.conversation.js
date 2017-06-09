'use strict';

const assert = require('assert');
const conversation = require('../../../conversation/call-conversation');
const openwhisk = require('openwhisk');
const openWhiskAuthObj = require('../../resources/openwhisk-bindings.json').openwhisk;
const packageBindings = require('../../resources/conversation-bindings.json').conversation;

describe('conversation integration tests', () => {
  // Setup the ow module for the upcoming calls
  const options = {
    apihost: 'openwhisk.ng.bluemix.net',
    api_key: openWhiskAuthObj.api_key
  };
  const ow = openwhisk(options);

  let params = {};

  beforeEach(() => {
    params.conversation = {};
    params.conversation.input = { text: 'Turn on lights' };

    // merge the two objects, deep copying packageBindings so it doesn't get changed between tests
    // and we only have to read it once
    params = Object.assign(params, JSON.parse(JSON.stringify(packageBindings)));
  });

  it('call using OpenWhisk module ', () => {
    const name = 'conversation/call-conversation';
    const blocking = true;
    const result = true;

    // Call Conversation once to initiate the Conversation. The car-dashboard we are using for tests
    // always responds with a welcome message to the original user query.
    return ow.actions
      .invoke({ name, blocking, result, params })
      .then(response1 => {
        params.conversation.context = response1.context;

        // After getting the context, call Conversation again to get the true response to the user's
        // query (and not just the welcome message)
        return ow.actions
          .invoke({ name, blocking, result, params })
          .then(response2 => {
            assert.equal(
              response2.conversation.output.text[0],
              'Hi. It looks like a nice drive today. What would you like me to do?  ',
              'response from conversation does not contain expected answer'
            );
          });
      })
      .catch(e => {
        assert(false, e);
      });
  }).timeout(16000);

  it('real working call similar to sequence approach', () => {
    // call Conversation once to kick off the conversation. The car dashboard workspace we are
    // using expects an initial prep call before returning real answers.
    return conversation(params).then(
      response => {
        params.conversation.context = response.context;

        // Make the real test call to conversation
        return conversation(params).then(
          responseInner => {
            assert.equal(
              responseInner.conversation.output.text[0],
              'Hi. It looks like a nice drive today. What would you like me to do?  ',
              'response from conversation does not contain expected answer'
            );
          },
          e => {
            assert(false, e);
          }
        );
      },
      e => {
        assert(false, e);
      }
    );
  }).timeout(16000);

  it('real failing authentication call', () => {
    params.username = 'badusername';

    return conversation(params).then(
      response => {
        assert(false, response);
      },
      e => {
        assert.equal(
          e.code,
          401,
          'expected conversation call to fail with 401 unauthorized status'
        );
      }
    );
  }).timeout(4000);

  it('real failing not valid workspace call', () => {
    params.workspace_id = 'badworkspace';

    return conversation(params).then(
      response => {
        assert(false, response);
      },
      e => {
        assert.equal(
          e.error,
          'URL workspaceid parameter is not a valid GUID.',
          'call should fail as specified workspace does not exist'
        );
      }
    );
  }).timeout(8000);
});
