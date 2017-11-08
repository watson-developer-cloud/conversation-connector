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
const request = require('request');

const apihost = 'openwhisk.ng.bluemix.net';

const actionsToPopulate = [
  'starter-code/normalize-slack-for-conversation',
  'starter-code/normalize-conversation-for-slack',
  'slack/receive',
  'slack/post',
  'slack/deploy'
];

const requiredActions = [
  'slack/receive',
  'starter-code/pre-normalize',
  'starter-code/normalize-slack-for-conversation',
  'context/load-context',
  'starter-code/pre-conversation',
  'conversation/call-conversation',
  'starter-code/post-conversation',
  'context/save-context',
  'starter-code/normalize-conversation-for-slack',
  'starter-code/post-normalize',
  'slack/post'
];

const defaultPipelineActions = [
  'starter-code/pre-normalize',
  'starter-code/normalize-slack-for-conversation',
  'context/load-context',
  'starter-code/pre-conversation',
  'conversation/call-conversation',
  'starter-code/post-conversation',
  'context/save-context',
  'starter-code/normalize-conversation-for-slack',
  'starter-code/post-normalize',
  'slack/post'
];

const webExportActions = ['slack/receive', 'slack/deploy'];

const AUTHDB_NAME = 'authdb';

/**
 * Supplies the user with slack-specific Cloud Functions actions.
 *
 * @param  {JSON} params    - input parameters required for this action (see validateParameters)
 * @return {Promise}        - success or error response of this action
 */
function main(params) {
  return new Promise((resolve, reject) => {
    try {
      validateParameters(params);
    } catch (e) {
      reject({
        code: 400,
        message: e.message
      });
    }

    const supplierWsk = openwhisk({
      api_key: process.env.__OW_API_KEY,
      namespace: process.env.__OW_NAMESPACE,
      apihost
    });
    let userWsk;

    const accessToken = params.state.auth.access_token;
    const refreshToken = params.state.auth.refresh_token;
    const wskNamespace = params.state.wsk.namespace;
    const slackClientId = params.state.slack.client_id;
    const slackClientSecret = params.state.slack.client_secret;
    const slackVerificationToken = params.state.slack.verification_token;
    const conversationGuid = params.state.conversation.guid;
    const conversationWorkspace = params.state.conversation.workspace_id;
    const deployName = params.state.name;

    let cloudantAccount;
    let authKey;

    const redirectUri = `https://${apihost}/api/v1/web/${wskNamespace}/${deployName}_slack/deploy.http`;
    const requestUri = `https://${apihost}/api/v1/web/${wskNamespace}/${deployName}_slack/receive.json`;

    getCloudFunctionsFromBluemix(accessToken, refreshToken, wskNamespace)
      .then(ow => {
        userWsk = ow;
      })
      .then(() => {
        return updatePackageSlack(userWsk, wskNamespace, deployName);
      })
      .then(() => {
        return transferWskActions(
          supplierWsk,
          userWsk,
          deployName,
          actionsToPopulate,
          webExportActions,
          wskNamespace
        );
      })
      .then(() => {
        return checkPipelineActions(userWsk, wskNamespace, deployName);
      })
      .then(() => {
        return createPipeline(userWsk, wskNamespace, deployName);
      })
      .then(() => {
        return getAnnotations(userWsk, wskNamespace, deployName);
      })
      .then(pkg => {
        for (let i = 0; i < pkg.annotations.length; i += 1) {
          const annotation = pkg.annotations[i];
          if (annotation.key === 'cloudant_url') {
            const url = annotation.value;
            const creds = url
              .slice(url.indexOf('//') + 2, url.indexOf('@'))
              .split(':');
            cloudantAccount = {
              username: creds[0],
              password: creds[1]
            };
          } else if (annotation.key === 'cloudant_auth_key') {
            authKey = annotation.value;
          }
        }
        return updateSlackAnnotations(userWsk, wskNamespace, deployName, pkg);
      })
      .then(() => {
        return getConversationCredentialsFromGuid(
          accessToken,
          conversationGuid
        );
      })
      .then(conv => {
        const doc = {
          conversation: {
            username: conv.username,
            password: conv.password,
            workspace_id: conversationWorkspace
          },
          channel: {
            name: 'slack',
            slack: {
              client_id: slackClientId,
              client_secret: slackClientSecret,
              verification_token: slackVerificationToken
            }
          }
        };
        return updateAuthDocument(supplierWsk, cloudantAccount, authKey, doc);
      })
      .then(() => {
        const state = JSON.stringify({
          signature: createHmacKey(slackClientId, slackClientSecret),
          redirect_url: redirectUri,
          success_url: params.state.deploy_url
        });
        const authUrl = `/oauth/authorize?client_id=${slackClientId}&scope=bot+chat:write:bot&redirect_uri=${redirectUri}&state=${state}`;
        resolve({
          code: 200,
          message: 'OK',
          redirect_url: redirectUri,
          request_url: requestUri,
          authorize_url: `https://slack.com/signin?redir=${encodeURIComponent(authUrl)}`
        });
      })
      .catch(error => {
        if (typeof error === 'string') {
          reject({
            code: 400,
            message: error
          });
        } else {
          const returnError = error;
          returnError.code = 400;
          returnError.message = returnError.message || returnError.error;
          reject(returnError);
        }
      });
  });
}

