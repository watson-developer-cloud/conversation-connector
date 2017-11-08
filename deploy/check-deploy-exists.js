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

const apihost = 'openwhisk.ng.bluemix.net';

/**
 * Accepts a user's Bluemix tokens and org-space, as well as a deployment name,
 *   and returns whether the deployment already exists in the user's Cloud Functions namespace.
 *
 * @param  {JSON} params    - Parameters passed into the action
 * @return {Promise}        - status code and message depicting success or error
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

    const accessToken = params.state.auth.access_token;
    const refreshToken = params.state.auth.refresh_token;
    const wskNamespace = params.state.wsk.namespace;
    const deployName = params.state.name;

    checkRegex(deployName)
      .then(() => {
        return getCloudFunctionsFromBluemix(
          accessToken,
          refreshToken,
          wskNamespace
        );
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
      })
      .then(ow => {
        return ow.actions.get({ name: deployName, namespace: wskNamespace });
      })
      .then(
        () => {
          reject({
            code: 400,
            message: `Deployment "${deployName}" already exists.`
          });
        },
        () => {
          resolve({
            code: 200,
            message: 'OK'
          });
        }
      );
  });
}

/**
 * Checks whether the deployment name is valid to use.
 *
 * @param  {string}  deploymentName - deployment name
 * @return {Promise}                - resolve if deployment name is valid, reject otherwise
 */
function checkRegex(deploymentName) {
  return new Promise((resolve, reject) => {
    const matchString = /^([a-zA-Z0-9][a-zA-Z0-9-]{0,255})$/;

    if (!matchString.test(deploymentName)) {
      reject(
        'Deployment name contains invalid characters. Please use only the following characters in your deployment name: "a-z A-Z 0-9 -". Additionally, your deployment name cannot start with a -, and your name cannot be longer than 256 characters.'
      );
    } else {
      resolve(deploymentName);
    }
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
 * Validates the required parameters for running this action.
 *
 * @param  {JSON} params - the parameters passed into the action
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

  // Required: Name of deployment
  assert(params.state.name, 'Could not get deployment name.');
}

module.exports = main;
