'use strict';

const assert = require('assert');
const openwhisk = require('openwhisk');
const request = require('request');

const apihost = 'openwhisk.ng.bluemix.net';

/**
 * Accepts a user's Bluemix tokens and org-space, as well as a deployment name,
 *   and returns whether the deployment already exists in the user's OpenWhisk namespace.
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

    getOpenwhiskFromBluemix(accessToken, refreshToken, wskNamespace)
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
 * Get the user's OpenWhisk credentials using his Bluemix access and refresh tokens.
 *
 * @param  {string} accessToken  - Bluemix access token
 * @param  {string} refreshToken - Bluemix refresh token
 * @param  {string} namespace    - Bluemix organization_space
 * @return {JSON}                - OpenWhisk credentials: { apihost, apikey }
 */
function getOpenwhiskFromBluemix(accessToken, refreshToken, namespace) {
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

  // Required: OpenWhisk namespace
  assert(
    params.state.wsk && params.state.wsk.namespace,
    "Could not get user's Bluemix credentials."
  );

  // Required: Name of deployment
  assert(params.state.name, 'Could not get deployment name.');
}

module.exports = main;
