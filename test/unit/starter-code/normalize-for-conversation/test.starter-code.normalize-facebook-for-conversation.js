'use strict';

/**
 * Unit Tests for normalizing facebook JSON parameters to conversation SDK parameters.
 */

const assert = require('assert');
const scNormFacebookForConvo = require('./../../../../starter-code/normalize-for-conversation/normalize-facebook-for-conversation.js');

const errorBadSupplier = "Provider not supplied or isn't Facebook.";
const errorNoFacebookData = 'Facebook JSON data is missing.';
const errorNoWorkspaceId = 'workspace_id not present as a package binding.';
const text = 'hello, world!';

describe('Starter Code Normalize-Facebook-For-Conversation Unit Tests', () => {
  let params;
  let expectedResult;

  beforeEach(() => {
    params = {
      facebook: {
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
      },
      workspace_id: 'abcd-123',
      provider: 'facebook'
    };

    expectedResult = {
      conversation: {
        input: {
          text
        }
      },
      raw_input_data: {
        facebook: params.facebook,
        provider: 'facebook',
        cloudant_key: 'facebook_user_id_abcd-123_page_id'
      }
    };
  });

  it('validate normalizing works', () => {
    return scNormFacebookForConvo(params).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate error when provider missing', () => {
    delete params.provider;

    return scNormFacebookForConvo(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorBadSupplier);
      }
    );
  });

  it('validate error when facebook data missing', () => {
    delete params.facebook;

    return scNormFacebookForConvo(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoFacebookData);
      }
    );
  });

  it('validate error when workspace_id not bound to package', () => {
    delete params.workspace_id;

    return scNormFacebookForConvo(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoWorkspaceId);
      }
    );
  });
});
