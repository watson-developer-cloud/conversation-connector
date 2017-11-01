/**
 * Copyright IBM Corp. 2017
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an AS IS BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const assert = require('assert');
const nock = require('nock');

const envParams = process.env;

process.env.__OW_ACTION_NAME = `/${process.env.__OW_NAMESPACE}/pipeline_pkg/action-to-test`;

const conversation = require('../../../conversation/call-conversation');

const badWorkspaceId = 'bad_workspace_id';

const mockError = 'mock-error';
const errorNoConversationInput = 'No message supplied to send to the Conversation service.';
const errorNoProvider = 'No channel raw input data found.';
const errorNoConversationObjInAuth = 'conversation object absent in auth data.';
const errorNoConversationUsernameInAuth = 'conversation username absent in auth.conversation';
const errorNoConversationPassInAuth = 'conversation password absent in auth.conversation';
const errorNoConversationWorkspaceIdInAuth = 'conversation workspace_id absent in auth.conversation';
const errorIncorrectConversationWorkspaceIdInAuth = `URL workspaceid parameter ${badWorkspaceId} is not a valid GUID.`;
const conversationErrorMsg = 'Internal Server Error';

describe('conversation unit tests', () => {
  let params = {};
  let func;

  const conversationUrl = 'https://ibm.com:80';

  const conversationResponse = {
    intents: [],
    entities: [],
    input: {
      text: 'Turn on lights'
    },
    output: {
      log_messages: [],
      text: ['Hello from Watson Conversation!'],
      nodes_visited: ['node_1_1467221909631']
    },
    context: {
      conversation_id: '8a79f4db-382c-4d56-bb88-1b320edf9eae',
      system: {
        dialog_stack: ['root'],
        dialog_turn_counter: 1,
        dialog_request_counter: 1
      }
    }
  };

  const conversationErrorResponse = {
    error: 'Internal Server Error'
  };

  const conversationIncorrectWorkspaceIdResponse = {
    error: `URL workspaceid parameter ${badWorkspaceId} is not a valid GUID.`
  };

  const expected = {
    conversation: {
      intents: [],
      entities: [],
      input: {
        text: 'Turn on lights'
      },
      output: {
        log_messages: [],
        text: ['Hello from Watson Conversation!'],
        nodes_visited: ['node_1_1467221909631']
      },
      context: {
        conversation_id: '8a79f4db-382c-4d56-bb88-1b320edf9eae',
        system: {
          dialog_stack: ['root'],
          dialog_turn_counter: 1,
          dialog_request_counter: 1
        }
      }
    },
    raw_input_data: {
      slack: {
        event: {
          text: 'Turn on lights'
        }
      },
      provider: 'slack',
      auth: {
        conversation: {
          username: envParams.__TEST_CONVERSATION_USERNAME,
          password: envParams.__TEST_CONVERSATION_PASSWORD,
          workspace_id: envParams.__TEST_CONVERSATION_WORKSPACE_ID
        }
      },
      conversation: {
        input: {
          text: 'Turn on lights'
        }
      }
    }
  };

  before(() => {
    nock.disableNetConnect();
  });

  beforeEach(() => {
    params = {
      version: envParams.__TEST_CONVERSATION_VERSION,
      version_date: envParams.__TEST_CONVERSATION_VERSION_DATE,
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
        provider: 'slack',
        auth: {
          conversation: {
            username: envParams.__TEST_CONVERSATION_USERNAME,
            password: envParams.__TEST_CONVERSATION_PASSWORD,
            workspace_id: envParams.__TEST_CONVERSATION_WORKSPACE_ID
          }
        }
      }
    };

    nock.cleanAll();
    createConversationUrlMock();
  });

  it('should throw AssertionError for missing conversation input', () => {
    delete params.conversation.input;

    // func = conversation.validateParams;
    return conversation
      .main(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.equal(error.name, 'AssertionError');
        assert.equal(error.message, errorNoConversationInput);
      });
  });

  it('should throw AssertionError for missing provider info', () => {
    delete params.raw_input_data.provider;

    return conversation
      .main(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.equal(error.name, 'AssertionError');
        assert.equal(error.message, errorNoProvider);
      });
  });

  it('main works all ok', () => {
    func = conversation.main;
    params.url = conversationUrl;

    return func(params).then(
      result => {
        assert.deepEqual(result, expected);
      },
      error => {
        assert(false, error);
      }
    );
  }).retries(4);

  it('validate okay when conversation version and date not set', () => {
    delete params.version;
    delete params.version_date;

    func = conversation.main;
    params.url = conversationUrl;

    return func(params).then(
      result => {
        assert.deepEqual(result, expected);
      },
      error => {
        assert(false, error);
      }
    );
  }).retries(4);

  it('main should throw error when Conversation returns a non-200', () => {
    func = conversation.main;
    params.url = conversationUrl;

    return func(params).then(
      result => {
        assert.deepEqual(result, expected);
      },
      error => {
        assert(error, conversationErrorMsg);
      }
    );
  });

  it('should throw AssertionError for missing conversation object in auth data', () => {
    delete params.raw_input_data.auth.conversation;

    nock.cleanAll();
    createConversationUrlMock();

    func = conversation.main;
    return func(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(e => {
        assert.equal('AssertionError', e.name);
        assert.equal(errorNoConversationObjInAuth, e.message);
      });
  });

  it('should throw AssertionError for missing conversation username in auth data', () => {
    delete params.raw_input_data.auth.conversation.username;

    nock.cleanAll();
    createConversationUrlMock();

    func = conversation.main;
    return func(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(e => {
        assert.equal('AssertionError', e.name);
        assert.equal(errorNoConversationUsernameInAuth, e.message);
      });
  });

  it('should throw AssertionError for missing conversation password in auth data', () => {
    delete params.raw_input_data.auth.conversation.password;

    nock.cleanAll();
    createConversationUrlMock();

    func = conversation.main;
    return func(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(e => {
        assert.equal('AssertionError', e.name);
        assert.equal(errorNoConversationPassInAuth, e.message);
      });
  });

  it('should throw AssertionError for missing conversation workspace_id in auth data', () => {
    delete params.raw_input_data.auth.conversation.workspace_id;

    nock.cleanAll();
    createConversationUrlMock();

    func = conversation.main;
    return func(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(e => {
        assert.equal('AssertionError', e.name);
        assert.equal(errorNoConversationWorkspaceIdInAuth, e.message);
      });
  });

  it('should throw Conversation error for wrong conversation workspace_id', () => {
    params.raw_input_data.auth.conversation.workspace_id = badWorkspaceId;

    nock.cleanAll();
    createConversationUrlMock();

    params.url = conversationUrl;

    func = conversation.main;
    return func(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(e => {
        assert.equal(errorIncorrectConversationWorkspaceIdInAuth, e.message);
      });
  });

  it('validate error when conversation message throws error', () => {
    nock.cleanAll();
    nock(conversationUrl)
      .post(uri => {
        return uri.indexOf(
          `/v1/workspaces/${envParams.__TEST_CONVERSATION_WORKSPACE_ID}/message?version=`
        ) === 0;
      })
      .replyWithError(mockError)
      .post(uri => {
        return uri.indexOf(
          `/v1/workspaces/${envParams.__TEST_CONVERSATION_WORKSPACE_ID}/message?version=`
        ) === 0;
      })
      .reply(500, conversationErrorResponse)
      .post(uri => {
        return uri.indexOf(
          `/v1/workspaces/${badWorkspaceId}/message?version=`
        ) === 0;
      })
      .reply(500, conversationIncorrectWorkspaceIdResponse);

    params.url = conversationUrl;

    return conversation
      .main(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.equal(error.message, mockError);
      });
  }).retries(4);

  function createConversationUrlMock() {
    return nock(conversationUrl)
      .post(uri => {
        return uri.indexOf(
          `/v1/workspaces/${envParams.__TEST_CONVERSATION_WORKSPACE_ID}/message?version=`
        ) === 0;
      })
      .reply(200, conversationResponse)
      .post(uri => {
        return uri.indexOf(
          `/v1/workspaces/${envParams.__TEST_CONVERSATION_WORKSPACE_ID}/message?version=`
        ) === 0;
      })
      .reply(500, conversationErrorResponse)
      .post(uri => {
        return uri.indexOf(
          `/v1/workspaces/${badWorkspaceId}/message?version=`
        ) === 0;
      })
      .reply(500, conversationIncorrectWorkspaceIdResponse);
  }
});
