'use strict';

const assert = require('assert');
const conversation = require('./../../../conversation/conversation');

describe('conversation integration tests', () => {
  let params = {};

  beforeEach(() => {
    params = {
      input: {
        text: 'Turn on lights'
      },
      conversation: {
        username: '1feae73c-1425-47b9-a808-a8f93b473075',
        password: 'g2VFeY8bly6t',
        workspace_id: '88c58211-3b88-4ebc-9a6a-f9328403ba12'
      }
    };
  });

  it(' real working call', () => {
    // call Conversation once to kick off the conversation. The car dashboard workspace we are using expects an initial
    // prep call before returning real answers.
    conversation(params).then(
      response => {
        params.context = response.context;

        // Make the real test call to conversation
        conversation(params).then(
          response => {
            console.log(response);
            assert.equal(
              response.output.text,
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
