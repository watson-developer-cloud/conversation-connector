'use strict';

const assert = require('assert');
const conversation = require('../../../conversation/call-conversation');
const ConversationV1 = require('watson-developer-cloud/conversation/v1');
const openwhisk = require('openwhisk');

const options = {
  apihost: 'openwhisk.ng.bluemix.net',
  api_key: '5c5820ff-1e7a-44ae-b38a-7b70b215cb8c:N5WIu46RQxjmex1AmtY4fVyIXBEwRgjU17HYn0RVfNIVHggSWVHNKgnZlOMpaOZg'
};
const ow = openwhisk(options);

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

  it(' call using OpenWhisk module ', () => {
    const name = 'conversation/call-conversation';
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

  it('call through sdk using package bindings, no workspace_id provided', () => {
    delete params.conversation.workspace_id;

    const conversationSDK = new ConversationV1({
      username: params.conversation.username,
      password: params.conversation.password,
      version: 'v1',
      version_date: '2017-04-21',
      url: 'https://openwhisk.ng.bluemix.net/api/v1/namespaces/foropenwhisk_prod%2Fconversation/actions/call-conversation'
    });

    // call conversation twice, once to jump start conversation
    conversationSDK.message(
      {
        input: { text: params.input.text }
      },
      (err1, response1) => {
        if (err1) {
          assert(false, err1);
        } else {
          conversationSDK.message(
            {
              input: { text: params.input.text },
              context: response1.context
            },
            (err2, response2) => {
              if (err2) {
                assert(false, err2);
              } else {
                assert.equal(
                  response2.output.text,
                  "I'll turn on the lights for you.",
                  'response from conversation does not contain expected answer'
                );
              }
            }
          );
        }
      }
    );
  });

  it('call through sdk using supplied credentials', () => {});

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
