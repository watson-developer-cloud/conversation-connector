'use strict';

const Cloudant = require('cloudant');
/**
 * Utility functions for Cloudant
 **/

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
    console.error(
      `CloudantAccount returned an unexpected object type: ${typeof cloudant}`
    );
  }
  cloudant.db.destroy(dbName, (err, data) => {
    if (data) {
      cloudant.db.create(dbName, (error, body) => {
        if (!error) {
          return body;
        }
        return error;
      });
    }
    return err;
  });
}

module.exports = { clearContextDb };
