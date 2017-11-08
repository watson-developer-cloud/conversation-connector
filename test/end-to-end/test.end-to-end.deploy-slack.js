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

const assert = require('assert');
const crypto = require('crypto');
const openwhisk = require('openwhisk');

/**
 * Deploy End-to-End tests with Slack.
 */
describe('End-to-End tests: Slack Deploy UI', () => {
  const ow = openwhisk();

  const deployUrl = 'sample_deploy_url/index.html';

  const actionCheckDeploy = 'check-deploy-exists';
  const actionPopulateActions = 'populate-actions';
  const actionVerifySlack = 'verify-slack';

  let params;
  let expectedResult;

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
        conversation: {
          guid: process.env.__TEST_DEPLOYUSER_CONVERSATION_GUID,
          workspace_id: process.env.__TEST_DEPLOYUSER_CONVERSATION_WORKSPACEID
        },
        slack: {
          client_id: process.env.__TEST_SLACK_CLIENT_ID,
          client_secret: process.env.__TEST_SLACK_CLIENT_SECRET,
          verification_token: process.env.__TEST_SLACK_VERIFICATION_TOKEN
        }
      }
    };

    expectedResult = {
      code: 200,
      message: 'OK'
    };
  });

  it('validate slack deploy works', () => {
    const deploymentName = 'test-e2e-slack-deploy';
    params.state.name = deploymentName;

    const requestUrl = `https://${process.env.__OW_API_HOST}/api/v1/web/${params.state.wsk.namespace}/${deploymentName}_slack/receive.json`;
    const redirectUrl = `https://${process.env.__OW_API_HOST}/api/v1/web/${params.state.wsk.namespace}/${deploymentName}_slack/deploy.http`;

    const state = JSON.stringify({
      signature: createHmacKey(
        params.state.slack.client_id,
        params.state.slack.client_secret
      ),
      redirect_url: redirectUrl
    });
    const authUrl = `/oauth/authorize?client_id=${params.state.slack.client_id}&scope=bot+chat:write:bot&redirect_uri=${redirectUrl}&state=${state}`;
    const redirAuthUrl = `https://slack.com/signin?redir=${encodeURIComponent(authUrl)}`;

    return ow.actions
      .invoke({
        name: actionCheckDeploy,
        result: true,
        blocking: true,
        params
      })
      .then(result => {
        assert.deepEqual(result, expectedResult);
      })
      .then(() => {
        return ow.actions.invoke({
          name: actionPopulateActions,
          result: true,
          blocking: true,
          params
        });
      })
      .then(result => {
        assert.deepEqual(result, expectedResult);
      })
      .then(() => {
        return ow.actions.invoke({
          name: actionVerifySlack,
          result: true,
          blocking: true,
          params
        });
      })
      .then(result => {
        expectedResult.request_url = requestUrl;
        expectedResult.redirect_url = redirectUrl;
        expectedResult.authorize_url = redirAuthUrl;

        assert.deepEqual(result, expectedResult);
      })
      .catch(error => {
        assert(false, error);
      });
  })
    .timeout(30000)
    .retries(4);

  it('validate slack deploy works with a deploy url specified', () => {
    const deploymentName = 'test-e2e-slack-deploy-2';
    params.state.name = deploymentName;
    params.state.deploy_url = deployUrl;

    const requestUrl = `https://${process.env.__OW_API_HOST}/api/v1/web/${params.state.wsk.namespace}/${deploymentName}_slack/receive.json`;
    const redirectUrl = `https://${process.env.__OW_API_HOST}/api/v1/web/${params.state.wsk.namespace}/${deploymentName}_slack/deploy.http`;

    const state = JSON.stringify({
      signature: createHmacKey(
        params.state.slack.client_id,
        params.state.slack.client_secret
      ),
      redirect_url: redirectUrl,
      success_url: deployUrl
    });
    const authUrl = `/oauth/authorize?client_id=${params.state.slack.client_id}&scope=bot+chat:write:bot&redirect_uri=${redirectUrl}&state=${state}`;
    const redirAuthUrl = `https://slack.com/signin?redir=${encodeURIComponent(authUrl)}`;

    return ow.actions
      .invoke({
        name: actionCheckDeploy,
        result: true,
        blocking: true,
        params
      })
      .then(result => {
        assert.deepEqual(result, expectedResult);
      })
      .then(() => {
        return ow.actions.invoke({
          name: actionPopulateActions,
          result: true,
          blocking: true,
          params
        });
      })
      .then(result => {
        assert.deepEqual(result, expectedResult);
      })
      .then(() => {
        return ow.actions.invoke({
          name: actionVerifySlack,
          result: true,
          blocking: true,
          params
        });
      })
      .then(result => {
        expectedResult.request_url = requestUrl;
        expectedResult.redirect_url = redirectUrl;
        expectedResult.authorize_url = redirAuthUrl;

        assert.deepEqual(result, expectedResult);
      })
      .catch(error => {
        assert(false, error);
      });
  })
    .timeout(30000)
    .retries(4);

  it('validate error when deployment name already used', () => {
    const deploymentName = 'test-e2e-slack-deploy-3';
    params.state.name = deploymentName;

    const requestUrl = `https://${process.env.__OW_API_HOST}/api/v1/web/${params.state.wsk.namespace}/default/${deploymentName}.json`;
    const redirectUrl = `https://${process.env.__OW_API_HOST}/api/v1/web/${params.state.wsk.namespace}/${deploymentName}_slack/deploy.http`;

    const state = JSON.stringify({
      signature: createHmacKey(
        params.state.slack.client_id,
        params.state.slack.client_secret
      ),
      redirect_url: redirectUrl
    });
    const authUrl = `/oauth/authorize?client_id=${params.state.slack.client_id}&scope=bot+chat:write:bot&redirect_uri=${redirectUrl}&state=${state}`;
    const redirAuthUrl = `https://slack.com/signin?redir=${encodeURIComponent(authUrl)}`;

    return ow.actions
      .invoke({
        name: actionCheckDeploy,
        result: true,
        blocking: true,
        params
      })
      .then(result => {
        assert.deepEqual(result, expectedResult);
      })
      .then(() => {
        return ow.actions.invoke({
          name: actionPopulateActions,
          result: true,
          blocking: true,
          params
        });
      })
      .then(result => {
        assert.deepEqual(result, expectedResult);
      })
      .then(() => {
        return ow.actions.invoke({
          name: actionVerifySlack,
          result: true,
          blocking: true,
          params
        });
      })
      .then(result => {
        expectedResult.request_url = requestUrl;
        expectedResult.redirect_url = redirectUrl;
        expectedResult.authorize_url = redirAuthUrl;

        assert.deepEqual(result, expectedResult);
      })
      .then(() => {
        return ow.actions.invoke({
          name: actionCheckDeploy,
          result: true,
          blocking: true,
          params
        });
      })
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error.error.response.result.error, {
          code: 400,
          message: `Deployment "${deploymentName}" already exists.`
        });
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
});
