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
  let auth;

  const cloudantUrl = 'https://some-cloudant-url.com';
  const cloudantAuthDbName = 'abc';
  const cloudantAuthKey = '123';

  const apiHost = process.env.__OW_API_HOST;
  const namespace = process.env.__OW_NAMESPACE;
  const packageName = process.env.__OW_ACTION_NAME.split('/')[2];

  const convoUrl = 'https://ibm.com:80';

  let owMock;
  const owHost = `https://${apiHost}`;
  let cloudantMock;

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
        provider: 'slack'
      }
    };

    auth = {
      conversation: {
        username: envParams.__TEST_CONVERSATION_USERNAME,
        password: envParams.__TEST_CONVERSATION_PASSWORD,
        workspace_id: envParams.__TEST_CONVERSATION_WORKSPACE_ID
      }
    };

    nock.cleanAll();
    owMock = createOpenwhiskMock();
    cloudantMock = createCloudantMock();
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
    params.url = convoUrl;

    return func(params).then(
      result => {
        if (!cloudantMock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!owMock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
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
    params.url = convoUrl;

    return func(params).then(
      result => {
        if (!cloudantMock.isDone()) {
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!owMock.isDone()) {
          assert(false, 'Mock OW Get server did not get called.');
        }
        assert.deepEqual(result, expected);
      },
      error => {
        assert(false, error);
      }
    );
  }).retries(4);

  it('main should throw error when Conversation returns a non-200', () => {
    func = conversation.main;
    params.url = convoUrl;

    return func(params).then(
      result => {
        if (!cloudantMock.isDone()) {
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!owMock.isDone()) {
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

    nock.cleanAll();
    owMock = createOpenwhiskMock();
    createConversationUrlMock();
    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, badAuth);

    func = conversation.main;
    return func(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(e => {
        if (!mockCloudantGet.isDone()) {
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!owMock.isDone()) {
          assert(false, 'Mock OW Get server did not get called.');
        }
        assert.equal('AssertionError', e.name);
        assert.equal(errorNoConversationObjInAuth, e.message);
      });
  });

  it('should throw AssertionError for missing conversation username in auth data', () => {
    const badAuth = auth;
    delete badAuth.conversation.username;

    nock.cleanAll();
    owMock = createOpenwhiskMock();
    createConversationUrlMock();
    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, badAuth);

    func = conversation.main;
    return func(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(e => {
        if (!mockCloudantGet.isDone()) {
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!owMock.isDone()) {
          assert(false, 'Mock OW Get server did not get called.');
        }
        assert.equal('AssertionError', e.name);
        assert.equal(errorNoConversationUsernameInAuth, e.message);
      });
  });

  it('should throw AssertionError for missing conversation password in auth data', () => {
    const badAuth = auth;
    delete badAuth.conversation.password;

    nock.cleanAll();
    owMock = createOpenwhiskMock();
    createConversationUrlMock();
    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, badAuth);

    func = conversation.main;
    return func(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(e => {
        if (!mockCloudantGet.isDone()) {
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!owMock.isDone()) {
          assert(false, 'Mock OW Get server did not get called.');
        }
        assert.equal('AssertionError', e.name);
        assert.equal(errorNoConversationPassInAuth, e.message);
      });
  });

  it('should throw AssertionError for missing conversation workspace_id in auth data', () => {
    const badAuth = auth;
    delete badAuth.conversation.workspace_id;

    nock.cleanAll();
    owMock = createOpenwhiskMock();
    createConversationUrlMock();
    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, badAuth);

    func = conversation.main;
    return func(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(e => {
        if (!mockCloudantGet.isDone()) {
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!owMock.isDone()) {
          assert(false, 'Mock OW Get server did not get called.');
        }
        assert.equal('AssertionError', e.name);
        assert.equal(errorNoConversationWorkspaceIdInAuth, e.message);
      });
  });

  it('should throw Conversation error for wrong conversation workspace_id', () => {
    const badAuth = auth;
    badAuth.conversation.workspace_id = badWorkspaceId;

    nock.cleanAll();
    owMock = createOpenwhiskMock();
    createConversationUrlMock();
    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, badAuth);

    params.url = convoUrl;

    func = conversation.main;
    return func(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(e => {
        if (!mockCloudantGet.isDone()) {
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!owMock.isDone()) {
          assert(false, 'Mock OW Get server did not get called.');
        }
        assert.equal(errorIncorrectConversationWorkspaceIdInAuth, e.message);
      });
  });

  it('validate error when conversation message throws error', () => {
    nock.cleanAll();
    owMock = createOpenwhiskMock();
    cloudantMock = createCloudantMock();
    nock(convoUrl)
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
      .reply(500, convoErrorResponse)
      .post(uri => {
        return uri.indexOf(
          `/v1/workspaces/${badWorkspaceId}/message?version=`
        ) === 0;
      })
      .reply(500, convoIncorrectWorkspaceIdResponse);

    params.url = convoUrl;

    return conversation
      .main(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.equal(error.message, mockError);
      });
  }).retries(4);

  it('validate error when create cloudant object is init on null url', () => {
    return conversation
      .createCloudantObj(null)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly');
      })
      .catch(error => {
        assert.equal(error.message, 'invalid url');
      });
  });

  it('validate error when retrieve doc throws an error', () => {
    nock.cleanAll();
    createOpenwhiskMock();

    nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(true)
      .replyWithError({ statusCode: 400, message: mockError });

    nock(`https://${cloudantUrl.split('@')[1]}`)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(true)
      .reply(200, auth)
      .put(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .reply(200, {});

    const cloudantCreds = {
      cloudant_url: cloudantUrl,
      cloudant_auth_dbname: cloudantAuthDbName,
      cloudant_auth_key: cloudantAuthKey
    };

    return conversation
      .loadAuth(cloudantCreds)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error.description, mockError);
      });
  });

  function createOpenwhiskMock() {
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

    return nock(owHost)
      .get(`/api/v1/namespaces/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);
  }

  function createCloudantMock() {
    return nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(true)
      .reply(200, auth);
  }

  function createConversationUrlMock() {
    return nock(convoUrl)
      .post(uri => {
        return uri.indexOf(
          `/v1/workspaces/${envParams.__TEST_CONVERSATION_WORKSPACE_ID}/message?version=`
        ) === 0;
      })
      .reply(200, convoResponse)
      .post(uri => {
        return uri.indexOf(
          `/v1/workspaces/${envParams.__TEST_CONVERSATION_WORKSPACE_ID}/message?version=`
        ) === 0;
      })
      .reply(500, convoErrorResponse)
      .post(uri => {
        return uri.indexOf(
          `/v1/workspaces/${badWorkspaceId}/message?version=`
        ) === 0;
      })
      .reply(500, convoIncorrectWorkspaceIdResponse);
  }
});
