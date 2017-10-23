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
 * Accepts cloudant authdb instance, database, document information, as well as auth doc,
 *   and stores the auth doc into the cloudant database.
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
    const authKey = params.auth_key;
    const pipeline = params.pipeline;

    const cloudantUrl = `https://${account}:${password}@${account}.cloudant.com/${dbName}/${authKey}`;

    return retriableLoadDocument(cloudantUrl)
      .then(doc => {
        return updateAuthDocument(doc, pipeline);
      })
      .then(doc => {
        return retriableInsertDocument(cloudantUrl, doc);
      })
      .then(() => {
        resolve({ code: 200, message: 'OK' });
      })
      .catch(error => {
        reject({ code: 400, message: error.error });
      });
  });
}

/**
 * Try loading a cloudant database document, retry if service timed out.
 *
 * @param  {string} url - cloudant document url
 * @return {string}     - document loaded
 */
function retriableLoadDocument(url) {
  return new Promise((resolve, reject) => {
    return request(
      {
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
                return retriableLoadDocument(url);
              })
              .then(resolve)
              .catch(reject);
          } else {
            reject(error);
          }
        } else if (response.statusCode >= 500) {
          sleep(RETRY_TIMEOUT)
            .then(() => {
              return retriableLoadDocument(url);
            })
            .then(resolve)
            .catch(reject);
        } else if (response.statusCode === 404) {
          resolve({});
        } else if (response.statusCode < 200 || response.statusCode >= 400) {
          reject(JSON.parse(response.body));
        } else {
          resolve(JSON.parse(body));
        }
      }
    );
  });
}
/**
 * Try inserting a cloudant database document, retry if service timed out.
 *
 * @param  {string} url - cloudant document url
 * @param  {JSON}   doc - auth documentation
 * @return {string}     - response to cloudant document insertion
 */
function retriableInsertDocument(url, doc) {
  return new Promise((resolve, reject) => {
    return request(
      {
        method: 'PUT',
        form: JSON.stringify(doc),
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
                return retriableInsertDocument(url, doc);
              })
              .then(resolve)
              .catch(reject);
          } else {
            reject(error);
          }
        } else if (response.statusCode >= 500) {
          sleep(RETRY_TIMEOUT)
            .then(() => {
              return retriableInsertDocument(url, doc);
            })
            .then(resolve)
            .catch(reject);
        } else if (response.statusCode < 200 || response.statusCode >= 400) {
          reject(JSON.parse(response.body));
        } else {
          resolve(JSON.parse(body));
        }
      }
    );
  });
}

/**
 * Update auth document
 *
 * @param  {JSON} doc      - old auth doc
 * @param  {JSON} pipeline - updated JSON pipeline
 * @return {JSON}          - new auth doc
 */
function updateAuthDocument(doc, pipeline) {
  return new Promise(resolve => {
    const newDoc = doc;

    // Save Conversation info from pipeline object
    newDoc.conversation = pipeline.conversation;

    // Save only deployment channel info (based on name) from pipeline object
    if (pipeline.channel && pipeline.channel.name) {
      newDoc[pipeline.channel.name] = pipeline.channel[pipeline.channel.name];
    }

    resolve(newDoc);
  });
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

/**
 * Validates the required parameters for running this action.
 *
 * @param  {JSON} params - the parameters passed into the action
 */
function validateParameters(params) {
  assert(params.cloudant, 'No cloudant object provided.');
  assert(params.db_name, 'No database name provided.');
  assert(params.pipeline, 'No pipeline provided.');
  assert(params.auth_key, 'No auth key provided.');
}

module.exports = main;
