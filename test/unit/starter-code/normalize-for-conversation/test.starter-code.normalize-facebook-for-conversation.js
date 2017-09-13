'use strict';

/**
 * Unit Tests for normalizing facebook JSON parameters to conversation SDK parameters.
 */

const assert = require('assert');
const scNormFacebookForConvo = require('./../../../../starter-code/normalize-for-conversation/normalize-facebook-for-conversation.js');

const errorBadSupplier = "Provider not supplied or isn't Facebook.";
const errorNoFacebookData = 'Facebook JSON data is missing.';
const errorNoWorkspaceId = 'workspace_id not present as a package binding.';
const errorNoMsgOrPostbackTypeEvent = 'Neither message.text event detected nor postback.payload event detected. Please add appropriate code to handle a different facebook event.';
const text = 'hello, world!';

describe('Starter Code Normalize-Facebook-For-Conversation Unit Tests', () => {
  let textMsgParams;
  let textMsgResult;
  let buttonClickParams;
  let buttonClickResult;

  beforeEach(() => {
    textMsgParams = {
      facebook: {
        sender: {
          id: 'user_id'
        },
        recipient: {
          id: 'page_id'
        },
        message: {
          text: 'hello, world!'
        }
      },
      workspace_id: 'abcd-123',
      provider: 'facebook'
    };

    buttonClickParams = {
      facebook: {
        sender: {
          id: 'user_id'
        },
        recipient: {
          id: 'page_id'
        },
        postback: {
          payload: 'hello, world!',
          title: 'Click here'
        }
      },
      workspace_id: 'abcd-123',
      provider: 'facebook'
    };

    textMsgResult = {
      conversation: {
        input: {
          text
        }
      },
      raw_input_data: {
        facebook: textMsgParams.facebook,
        provider: 'facebook',
        cloudant_key: 'facebook_user_id_abcd-123_page_id'
      }
    };

    buttonClickResult = {
      conversation: {
        input: {
          text
        }
      },
      raw_input_data: {
        facebook: buttonClickParams.facebook,
        provider: 'facebook',
        cloudant_key: 'facebook_user_id_abcd-123_page_id'
      }
    };
  });

  it('validate normalizing works for a regular text message', () => {
    return scNormFacebookForConvo(textMsgParams).then(
      result => {
        assert.deepEqual(result, textMsgResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalizing works for an event when a button is clicked', () => {
    return scNormFacebookForConvo(buttonClickParams).then(
      result => {
        assert.deepEqual(result, buttonClickResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate error when neither message type event nor postback type event detected', () => {
    delete textMsgParams.facebook.message;

    return scNormFacebookForConvo(textMsgParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoMsgOrPostbackTypeEvent);
      }
    );
  });

  it('validate error when provider missing', () => {
    delete textMsgParams.provider;

    return scNormFacebookForConvo(textMsgParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorBadSupplier);
      }
    );
  });

  it('validate error when facebook data missing', () => {
    delete textMsgParams.facebook;

    return scNormFacebookForConvo(textMsgParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoFacebookData);
      }
    );
  });

  it('validate error when workspace_id not bound to package', () => {
    delete textMsgParams.workspace_id;

    return scNormFacebookForConvo(textMsgParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoWorkspaceId);
      }
    );
  });
});
