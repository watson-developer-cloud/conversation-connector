'use strict';

/**
 *  An action representing a "black box" from and to the channel specified.
 *
 *  @params Paramters sent to this action by channel/receive:
 *    {
 *      slack: {
 *        ...
 *      },
 *      provider: 'slack',
 *      channel_id: 'CXXXXXXXXXX',
 *      text: 'Hello World'
 *    }
 *
 *  @return Return parameters required by slack/post
 */
function main(params) {
  try {
    validateParams(params);
  } catch (e) {
    return Promise.reject(e.message);
  }

  return {
    channel: params.slack.event.channel,
    text: params.slack.event.text
  };
}

/**
 *  Validates the required parameters for running this action.
 *
 *  @params - the parameters passed into the action
 */
function validateParams(params) {
  // Required: The channel provider communicating with this action
  if (!params.provider || params.provider !== 'slack') {
    throw new Error('No slack channel provider supplied.');
  }
  // Required: The parameters of the channel provider
  if (!params.slack) {
    throw new Error('No slack data or event parameters provided.');
  }
}

module.exports = main;
