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
const request = require('request');

const RETRY_TIMEOUT = 400;

/**
 * Accepts a cloudant instance object and a database name,
 *   and creates a cloudant database within.
 *
 * @param  {JSON} params    - Parameters passed into the action
 * @return {Promise}        - status code and message depicting success or error
 */
function main(params) {
  return new Promise((resolve, reject) => {
    try {
      validateParameters(params);
    } catch (error) {
      reject({ code: 400, message: error.message });
    }

    const account = params.cloudant.username;
    const password = params.cloudant.password;
    const dbName = params.db_name;

    return retriableCreateCloudantDatabase(account, password, dbName)
      .then(() => {
        resolve({ code: 200, message: 'OK' });
      })
      .catch(error => {
        reject({ code: 400, message: error.error });
      });
  });
}

/**
 * Try creating a cloudant database, retry if service timed out.
 *
 * @param  {string} account  - cloudant account name
 * @param  {string} password - cloudant password
 * @param  {string} dbName   - cloudant database name
 * @return {string}          - response to cloudant database creation
 */
function retriableCreateCloudantDatabase(account, password, dbName) {
  return new Promise((resolve, reject) => {
    const url = `https://${account}:${password}@${account}.cloudant.com/${dbName}`;

    return request(
      {
        method: 'PUT',
        url
      },
      (error, response, body) => {
        if (error) {
          const errorString = typeof error === 'string'
            ? JSON.parse(error).error
            : error.error;
          if (errorString === 'service_unavailable') {
            sleep(RETRY_TIMEOUT)
              .then(() => {
                return retriableCreateCloudantDatabase(
                  account,
                  password,
                  dbName
                );
              })
              .then(resolve)
              .catch(reject);
          } else {
            reject(error);
          }
        } else if (response.statusCode >= 500) {
          sleep(RETRY_TIMEOUT)
            .then(() => {
              return retriableCreateCloudantDatabase(account, password, dbName);
            })
            .then(resolve)
            .catch(reject);
        } else if (response.statusCode < 200 || response.statusCode >= 400) {
          const responseBody = JSON.parse(response.body);
          if (responseBody.error === 'file_exists') {
            resolve({});
          } else {
            reject(responseBody);
          }
        } else {
          resolve(body);
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
  assert(params.cloudant, 'No cloudant object provided.');
  assert(params.db_name, 'No database name provided.');
}

/**
 * Sleep for a supplied amount of milliseconds.
 *
 * @param  {integer} ms - number of milliseconds to sleep
 * @return {Promise}    - Promise resolve
 */
function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

module.exports = main;
