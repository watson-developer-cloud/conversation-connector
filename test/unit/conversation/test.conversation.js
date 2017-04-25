'use strict';

const assert = require('assert');
const conversation = require('../../../conversation/call-conversation');

describe('conversation unit tests', () => {
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

  it('validate no username', () => {
    delete params.conversation.username;

    return conversation(params).then(
      response => {
        assert(false, response);
      },
      e => {
        assert.equal(
          e.message,
          'Conversation username not supplied or is not a string',
          'Should fail complaining about missing username'
        );
      }
    );
  });

  it('validate no password', () => {
    delete params.conversation.password;

    return conversation(params).then(
      response => {
        assert(false, response);
      },
      e => {
        assert.equal(
          e.message,
          'Conversation password not supplied or is not a string',
          'Should fail complaining about missing password'
        );
      }
    );
  });

  it('validate no workspace id', () => {
    delete params.conversation.workspace_id;

    return conversation(params).then(
      response => {
        assert(false, response);
      },
      e => {
        assert.equal(
          e.message,
          'Conversation workspace_id not supplied or is not a string',
          'Should fail complaining about missing workspace id'
        );
      }
    );
  });

  it('validate no user message', () => {
    delete params.input.text;

    return conversation(params).then(
      response => {
        assert(false, response);
      },
      e => {
        assert.equal(
          e.message,
          'No message supplied to send to the Conversation service.',
          'Should fail complaining about missing user message'
        );
      }
    );
  });

  it('validate no conversation object', () => {
    delete params.conversation;

    return conversation(params).then(
      response => {
        assert(false, response);
      },
      e => {
        assert.equal(
          e.message,
          'Illegal Argument Exception: parameters to call Conversation are not supplied.',
          'Should fail complaining about missing conversation object'
        );
      }
    );
  });

  it('validate wrong message type', () => {
    params.input.text = true;

    return conversation(params).then(
      response => {
        assert(false, response);
      },
      e => {
        assert.equal(
          e.message,
          'Message to send to Conversation must be of type string.',
          'Should fail complaining about wrong message type'
        );
      }
    );
  });
});
