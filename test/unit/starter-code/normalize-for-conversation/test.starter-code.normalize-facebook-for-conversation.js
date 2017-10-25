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

/**
 * Unit Tests for normalizing facebook JSON parameters to conversation SDK parameters.
 */

const assert = require('assert');
const nock = require('nock');

const envParams = process.env;

process.env.__OW_ACTION_NAME = `/${process.env.__OW_NAMESPACE}/pipeline_pkg/action-to-test`;

const actionNormFacebookForConversation = require('./../../../../starter-code/normalize-for-conversation/normalize-facebook-for-conversation.js');

const errorBadSupplier = "Provider not supplied or isn't Facebook.";
const errorNoFacebookData = 'Facebook JSON data is missing.';
const errorNoMsgOrPostbackTypeEvent = 'Neither message.text event detected nor postback.payload event detected. Please add appropriate code to handle a different facebook event.';
const text = 'hello, world!';

describe('Starter Code Normalize-Facebook-For-Conversation Unit Tests', () => {
  let textMsgParams;
  let textMsgResult;
  let buttonClickParams;
  let buttonClickResult;

  let func;
  let auth;

  const cloudantUrl = 'https://some-cloudant-url.com';
  const cloudantAuthDbName = 'abc';
  const cloudantAuthKey = '123';

  const apiHost = process.env.__OW_API_HOST;
  const namespace = process.env.__OW_NAMESPACE;
  const packageName = process.env.__OW_ACTION_NAME.split('/')[2];

  const cloudFunctionsUrl = `https://${apiHost}/api/v1/namespaces`;
  const expectedCloudFunctions = {
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
        cloudant_context_key: `facebook_user_id_${envParams.__TEST_CONVERSATION_WORKSPACE_ID}_page_id`
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
        cloudant_context_key: `facebook_user_id_${envParams.__TEST_CONVERSATION_WORKSPACE_ID}_page_id`
      }
    };

    auth = {
      conversation: {
        workspace_id: envParams.__TEST_CONVERSATION_WORKSPACE_ID
      }
    };
  });

  it('validate normalizing works for a regular text message', () => {
    func = actionNormFacebookForConversation.main;
    const mockCloudFunctions = nock(cloudFunctionsUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedCloudFunctions);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);

    return func(textMsgParams).then(
      result => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockCloudFunctions.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloud Functions Get server did not get called.');
        }
        assert.deepEqual(result, textMsgResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalizing works for an event when a button is clicked', () => {
    func = actionNormFacebookForConversation.main;
    const mockCloudFunctions = nock(cloudFunctionsUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedCloudFunctions);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);

    return func(buttonClickParams).then(
      result => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockCloudFunctions.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloud Functions Get server did not get called.');
        }
        assert.deepEqual(result, buttonClickResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate error when neither message type event nor postback type event detected', () => {
    delete textMsgParams.facebook.message;

    func = actionNormFacebookForConversation.main;
    const mockCloudFunctions = nock(cloudFunctionsUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedCloudFunctions);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);

    return func(textMsgParams).then(
      result => {
        assert(false, result);
      },
      error => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockCloudFunctions.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloud Functions Get server did not get called.');
        }
        assert.equal(error, errorNoMsgOrPostbackTypeEvent);
      }
    );
  });

  it('validate error when provider missing', () => {
    delete textMsgParams.provider;

    func = actionNormFacebookForConversation.validateParameters;
    try {
      func(textMsgParams);
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorBadSupplier);
    }
  });

  it('validate error when facebook data missing', () => {
    delete textMsgParams.facebook;

    func = actionNormFacebookForConversation.validateParameters;
    try {
      func(textMsgParams);
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorNoFacebookData);
    }
  });
});
