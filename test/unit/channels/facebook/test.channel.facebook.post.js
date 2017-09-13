'use strict';

/**
 * Facebook channel post action unit tests.
 */

const assert = require('assert');
const facebookPost = require('./../../../../channels/facebook/post/index.js');
const facebookBindings = require('./../../../resources/facebook-bindings.json').facebook;

const defaultPostUrl = 'https://graph.facebook.com/v2.6/me/messages';
const badUri = 'badlink.hi';
const movedUri = 'http://www.ibm.com';

const errorBadUri = `Invalid URI "${badUri}"`;
const errorMovedPermanently = 'Action returned with status code 301, message: Moved Permanently';
const errorNoPageAccessToken = 'Page access token not provided.';
const errorNoRecipientId = 'Recepient id not provided.';
const errorNoMessageText = 'Message object not provided.';

describe('Facebook Post Unit Tests', () => {
  let postParams = {};
  const expectedResult = {
    text: 200,
    url: defaultPostUrl,
    params: {
      message: {
        text: 'Hello, World!'
      },
      recipient: facebookBindings.sender
    }
  };

  beforeEach(() => {
    postParams = {
      page_access_token: facebookBindings.page_access_token,
      message: {
        text: 'Hello, World!'
      },
      recipient: facebookBindings.sender
    };
  });

  it('validate facebook/post works as intended', () => {
    return facebookPost(postParams).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, `Invoke action failed: ${error}`);
      }
    );
  });

  it('validate error when bad uri supplied', () => {
    postParams.url = badUri;

    return facebookPost(postParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorBadUri);
      }
    );
  });

  it('validate error when not 200 uri supplied', () => {
    postParams.url = movedUri;

    return facebookPost(postParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorMovedPermanently);
      }
    );
  }).timeout(8000);

  it('validate error when no page access token provided', () => {
    delete postParams.page_access_token;

    return facebookPost(postParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoPageAccessToken);
      }
    );
  });

  it('validate error when no recipient Id provided', () => {
    delete postParams.recipient;

    return facebookPost(postParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoRecipientId);
      }
    );
  });

  it('validate error when no message text provided', () => {
    delete postParams.message;

    return facebookPost(postParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoMessageText);
      }
    );
  });
});