/**
 * Get the user's Cloud Functions credentials using his Bluemix access and refresh tokens.
 *
 * @param  {string} accessToken  - Bluemix access token
 * @param  {string} refreshToken - Bluemix refresh token
 * @param  {string} namespace    - Bluemix organization_space
 * @return {JSON}                - Cloud Functions credentials: { apihost, apikey }
 */
function getCloudFunctionsFromBluemix(accessToken, refreshToken, namespace) {
  const url = `https://${apihost}/bluemix/v2/authenticate`;

  const postData = { accessToken, refreshToken };

  return new Promise((resolve, reject) => {
    request.post(
      {
        headers: { 'Content-Type': 'application/json' },
        form: postData,
        url
      },
      (error, response, body) => {
        if (error) {
          reject(error.message);
        } else {
          const jsonBody = JSON.parse(body);
          if (jsonBody.error) {
            reject(jsonBody.error);
          } else {
            for (let i = 0; i < jsonBody.namespaces.length; i += 1) {
              if (jsonBody.namespaces[i].name === namespace) {
                const namespaceKeys = jsonBody.namespaces[i];
                resolve(
                  openwhisk({
                    api_key: `${namespaceKeys.uuid}:${namespaceKeys.key}`,
                    apihost,
                    namespace
                  })
                );
              }
            }

            reject(`Could not find user namespace: ${namespace}.`);
          }
        }
      }
    );
  });
}

/**
 * Create/Update a slack package in the user's Cloud Functions namespace.
 *
 * @param  {Object} ow                - user's Cloud Functions
 * @param  {string} namespace         - Cloud Functions namespace
 * @param  {string} deployName        - deployment name
 * @return {Promise}                  - resolution of package update
 */
function updatePackageSlack(ow, namespace, deployName) {
  return ow.packages.update({ name: `${deployName}_slack`, namespace });
}

/**
 * Takes specified Cloud Functions actions in the supplier namespace and
 *   transfers them to the user's namespace.
 *
 * @param  {Object}   supplier      - supplier's Cloud Functions
 * @param  {Object}   user          - user's Cloud Functions
 * @param  {string}   deployName    - deployment name
 * @param  {string[]} actionNames   - names of all actions to transfer
 * @param  {string[]} exportActions - actions to web export
 * @param  {string}   namespace     - user's Cloud Functions namespace
 * @return {Promise}                - resolution of all action updates
 */
