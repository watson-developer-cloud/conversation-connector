'use strict';

const assert = require('assert');
const conversation = require('../../../conversation/call-conversation');
const fs = require('fs');
const path = require('path');

describe('conversation unit tests', () => {
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
          'Illegal Argument Exception: parameters to call Conversation are not supplied or are not bound to package.',
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
