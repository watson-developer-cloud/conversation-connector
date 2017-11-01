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

const request = require('request');
/**
 * Utility functions for Cloudant
 */

/**
 * Clears the context database by deleting and re-creating the db.
 * @param  {string} dbName Name of the context database
 * @param  {string} cloudant_url Cloudant instance base url
 * @return {object} response body/error json
 */
function clearContextDb(cloudantUrl, dbName) {
  return retriableDestroyDatabase(cloudantUrl, dbName).then(() => {
    return retriableCreateDatabase(cloudantUrl, dbName);
  });
}

function retriableDestroyDatabase(cloudantUrl, dbName) {
  return new Promise((resolve, reject) => {
    return request(
      {
        method: 'DELETE',
        url: `${cloudantUrl}/${dbName}`
      },
      (error, response, body) => {
        if (error) {
          const errorString = typeof error === 'string'
            ? JSON.parse(error).error
            : error.error;
          if (errorString === 'service_unavailable') {
            sleep(500)
              .then(() => {
                return retriableCreateDatabase(cloudantUrl, dbName);
              })
              .then(resolve)
              .catch(reject);
          } else {
            reject(error);
          }
        } else if (response.statusCode >= 500) {
          sleep(500)
            .then(() => {
              return retriableCreateDatabase(cloudantUrl, dbName);
            })
            .then(resolve)
            .catch(reject);
        } else if (response.statusCode < 200 || response.statusCode >= 400) {
          const responseBody = JSON.parse(response.body);
          reject(responseBody);
        } else {
          resolve(body);
        }
      }
    );
  });
}

function retriableCreateDatabase(cloudantUrl, dbName) {
  return new Promise((resolve, reject) => {
    return request(
      {
        method: 'PUT',
        url: `${cloudantUrl}/${dbName}`
      },
      (error, response, body) => {
        if (error) {
          const errorString = typeof error === 'string'
            ? JSON.parse(error).error
            : error.error;
          if (errorString === 'service_unavailable') {
            sleep(500)
              .then(() => {
                return retriableCreateDatabase(cloudantUrl, dbName);
              })
              .then(resolve)
              .catch(reject);
          } else {
            reject(error);
          }
        } else if (response.statusCode >= 500) {
          sleep(500)
            .then(() => {
              return retriableCreateDatabase(cloudantUrl, dbName);
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

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

module.exports = { clearContextDb };