function transferWskActions(
  supplier,
  user,
  deployName,
  actionNames,
  exportActions,
  namespace
) {
  return new Promise((resolve, reject) => {
    const promises = [];
    const appendedExportActions = Object.assign([], exportActions);
    for (let i = 0; i < appendedExportActions.length; i += 1) {
      appendedExportActions[i] = `${deployName}_${appendedExportActions[i]}`;
    }
    for (let i = 0; i < actionNames.length; i += 1) {
      const action = `${deployName}_${actionNames[i]}`;
      const promise = getWskAction(supplier, actionNames[i]).then(source => {
        return updateWskAction(
          user,
          action,
          namespace,
          source,
          appendedExportActions.indexOf(action) >= 0
        );
      });
      promises.push(promise);
    }

    Promise.all(promises).then(resolve).catch(reject);
  });
}

/**
 * Get the source of an existing Cloud Functions action.
 *
 * @param  {Object} ow         - Cloud Functions account to get action from
 * @param  {string} actionName - name of action to get
 * @return {Promise}           - resolution of action get
 */
function getWskAction(ow, actionName) {
  return new Promise((resolve, reject) => {
    ow.actions
      .get({ name: actionName })
      .then(result => {
        resolve(result.exec.code);
      })
      .catch(reject);
  });
}

/**
 * Create/Update an action to a specified Cloud Functions account.
 *
 * @param  {Object} ow            - Cloud Functions account to update action to
 * @param  {string} actionName    - name of action to update
 * @param  {string} namespace     - Cloud Functions account's namespace
 * @param  {string} action        - action source code
 * @param  {boolean} exportAction - true if action should be web-exported
 * @return {Promise}              - resolution of action update
 */
function updateWskAction(ow, actionName, namespace, action, exportAction) {
  let annotations;
  if (exportAction) {
    annotations = [
      {
        key: 'web-export',
        value: true
      }
    ];
  }

  return ow.actions.update({
    name: actionName,
    action: {
      exec: {
        kind: 'nodejs:6',
        code: action
      },
      annotations
    },
    namespace
  });
}

/**
 * Confirms if all the actions required in the default sequence action
 *   exist in the user's namespace.
 *
 * @param  {Object} ow          - user's Cloud Functions
 * @param  {string} namespace   - Cloud Functions namespace
 * @param  {string} deployName  - deployment name
 * @return {Promise}            - resolution of action gets
 */
function checkPipelineActions(ow, namespace, deployName) {
  return new Promise((resolve, reject) => {
    const promises = [];
    for (let i = 0; i < requiredActions.length; i += 1) {
      const pipelineAction = `${deployName}_${requiredActions[i]}`;
      promises.push(ow.actions.get({ name: pipelineAction, namespace }));
    }

    Promise.all(promises).then(resolve).catch(reject);
  });
}

/**
 * Creates the sequence action of the Slack pipeline in the user's Cloud Functions.
 *
 * @param  {Object} ow           - user's Cloud Functions
 * @param  {string} namespace    - Cloud Functions namespace
 * @param  {string} deployName   - deployment name
 * @return {Promise}             - resolution of sequence action update
 */
function createPipeline(ow, namespace, deployName) {
  const pipelineActions = JSON.parse(JSON.stringify(defaultPipelineActions));
  for (let i = 0; i < pipelineActions.length; i += 1) {
    pipelineActions[i] = `/${namespace}/${deployName}_${pipelineActions[i]}`;
  }

  return ow.actions.update({
    name: deployName,
    action: {
      exec: {
        kind: 'sequence',
        code: '',
        components: pipelineActions
      }
    },
    namespace
  });
}

/**
 * Get annotations from a package
 *
 * @param  {Object} ow         - Cloud Functions instance
 * @param  {string} namespace  - Cloud Functions namespace
 * @param  {string} deployName - deployment name
 * @return {JSON}              - package annotations
 */
function getAnnotations(ow, namespace, deployName) {
  return new Promise((resolve, reject) => {
    const packageName = `${deployName}_context`;

    return ow.packages
      .get({ name: packageName, namespace })
      .then(pkg => {
        resolve({ annotations: pkg.annotations });
      })
      .catch(reject);
  });
}

