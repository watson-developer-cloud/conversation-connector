'use strict';

/**
 * Here the user can edit the Conversation SDK output message as he desires.
 *
 * @param  {JSON} params - output JSON sent by Conversation module
 * @return {JSON}        - modified output JSON to be sent to normalization and to channel/post
 */
function main(params) {
  return Promise.resolve(params);
}

module.exports = main;
