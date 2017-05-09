'use strict';

const assert = require('assert');
const convoResponseJson = require('../../resources/test.unit.starter-code.json').convoResponseJson;
const normalizeAction = require('../../../starter-code/normalize');
const normalizedParamsJson = require('../../resources/test.unit.starter-code.json').normalizedParamsJson;
const paramsJson = require('../../resources/test.unit.starter-code.json').paramsJson;

describe('starter code unit tests', () => {
  it('validateResponseFromConversation ', () => {
    let convoResponseCopy = JSON.parse(JSON.stringify(convoResponseJson));

    try {
      normalizeAction.validateResponseFromConversation(convoResponseCopy);
    } catch (e) {
      assert(
        false,
        `Expected validation to be successful but failed with ${e}`
      );
    }

    delete convoResponseCopy.response;

    try {
      normalizeAction.validateResponseFromConversation(convoResponseCopy);
    } catch (e) {
      assert.equal(
        e.message,
        'Error calling Conversation, unable to post result to Slack',
        'Expected failure due to missing conversation object.'
      );
    }

    convoResponseCopy = JSON.parse(JSON.stringify(convoResponseJson));

    delete convoResponseCopy.response.result.output;

    try {
      normalizeAction.validateResponseFromConversation(convoResponseCopy);
    } catch (e) {
      assert.equal(
        e.message,
        'Conversation call succeeded but a response to the user was not provided',
        'Expected failure due to lack of output object.'
      );
    }

    convoResponseCopy = JSON.parse(JSON.stringify(convoResponseJson));

    convoResponseCopy.response.result.output = { text: 'Turn on lights' };

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
});
