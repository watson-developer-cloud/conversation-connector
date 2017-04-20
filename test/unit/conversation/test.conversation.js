const assert = require('assert');
const conversation = require('./../../../conversation/conversation');

describe('conversation unit tests', () => {
  let params = {};

  beforeEach(() => {
    params = {
      event: {
        text: 'How is the weather?'
      },
      conversation: {
        username: '8d71b8fd-d5be-4845-b854-2256216d19fc',
        password: 'VI1AFqNj8XU2',
        workspace_id: 'aec72a70-8249-4e55-b56a-7541dcfd4dc9'
      }
    };
  });

  it('validate no username', () => {
    delete params.conversation.username;

    return conversation(params).then(
      (response) => {
        assert(false, response);
      },
      (e) => {
        assert.equal(
          e,
          'Conversation username not supplied or is not a string',
          'Should fail complaining about missing username'
        );
      }
    );
  });

  it('validate no password', () => {
    delete params.conversation.password;

    return conversation(params).then(
      (response) => {
        assert(false, response);
      },
      (e) => {
        assert.equal(
          e,
          'Conversation password not supplied or is not a string',
          'Should fail complaining about missing password'
        );
      }
    );
  });

  it('validate no workspace id', () => {
    delete params.conversation.workspace_id;

    return conversation(params).then(
      (response) => {
        assert(false, response);
      },
      (e) => {
        assert.equal(
          e,
          'Conversation workspace_id not supplied or is not a string',
          'Should fail complaining about missing workspace id'
        );
      }
    );
  });

  it('validate no user message', () => {
    delete params.event.text;

    return conversation(params).then(
      (response) => {
        assert(false, response);
      },
      (e) => {
        assert.equal(
          e,
          'No message supplied to send to the Conversation service.',
          'Should fail complaining about missing user message'
        );
      }
    );
  });

  it('validate no conversation object', () => {
    delete params.conversation;

    return conversation(params).then(
      (response) => {
        assert(false, response);
      },
      (e) => {
        assert.equal(
          e,
          'Illegal Argument Exception: parameters to call Conversation are not supplied.',
          'Should fail complaining about missing conversation object'
        );
      }
    );
  });

  it('validate wrong message type', () => {
    params.event.text = true;

    return conversation(params).then(
      (response) => {
        assert(false, response);
      },
      (e) => {
        assert.equal(
          e,
          'Message to send to Conversation must be of type string.',
          'Should fail complaining about wrong message type'
        );
      }
    );
  });
});
