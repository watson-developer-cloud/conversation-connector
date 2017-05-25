'use strict';

const assert = require('assert');
const normalizeAction = require('../../../starter-code/normalize');
const openwhiskBindings = require('./../../resources/openwhisk-bindings.json').openwhisk;

const convoResponseJson = require('../../resources/test.unit.starter-code.json').convoResponseJson;
const normalizedParamsJson = require('../../resources/test.unit.starter-code.json').normalizedParamsJson;
const paramsJson = require('../../resources/test.unit.starter-code.json').paramsJson;

const errorOwCredentials = 'No openwhisk credentials provided.';
const errorUnknownProvider = 'non-supported channel';

describe('starter code unit tests', () => {
  it('validateResponseFromConversation ', () => {
    let convoResponseCopy = JSON.parse(
      JSON.stringify(convoResponseJson.response.result)
    );

    try {
      normalizeAction.validateResponseFromConversation(convoResponseCopy);
    } catch (e) {
      assert(
        false,
        `Expected validation to be successful but failed with ${e}`
      );
    }

    convoResponseCopy = JSON.parse(
      JSON.stringify(convoResponseJson.response.result)
    );

    delete convoResponseCopy.output;

    try {
      normalizeAction.validateResponseFromConversation(convoResponseCopy);
    } catch (e) {
      assert.equal(
        e.message,
        'Conversation call succeeded but a response to the user was not provided',
        'Expected failure due to lack of output object.'
      );
    }

    convoResponseCopy = JSON.parse(
      JSON.stringify(convoResponseJson.response.result)
    );

    convoResponseCopy.output = { text: 'Turn on lights' };

    try {
      normalizeAction.validateResponseFromConversation(convoResponseCopy);
    } catch (e) {
      assert.equal(
        e.message,
        'Conversation response provided but is not of expected type',
        'Got a response from Conversation but it is not a string'
      );
    }
  });

  it('postResponseToUser', () => {
    const normalizedParamsCopy = JSON.parse(
      JSON.stringify(normalizedParamsJson)
    );

    delete normalizedParamsCopy.provider;

    normalizeAction
      .postResponseToUser(null, null, normalizedParamsCopy)
      .then(() => {
        assert(false, 'Expected test to fail due to lack of provider field');
      })
      .catch(e => {
        assert.equal(
          e,
          'non-supported channel',
          'Expected failure as no channel specified'
        );
      });
  });

  it('normalizeSlack', () => {
    let paramsJsonCopy = JSON.parse(JSON.stringify(paramsJson));

    const normalizedJson = normalizeAction.normalizeSlack(paramsJsonCopy);

    assert.equal(
      normalizedJson.input.text,
      'Turn on lights',
      'Expected normalized json to contain input.text'
    );

    delete paramsJsonCopy.slack.event.text;

    try {
      normalizeAction.normalizeSlack(paramsJsonCopy);
    } catch (e) {
      assert.equal(
        e.message,
        'Unable to find message from user to send to Conversation.',
        'Slack Json does not contain message to send to Conversation'
      );
    }

    delete require.cache[
      require.resolve('../../resources/test.unit.starter-code.json')
    ];
    paramsJsonCopy = JSON.parse(JSON.stringify(paramsJson));

    paramsJsonCopy.slack.event.text = 1;

    try {
      normalizeAction.normalizeSlack(paramsJsonCopy);
    } catch (e) {
      assert.equal(
        e.message,
        'Currently only text messages are supported.',
        'Non-text based message sent from Slack'
      );
    }
  });

  it('normalizeParams', () => {
    const paramsJsonCopy = JSON.parse(JSON.stringify(paramsJson));

    const normalizedParams = normalizeAction.normalizeParams(paramsJsonCopy);

    assert.equal(
      normalizedParams.input.text,
      'Turn on lights',
      'Expected normalized json to contain input.text'
    );

    delete paramsJsonCopy.provider;

    try {
      normalizeAction.normalizeParams(paramsJsonCopy);
    } catch (e) {
      assert.equal(
        e.message,
        'non-supported channel',
        'Expected failure as no channel specified'
      );
    }
  });

  it('formConversationPayload', () => {
    const normalizedParamsCopy = JSON.parse(
      JSON.stringify(normalizedParamsJson)
    );

    const conversationPayload = normalizeAction.formConversationPayload(
      normalizedParamsCopy
    );

    assert.equal(
      conversationPayload.conversation.input.text,
      'Turn on lights',
      'Expected payload to contain user input.'
    );
  });

  it('validate error thrown when no OpenWhisk credentials', () => {
    const paramsCopy = JSON.parse(JSON.stringify(paramsJson));
    paramsCopy.ow_api_key = '';
    paramsCopy.ow_api_host = '';

    return normalizeAction.main(paramsCopy).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorOwCredentials);
      }
    );
  });

  it('validate error when non-supported channel supplied', () => {
    const paramsCopy = JSON.parse(JSON.stringify(paramsJson));
    paramsCopy.ow_api_host = openwhiskBindings.apihost;
    paramsCopy.ow_api_key = openwhiskBindings.api_key;
    paramsCopy.provider = 'my_awesome_chat_bot';
    paramsCopy.myawesomechatbot = paramsCopy.slack;
    delete paramsCopy.slack;

    return normalizeAction.main(paramsCopy).then(
      () => {
        assert(false, 'Action suceeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorUnknownProvider);
      }
    );
  });
});
