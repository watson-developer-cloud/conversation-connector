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
const openwhisk = require('openwhisk');
const request = require('request');
const uuid = require('uuid');

const apihost = 'openwhisk.ng.bluemix.net';

const packagesToUpdate = ['context', 'conversation', 'starter-code'];

const actionsToPopulate = [
  'starter-code/pre-normalize',
  'context/load-context',
  'starter-code/pre-conversation',
  'conversation/call-conversation',
  'starter-code/post-conversation',
  'context/save-context',
  'starter-code/post-normalize'
];

const AUTHDB_NAME = 'authdb';
const CONTEXTDB_NAME = 'contextdb';

/**
 * Supplies the user with channel-agnostic Cloud Functions actions,
 *   as well as required services such as Cloudant context database.
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
    const namespace = params.state.wsk.namespace;
    const conversationGuid = params.state.conversation.guid;
    const conversationWorkspace = params.state.conversation.workspace_id;
    const deployName = params.state.name;

    const authKey = uuid();
    let cloudantAccount;

    getCloudFunctionsFromBluemix(accessToken, refreshToken, namespace)
      .then(ow => {
        userWsk = ow;
      })
      .then(() => {
        return createCloudantInstance(
          supplierWsk,
          accessToken,
          refreshToken,
          namespace
        );
      })
      .then(result => {
        cloudantAccount = result.message;
      })
      .then(() => {
        return updateAllPackages(
          userWsk,
          namespace,
          deployName,
          packagesToUpdate
        );
      })
      .then(() => {
        return transferWskActions(
          supplierWsk,
          userWsk,
          deployName,
          actionsToPopulate,
          namespace
        );
      })
      .then(() => {
        return updatePackageAnnotations(
          userWsk,
          namespace,
          deployName,
          packagesToUpdate,
          cloudantAccount,
          authKey
        );
      })
      .then(() => {
        return createCloudantDatabase(
          supplierWsk,
          cloudantAccount,
          CONTEXTDB_NAME
        );
      })
      .then(() => {
        return createCloudantDatabase(
          supplierWsk,
          cloudantAccount,
          AUTHDB_NAME
        );
      })
      .then(() => {
        return getConversationCredentialsFromGuid(
          accessToken,
          conversationGuid
        );
      })
      .then(convCreds => {
        return updateAuthDocument(
          supplierWsk,
          convCreds,
          conversationWorkspace,
          authKey,
          cloudantAccount
        );
      })
      .then(() => {
        resolve({
          code: 200,
          message: 'OK'
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
 * @return {JSON}                - Cloud Functions instance object
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
 * Create and update all non-channel packages onto the given Cloud Functions instance
 *
 * @param  {Object}   ow         - Cloud Functions instance
 * @param  {string}   namespace  - Cloud Functions namespace
 * @param  {string}   deployName - deployment name
 * @param  {string[]} packages   - array of all package names
 * @return {Promise}             - resolve if all updates succeeded, reject otherwise
 */
function updateAllPackages(ow, namespace, deployName, packages) {
  return new Promise((resolve, reject) => {
    const promises = [];

    for (let i = 0; i < packages.length; i += 1) {
      const packageName = `${deployName}_${packages[i]}`;
      promises.push(ow.packages.update({ name: packageName, namespace }));
    }

    Promise.all(promises).then(resolve).catch(reject);
  });
}

/**
 * Inject all necessary annotations into all non-channel packages.
 *
 * @param  {Object}   ow              - Cloud Functions instance
 * @param  {string}   namespace       - Cloud Functions namespace
 * @param  {string}   deployName      - deployment name
 * @param  {string[]} packageNames    - array of all package names
 * @param  {JSON}     cloudantAccount - cloudant instance information
 * @param  {string}   authKey         - auth key
 * @return {Promise}                  - resolve if all updates succeeded, reject otherwise
 */
