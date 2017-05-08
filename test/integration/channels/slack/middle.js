'use strict';

const openwhisk = require('openwhisk');

/**
 *  An action representing a "black box" from and to the channel specified.
 *
 *  @params Paramters sent to this action by channel/receive:
 *    {
 *      channel_name: {
 *        ...
 *      },
 *      provider: 'channel_name'
 *    }
 *
 *  @return Return parameters required by channel/post
 */
function main(params) {
  try {
    validateParams(params);
  } catch (e) {
    return Promise.reject(e.message);
  }

  const provider = params.provider;

  if (provider === 'slack') {
    const apiHost = params.ow_api_host || process.env.__OW_API_HOST;
    const apiKey = params.ow_api_key || process.env.__OW_API_KEY;

    const ow = openwhisk({
      apihost: apiHost,
      api_key: apiKey
    });

    const slackParams = params.slack;

    return new Promise((resolve, reject) => {
      ow.actions
        .invoke({
          name: 'slack/post',
          blocking: true,
          result: true,
          params: {
            channel: slackParams.event.channel,
            text: slackParams.event.text
          }
        })
        .then(
          result => {
            resolve(result);
          },
          error => {
            reject(error);
          }
        );
    });
  }
  return Promise.reject(`Provider ${provider} not supported.`);
}

/**
 *  Validates the required parameters for running this action.
 *
 *  @params - the parameters passed into the action
 */
function validateParams(params) {
  // Required: OpenWhisk API host and key
  const apiHost = params.ow_api_host || process.env.__OW_API_HOST;
  const apiKey = params.ow_api_key || process.env.__OW_API_KEY;
  if (!apiHost || !apiKey) {
    throw new Error('No OpenWhisk credentials provided.');
  }
  // Required: The channel provider communicating with this action
  if (!params.provider) {
    throw new Error('No channel provider supplied.');
  }
  // Required: The parameters of the channel provider
  if (!params[params.provider]) {
    throw new Error(`No ${params.provider} parameters provided.`);
  }
}

module.exports = main;
