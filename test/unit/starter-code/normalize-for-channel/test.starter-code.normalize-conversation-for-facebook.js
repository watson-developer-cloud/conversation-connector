'use strict';

/**
 * Unit tests for normalizing conversation SDK output parameters into Facebook parameters
 */

const assert = require('assert');
const scNormForFacebook = require('./../../../../starter-code/normalize-for-channel/normalize-conversation-for-facebook.js');

const recipient = {
  id: 'user_id'
};
const text = 'hello, world!';

const errorNoConversation = 'No conversation output.';
const errorNoOutputMessage = 'No conversation output message.';
const errorNoRawInputData = 'No raw input data found.';
const errorNoFacebookInputData = 'No Facebook input data found.';
const errorNoConvInputData = 'No Conversation input data found.';
const errorNoFacebookSenderId = 'No Facebook sender_id found in raw data.';

describe('Starter-Code Normalize-For-Facebook Unit Tests', () => {
  let params;
  const facebookParams = {
    object: 'page',
    entry: [
      {
        id: 'page_id',
        time: 1458692752478,
        messaging: [
          {
            sender: {
              id: 'user_id'
            },
            recipient: {
              id: 'page_id'
            },
            message: {
              text: 'hello, world!'
            }
          }
        ]
      }
    ]
  };

  const expectedResult = {
    raw_input_data: {
      conversation: {
        input: {
          text
        }
      },
      facebook: facebookParams,
      provider: 'facebook'
    },
    raw_output_data: {
      conversation: {
        output: {
          text: [text]
        }
      }
    },
    message: {
      text
    },
    recipient
  };

  beforeEach(() => {
    params = {
      conversation: {
        output: {
          text: [text]
        }
      },
      raw_input_data: {
        conversation: {
          input: {
            text
          }
        },
        facebook: facebookParams,
        provider: 'facebook'
      }
    };
  });

  it('validate normalization works', () => {
    return scNormForFacebook(params).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate error when no conversation data', () => {
    delete params.conversation;

    return scNormForFacebook(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoConversation);
      }
    );
  });

  it('validate error when no conversation output', () => {
    delete params.conversation.output;

    return scNormForFacebook(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoOutputMessage);
      }
    );
  });

  it('validate error when no facebook input data', () => {
    delete params.raw_input_data;

    return scNormForFacebook(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoRawInputData);
      }
    );
  });

  it('validate error when no facebook input data', () => {
    delete params.raw_input_data.facebook;

    return scNormForFacebook(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoFacebookInputData);
      }
    );
  });

  it('validate error when no conversation input data', () => {
    delete params.raw_input_data.conversation;

    return scNormForFacebook(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoConvInputData);
      }
    );
  });

  it('validate error when no facebook channel', () => {
    delete params.raw_input_data.facebook.entry;

    return scNormForFacebook(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoFacebookSenderId);
      }
    );
  });
});