function updatePackageAnnotations(
  ow,
  namespace,
  deployName,
  packageNames,
  cloudantAccount,
  authKey
) {
  return new Promise((resolve, reject) => {
    const promises = [];
    const pkg = {
      annotations: [
        {
          key: 'cloudant_url',
          value: cloudantAccount.url
        },
        {
          key: 'cloudant_auth_key',
          value: authKey
        },
        {
          key: 'cloudant_auth_dbname',
          value: AUTHDB_NAME
        },
        {
          key: 'cloudant_context_dbname',
          value: CONTEXTDB_NAME
        }
      ]
    };

    for (let i = 0; i < packageNames.length; i += 1) {
      const packageName = `${deployName}_${packageNames[i]}`;

      promises.push(
        ow.packages.update({ name: packageName, package: pkg, namespace })
      );
    }

    return Promise.all(promises).then(resolve).catch(reject);
  });
}

/**
 * Takes specified Cloud Functions actions in the supplier namespace and
 *   transfers them to the user's namespace.
 *
 * @param  {Object}   supplier        - supplier's Cloud Functions
 * @param  {Object}   user            - user's Cloud Functions
 * @param  {string}   deployName      - deployment name
 * @param  {string[]} actionNames     - names of all actions to transfer
 * @param  {string}   namespace       - user's Cloud Functions namespace
 * @return {Promise}                  - resolution of all action updates
 */
function transferWskActions(
  supplier,
  user,
  deployName,
  actionNames,
  namespace
) {
  return new Promise((resolve, reject) => {
    const promises = [];
    for (let i = 0; i < actionNames.length; i += 1) {
      const action = `${deployName}_${actionNames[i]}`;
      const promise = getWskAction(supplier, actionNames[i]).then(source => {
        return updateWskAction(user, action, source, namespace);
      });
      promises.push(promise);
    }

    Promise.all(promises)
      .then(() => {
        resolve({
          code: 200,
          status: 'OK'
        });
      })
      .catch(error => {
        reject(error.error.error); // Cloud Functions invocation error message wrapped in error keys
      });
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
 * @param  {Object} ow         - Cloud Functions account to update action to
 * @param  {string} actionName - name of action to update
 * @param  {string} action     - action source code
 * @param  {string} namespace  - Cloud Functions account's namespace
 * @return {Promise}           - resolution of action update
 */
function updateWskAction(ow, actionName, action, namespace) {
  return new Promise((resolve, reject) => {
    ow.actions
      .update({ name: actionName, action, namespace })
      .then(resolve)
      .catch(reject);
  });
}

/**
 * Calls create cloudant instance action
 *
 * @param  {Object} ow           - Cloud Functions instance
 * @param  {string} accessToken  - Bluemix access token
 * @param  {string} refreshToken - Bluemix refresh token
 * @param  {string} namespace    - Cloud Functions namespace
 * @return {Promise}             - resolution of Cloud Functions invocation
 */
function createCloudantInstance(ow, accessToken, refreshToken, namespace) {
  const input = {
    access_token: accessToken,
    refresh_token: refreshToken,
    namespace
  };
  return ow.actions.invoke({
    name: 'create-cloudant-lite-instance',
    params: input,
    blocking: true,
    result: true
  });
}

/**
 * Call create cloudant database action
 *
 * @param  {Object} ow             - Cloud Functions instance
 * @param  {JSON} cloudantAccount  - cloudant instance information
 * @param  {string} dbName         - database name
 * @return {Promise}               - resolution of Cloud Functions invocation
 */
function createCloudantDatabase(ow, cloudantAccount, dbName) {
  const input = {
    cloudant: cloudantAccount,
    db_name: dbName
  };
  return ow.actions.invoke({
    name: 'create-cloudant-database',
    params: input,
    blocking: true,
    result: true
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
 * @param  {JSON}   convCreds       - Conversation username and password
 * @param  {string} convWorkspace   - Conversation workspace ID
 * @param  {string} authKey         - auth key
 * @param  {JSON}   cloudantAccount - cloudant account information
 * @return {Promise}                - resolution of Cloud Functions invocation
 */
function updateAuthDocument(
  ow,
  convCreds,
  convWorkspace,
  authKey,
  cloudantAccount
) {
  const input = {
    pipeline: {
      conversation: {
        username: convCreds.username,
        password: convCreds.password,
        workspace_id: convWorkspace
      }
    },
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
 * Validates the required parameters for running this action.
 *
 * @param  {JSON} params - parameters passed into the action
 * @return               - error only if at least one parameter is invalid
 */
function validateParameters(params) {
  // Required: state object
  assert(params.state, 'Could not get user input information.');

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
    "Could not get user's Cloud Functions namespace."
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
