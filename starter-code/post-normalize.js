'use strict';

/**
 * The user can edit data after the normalization step in the sequence
 *
 * @param  {JSON} params - output JSON to be posted back to the channel
 * @return {JSON}        - modified output JSON to be sent to channel/post
 */
function main(params) {
  return Promise.resolve(params);
}

module.exports = main;