/**
 * Update annotations in user deployment's Slack package
 *
 * @param  {Object} ow         - Cloud Functions instance
 * @param  {string} namespace  - Cloud Functions namespace
 * @param  {string} deployName - deployment name
 * @param  {JSON}   pkg        - package object containing annotations
 * @return {Promise}           - resolution of Cloud Functions invocation
 */
function updateSlackAnnotations(ow, namespace, deployName, pkg) {
  return ow.packages.update({
    name: `${deployName}_slack`,
    package: pkg,
    namespace
  });
}

/**
 * Converts Bluemix token and conversation Id to conversation credentials
 *
 * @param  {string} accessToken - Bluemix access token
 * @param  {string} convGuid    - Conversation service guid
 * @return {JSON}               - Conversation service username and password
 */
function getConversationCredentialsFromGuid(accessToken, convGuid) {
  return new Promise((resolve, reject) => {
    const url = `https://api.ng.bluemix.net/v2/service_instances/${convGuid}/service_keys`;

    request(
      {
        headers: { Authorization: `bearer ${accessToken}` },
        url
      },
      (error, response, body) => {
        if (error) {
          reject(error.message);
        } else if (response.statusCode < 200 || response.statusCode >= 400) {
          const responseBody = response.body &&
            JSON.parse(response.body) &&
            JSON.parse(response.body).error_code;
          reject(responseBody);
        } else {
          const conversationCreds = JSON.parse(body).resources[
            0
          ].entity.credentials;
          resolve(conversationCreds);
        }
      }
    );
  });
}

/**
 * Calls update auth document action
 *
 * @param  {Object} ow              - Cloud Functions instance
 * @param  {JSON}   cloudantAccount - cloudant account information
 * @param  {string} authKey         - auth key
 * @param  {JSON}   doc             - auth document
 * @return {Promise}                - resolution of Cloud Functions invocation
 */
function updateAuthDocument(ow, cloudantAccount, authKey, doc) {
  const input = {
    pipeline: doc,
    auth_key: authKey,
    cloudant: cloudantAccount,
    db_name: AUTHDB_NAME
  };

  return ow.actions.invoke({
    name: 'update-auth-document',
    params: input,
    blocking: true,
    result: true
  });
}

/**
 * Constructs a HMAC hash key from the Slack client ID and secret.
 *
 * @param  {string} clientId     - user Slack client ID
 * @param  {string} clientSecret - user Slack client secret
 * @return {Promise}             - Promise containing the HMAC hash key
 */
function createHmacKey(clientId, clientSecret) {
  const hmacKey = `${clientId}&${clientSecret}`;
  return crypto.createHmac('sha256', hmacKey).update('authorize').digest('hex');
}

/**
 * Validates the required parameters for running this action.
 *
 * @param  {JSON} params - parameters passed into the action
 * @return               - error only if at least one parameter is valid
 */
function validateParameters(params) {
  // Required: state object
  assert(params.state, "Could not get user's input information.");

  // Required: Bluemix authentication
  assert(
    params.state.auth &&
      params.state.auth.access_token &&
      params.state.auth.refresh_token,
    "Could not get user's Bluemix credentials."
  );

  // Required: Cloud Functions namespace
  assert(
    params.state.wsk && params.state.wsk.namespace,
    "Could not get user's Bluemix credentials."
  );

  // Required: Slack credentials
  assert(
    params.state.slack &&
      params.state.slack.client_id &&
      params.state.slack.client_secret &&
      params.state.slack.verification_token,
    "Could not get user's Slack credentials."
  );

  // Required: Conversation identifier and workspace
  assert(
    params.state.conversation &&
      params.state.conversation.guid &&
      params.state.conversation.workspace_id,
    "Could not get user's Conversation service information."
  );

  // Required: deployment name
  assert(params.state.name, 'Could not get deployment name.');
}

module.exports = main;
