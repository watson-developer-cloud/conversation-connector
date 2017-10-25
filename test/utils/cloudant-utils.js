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

const Cloudant = require('cloudant');
/**
 * Utility functions for Cloudant
 */

/**
 * Clears the context database by deleting and re-creating the db.
 * @param  {string} dbName Name of the context database
 * @param  {string} cloudant_url Cloudant instance base url
 * @return {object} response body/error json
 */
function clearContextDb(dbName, cloudantUrl) {
  const cloudant = Cloudant({
    url: cloudantUrl,
    plugin: 'retry',
    retryAttempts: 5,
    retryTimeout: 1000
  });
  if (typeof cloudant !== 'object') {
    throw new Error(
      `CloudantAccount returned an unexpected object type: ${typeof cloudant}`
    );
  }

  destroyDb(cloudant, dbName).then(() => {
    return createDb(cloudant, dbName);
  });
}

function destroyDb(cloudant, dbName) {
  return new Promise((resolve, reject) => {
    cloudant.db.destroy(dbName, (err, data) => {
      if (data) {
        resolve();
      } else {
        reject(err);
      }
    });
  });
}

function createDb(cloudant, dbName) {
  return new Promise((resolve, reject) => {
    cloudant.db.create(dbName, (err, body) => {
      if (!err) {
        resolve(body);
      } else {
        reject(err);
      }
    });
  });
}

module.exports = { clearContextDb };
