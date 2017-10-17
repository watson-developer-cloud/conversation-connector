'use strict';

/**
 * Here the user can edit the channel input message before send to Conversation module.
 *
 * @param  {JSON} params - input JSON sent by the channel module
 * @return {JSON}        - modified input JSON to be sent to the conversation module
 */
function main(params) {
  return Promise.resolve(params);
}

module.exports = main;
