'use strict';

const assert = require('assert');
const conversation = require('../../../conversation/call-conversation');
const openwhisk = require('openwhisk');
const fs = require('fs');
const path = require('path');

const options = {
  apihost: 'openwhisk.ng.bluemix.net',
  api_key: '5c5820ff-1e7a-44ae-b38a-7b70b215cb8c:N5WIu46RQxjmex1AmtY4fVyIXBEwRgjU17HYn0RVfNIVHggSWVHNKgnZlOMpaOZg'
};
const ow = openwhisk(options);

describe('conversation integration tests', () => {
  let params = {};

  const conversationObj = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '/../../resources/conversation-bindings.json'),
      'utf8'
    )
  );

  beforeEach(() => {
    params = {
      input: {
        text: 'Turn on lights'
      }
    };

    // merge the two objects, deep copying conversationObj so it doesn't get changed between tests
    // and we only have to read it once
    params = Object.assign(params, JSON.parse(JSON.stringify(conversationObj)));
  });

  it(' call using OpenWhisk module ', () => {
    const name = '/foropenwhisk_prod/conversation/call-conversation';
    const blocking = true;
    const result = true;

    delete params.conversation;

    // Have to call action twice since the first call really just setups the context
    return ow.actions
      .invoke({ name, blocking, result, params })
      .then(response1 => {
        params.context = response1.context;

        return ow.actions
          .invoke({ name, blocking, result, params })
          .then(response2 => {
            assert.equal(
              response2.output.text,
              "I'll turn on the lights for you.",
              'response from conversation does not contain expected answer'
            );
          });
      })
      .catch(e => {
        assert(false, e);
      });
  });

  it(' real working call similar to sequence approach', () => {
    // call Conversation once to kick off the conversation. The car dashboard workspace we are
    // using expects an initial prep call before returning real answers.
    return conversation(params).then(
      response => {
        params.context = response.context;

        // Make the real test call to conversation
        return conversation(params).then(
          responseInner => {
            assert.equal(
              responseInner.output.text,
              "I'll turn on the lights for you.",
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
  });

  it('real failing authentication call', () => {
    params.conversation.username = 'badusername';

    return conversation(params).then(
      response => {
        assert(false, response);
      },
      e => {
        assert.equal(
          e.code,
          '401',
          'expected conversation call to fail with 401 unauthorized status'
        );
      }
    );
  });

  it('real failing not valid workspace call', () => {
    params.conversation.workspace_id = 'badworkspace';

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
  });
});
