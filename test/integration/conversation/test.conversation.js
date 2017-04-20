'use strict';

const assert = require('assert');
const conversation = require('./../../../conversation/conversation');

describe('conversation integration tests', () => {
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

  it(' real working call', () => {
    return conversation(params).then(
      (response) => {
        assert.equal(
          response.output.text,
          'the weather is fine',
          'response from conversation does not contain expected answer'
        );
      },
      (e) => {
        assert(false, e);
      }
    );
  });

  it('real failing authentication call', () => {
    params.conversation.username = 'badusername';

    return conversation(params).then(
      (response) => {
        assert(false, response);
      },
      (e) => {
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
      (response) => {
        assert(false, response);
      },
      (e) => {
        assert.equal(
          e.error,
          'URL workspaceid parameter is not a valid GUID.',
          'call should fail as specified workspace does not exist'
        );
      }
    );
  });
});
