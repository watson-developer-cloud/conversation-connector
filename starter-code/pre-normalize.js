'use strict';

/**
 * The user can edit data before the normalization step in the sequence
 *
 * @param  {JSON} params - message sent from channel/receive
 * @return {JSON}        - modified channel data to be sent to normalization and conversation module
 */
function main(params) {
  return Promise.resolve(params);
}

module.exports = main;
