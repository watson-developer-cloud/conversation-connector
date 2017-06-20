'use strict';

const assert = require('assert');
const conversation = require('../../../conversation/call-conversation');
const packageBindings = require('../../resources/conversation-bindings.json').conversation;

describe('conversation unit tests', () => {
  let params = {};

  beforeEach(() => {
    params.conversation = {};
    params.conversation.input = { text: 'Turn on lights' };
    params = {
      conversation: {
        input: {
          text: 'Turn on lights'
        }
      },
      raw_input_data: {
        slack: {
          event: {
            text: 'Turn on lights'
          }
        },
        provider: 'slack'
      }
    };

    // merge the two objects, deep copying packageBindings so it doesn't get changed between tests
    // and we only have to read it once
    params = Object.assign(params, JSON.parse(JSON.stringify(packageBindings)));
  });

  it('validate no username', () => {
    delete params.username;

    return conversation(params).then(
      response => {
        assert(false, response);
      },
      e => {
        assert.equal(
          e,
          'Illegal Argument Exception: parameters to call Conversation are not supplied or are not' +
            ' bound to package.',
          'Should fail complaining about missing username'
        );
      }
    );
  });

  it('validate no password', () => {
    delete params.password;

    return conversation(params).then(
      response => {
        assert(false, response);
      },
      e => {
        assert.equal(
          e,
          'Illegal Argument Exception: parameters to call Conversation are not supplied or are not' +
            ' bound to package.',
          'Should fail complaining about missing password'
        );
      }
    );
  });

  it('validate no workspace id', () => {
    delete params.workspace_id;

    return conversation(params).then(
      response => {
        assert(false, response);
      },
      e => {
        assert.equal(
          e,
          'Illegal Argument Exception: parameters to call Conversation are not supplied or are not' +
            ' bound to package.',
          'Should fail complaining about missing workspace id'
        );
      }
    );
  });

  it('validate no user message', () => {
    delete params.conversation.input.text;

    return conversation(params).then(
      response => {
        assert(false, response);
      },
      e => {
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
      response => {
        assert(false, response);
      },
      e => {
        assert.equal(
          e,
          'No message supplied to send to the Conversation service.',
          'Should fail complaining about missing conversation object'
        );
      }
    );
  });

  it('validate no channel input data', () => {
    delete params.raw_input_data;

    return conversation(params).then(
      response => {
        assert(false, response);
      },
      e => {
        assert.equal(
          e,
          'No channel raw input data found.',
          'Should fail complaining about missing raw channel input data'
        );
      }
    );
  });
});
