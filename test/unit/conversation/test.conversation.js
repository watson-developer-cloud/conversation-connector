'use strict';

const assert = require('assert');
const nock = require('nock');

process.env.__OW_ACTION_NAME = `/${process.env.__OW_NAMESPACE}/pipeline_pkg/action-to-test`;

const conversation = require('../../../conversation/call-conversation');
const conversationBindings = require('../../resources/bindings/conversation-bindings.json').conversation;

const badWorkspaceId = 'bad_workspace_id';

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
  let auth;

  const cloudantUrl = 'https://some-cloudant-url.com';
  const cloudantAuthDbName = 'abc';
  const cloudantAuthKey = '123';

  const apiHost = process.env.__OW_API_HOST;
  const namespace = process.env.__OW_NAMESPACE;
  const packageName = process.env.__OW_ACTION_NAME.split('/')[2];

  const convoUrl = 'https://ibm.com:80';

  const convoResponse = {
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

  const convoErrorResponse = {
    error: 'Internal Server Error'
  };

  const convoIncorrectWorkspaceIdResponse = {
    error: `URL workspaceid parameter ${badWorkspaceId} is not a valid GUID.`
  };

  const owUrl = `https://${apiHost}/api/v1/namespaces`;
  const expectedOW = {
    annotations: [
      {
        key: 'cloudant_url',
        value: cloudantUrl
      },
      {
        key: 'cloudant_auth_dbname',
        value: cloudantAuthDbName
      },
      {
        key: 'cloudant_auth_key',
        value: cloudantAuthKey
      }
    ]
  };

  before(() => {
    nock(convoUrl)
      .post(
        `/v1/workspaces/${conversationBindings.workspace_id}/message?version=${conversationBindings.version_date}`
      )
      .reply(200, convoResponse)
      .post(
        `/v1/workspaces/${conversationBindings.workspace_id}/message?version=${conversationBindings.version_date}`
      )
      .reply(500, convoErrorResponse)
      .post(
        `/v1/workspaces/${badWorkspaceId}/message?version=${conversationBindings.version_date}`
      )
      .reply(500, convoIncorrectWorkspaceIdResponse);
  });

  after(() => {
    nock.cleanAll();
  });

  beforeEach(() => {
    params = {
      version: conversationBindings.version,
      version_date: conversationBindings.version_date,
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

    auth = {
      conversation: {
        username: conversationBindings.username,
        password: conversationBindings.password,
        workspace_id: conversationBindings.workspace_id
      }
    };
  });

  it('should throw AssertionError for missing conversation input', () => {
    delete params.conversation.input;

    func = conversation.validateParams;
    try {
      func(params);
    } catch (e) {
      assert.equal(e.name, 'AssertionError');
      assert.equal(e.message, errorNoConversationInput);
    }
  });

  it('should throw AssertionError for missing provider info', () => {
    delete params.raw_input_data.provider;

    func = conversation.validateParams;
    try {
      func(params);
    } catch (e) {
      assert.equal(e.name, 'AssertionError');
      assert.equal(e.message, errorNoProvider);
    }
  });

  it('main works all ok', () => {
    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const authResp = {
      conversation: {
        username: conversationBindings.username,
        password: conversationBindings.password,
        workspace_id: conversationBindings.workspace_id
      }
    };
    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, authResp);

    func = conversation.main;
    params.url = convoUrl;

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
        conversation: {
          input: {
            text: 'Turn on lights'
          }
        }
      }
    };

    return func(params).then(
      result => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        assert.deepEqual(result, expected);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('main should throw error when Conversation returns a non-200', () => {
    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const authResp = {
      conversation: {
        username: conversationBindings.username,
        password: conversationBindings.password,
        workspace_id: conversationBindings.workspace_id
      }
    };
    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, authResp);

    func = conversation.main;
    params.url = convoUrl;

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
        conversation: {
          input: {
            text: 'Turn on lights'
          }
        }
      }
    };

    return func(params).then(
      result => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        assert.deepEqual(result, expected);
      },
      error => {
        assert(error, conversationErrorMsg);
      }
    );
  });

  it('should throw AssertionError for missing conversation object in auth data', () => {
    const badAuth = auth;
    delete badAuth.conversation;

    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, badAuth);

    func = conversation.main;
    func(params).then().catch(e => {
      if (!mockCloudantGet.isDone()) {
        nock.cleanAll();
        assert(false, 'Mock Cloudant Get server did not get called.');
      }
      if (!mockOW.isDone()) {
        nock.cleanAll();
        assert(false, 'Mock OW Get server did not get called.');
      }
      assert('AssertionError', e.name);
      assert(errorNoConversationObjInAuth, e.message);
    });
  });

  it('should throw AssertionError for missing conversation username in auth data', () => {
    const badAuth = auth;
    delete badAuth.conversation.username;

    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, badAuth);

    func = conversation.main;
    func(params).then().catch(e => {
      if (!mockCloudantGet.isDone()) {
        nock.cleanAll();
        assert(false, 'Mock Cloudant Get server did not get called.');
      }
      if (!mockOW.isDone()) {
        nock.cleanAll();
        assert(false, 'Mock OW Get server did not get called.');
      }
      assert('AssertionError', e.name);
      assert(errorNoConversationUsernameInAuth, e.message);
    });
  });

  it('should throw AssertionError for missing conversation password in auth data', () => {
    const badAuth = auth;
    delete badAuth.conversation.password;

    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, badAuth);

    func = conversation.main;
    func(params).then().catch(e => {
      if (!mockCloudantGet.isDone()) {
        nock.cleanAll();
        assert(false, 'Mock Cloudant Get server did not get called.');
      }
      if (!mockOW.isDone()) {
        nock.cleanAll();
        assert(false, 'Mock OW Get server did not get called.');
      }
      assert('AssertionError', e.name);
      assert(errorNoConversationPassInAuth, e.message);
    });
  });

  it('should throw AssertionError for missing conversation workspace_id in auth data', () => {
    const badAuth = auth;
    delete badAuth.conversation.workspace_id;

    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, badAuth);

    func = conversation.main;
    func(params).then().catch(e => {
      if (!mockCloudantGet.isDone()) {
        nock.cleanAll();
        assert(false, 'Mock Cloudant Get server did not get called.');
      }
      if (!mockOW.isDone()) {
        nock.cleanAll();
        assert(false, 'Mock OW Get server did not get called.');
      }
      assert('AssertionError', e.name);
      assert(errorNoConversationWorkspaceIdInAuth, e.message);
    });
  });

  it('should throw Conversation error for wrong conversation workspace_id', () => {
    const badAuth = auth;
    badAuth.conversation.workspace_id = badWorkspaceId;

    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, badAuth);

    func = conversation.main;
    func(params).then().catch(e => {
      if (!mockCloudantGet.isDone()) {
        nock.cleanAll();
        assert(false, 'Mock Cloudant Get server did not get called.');
      }
      if (!mockOW.isDone()) {
        nock.cleanAll();
        assert(false, 'Mock OW Get server did not get called.');
      }
      assert('AssertionError', e.name);
      assert(errorIncorrectConversationWorkspaceIdInAuth, e.message);
    });
  });
});
