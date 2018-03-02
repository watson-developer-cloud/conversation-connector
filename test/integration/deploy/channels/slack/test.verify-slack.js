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
 * Deploy Verify Slack Actions Integration Tests
 */

const assert = require('assert');
const crypto = require('crypto');
const openwhisk = require('openwhisk');
const _ = require('underscore');

const actionPopulateActions = 'populate-actions';
const actionVerifySlack = 'verify-slack';

const apihost = 'openwhisk.ng.bluemix.net';

describe('deploy verify-slack integration tests', () => {
  const ow = openwhisk();

  let params;

  beforeEach(() => {
    params = {
      state: {
        auth: {
          access_token: process.env.__TEST_DEPLOYUSER_ACCESS_TOKEN,
          refresh_token: process.env.__TEST_DEPLOYUSER_REFRESH_TOKEN
        },
        wsk: {
          namespace: process.env.__TEST_DEPLOYUSER_WSK_NAMESPACE
        },
        slack: {
          client_id: process.env.__TEST_SLACK_CLIENT_ID,
          client_secret: process.env.__TEST_SLACK_CLIENT_SECRET,
          verification_token: process.env.__TEST_SLACK_VERIFICATION_TOKEN
        },
        conversation: {
          guid: process.env.__TEST_DEPLOYUSER_CONVERSATION_GUID,
          workspace_id: process.env.__TEST_DEPLOYUSER_CONVERSATION_WORKSPACEID
        }
      }
    };
  });

  it('validate verify-slack works', () => {
    const deploymentName = 'test-integration-verifyslack';
    params.state.name = deploymentName;

    const requestUrl = `https://${process.env.__OW_API_HOST}/api/v1/web/${params.state.wsk.namespace}/${params.state.name}_slack/receive.json`;
    const redirectUrl = `https://${process.env.__OW_API_HOST}/api/v1/web/${params.state.wsk.namespace}/${params.state.name}_slack/deploy.http`;

    const state = JSON.stringify({
      signature: createHmacKey(
        params.state.slack.client_id,
        params.state.slack.client_secret
      ),
      redirect_url: redirectUrl
    });

    const authUrl = `/oauth/authorize?client_id=${params.state.slack.client_id}&scope=bot+chat:write:bot&redirect_uri=${redirectUrl}&state=${state}`;
    const redirAuthUrl = `https://slack.com/signin?redir=${encodeURIComponent(authUrl)}`;

    const expectedPostSequenceActions = [
      `/${process.env.__TEST_DEPLOYUSER_WSK_NAMESPACE}/${deploymentName}_starter-code/post-normalize`,
      `/${process.env.__TEST_DEPLOYUSER_WSK_NAMESPACE}/${deploymentName}_slack/post`
    ];

    const expectedMainSequenceActions = [
      `/${process.env.__TEST_DEPLOYUSER_WSK_NAMESPACE}/${deploymentName}_starter-code/pre-normalize`,
      `/${process.env.__TEST_DEPLOYUSER_WSK_NAMESPACE}/${deploymentName}_starter-code/normalize-slack-for-conversation`,
      `/${process.env.__TEST_DEPLOYUSER_WSK_NAMESPACE}/${deploymentName}_context/load-context`,
      `/${process.env.__TEST_DEPLOYUSER_WSK_NAMESPACE}/${deploymentName}_starter-code/pre-conversation`,
      `/${process.env.__TEST_DEPLOYUSER_WSK_NAMESPACE}/${deploymentName}_conversation/call-conversation`,
      `/${process.env.__TEST_DEPLOYUSER_WSK_NAMESPACE}/${deploymentName}_starter-code/post-conversation`,
      `/${process.env.__TEST_DEPLOYUSER_WSK_NAMESPACE}/${deploymentName}_context/save-context`,
      `/${process.env.__TEST_DEPLOYUSER_WSK_NAMESPACE}/${deploymentName}_starter-code/normalize-conversation-for-slack`,
      `/${process.env.__TEST_DEPLOYUSER_WSK_NAMESPACE}/${deploymentName}_slack/multiple_post`
    ];

    const supplierWsk = openwhisk({
      api_key: process.env.__TEST_DEPLOYUSER_WSK_API_KEY,
      namespace: process.env.__TEST_DEPLOYUSER_WSK_NAMESPACE,
      apihost
    });

    return ow.actions
      .invoke({
        name: actionPopulateActions,
        blocking: true,
        result: true,
        params
      })
      .then(result => {
        assert.deepEqual(result, { code: 200, message: 'OK' });
      })
      .then(() => {
        return ow.actions.invoke({
          name: actionVerifySlack,
          blocking: true,
          result: true,
          params
        });
      })
      .then(result => {
        assert.deepEqual(result, {
          code: 200,
          message: 'OK',
          request_url: requestUrl,
          redirect_url: redirectUrl,
          authorize_url: redirAuthUrl
        });
      })
      .then(() => {
        return validateSequenceCreation(deploymentName, supplierWsk);
      })
      .then(action => {
        assert(
          _.isEqual(action.exec.components, expectedMainSequenceActions),
          'main sequence does not contain expected actions.'
        );
      })
      .then(() => {
        return validateSequenceCreation(
          `${deploymentName}_postsequence`,
          supplierWsk
        );
      })
      .then(action => {
        assert(
          _.isEqual(action.exec.components, expectedPostSequenceActions),
          'post sequence does not contain expected actions.'
        );
      })
      .catch(error => {
        assert(false, error);
      });
  })
    .timeout(30000)
    .retries(4);

  function createHmacKey(clientId, clientSecret) {
    const hmacKey = `${clientId}&${clientSecret}`;
    return crypto
      .createHmac('sha256', hmacKey)
      .update('authorize')
      .digest('hex');
  }

  function validateSequenceCreation(pipelineName, supplierWsk) {
    return supplierWsk.actions.get(pipelineName);
  }
});
