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
