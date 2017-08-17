'use strict';

const assert = require('assert');

/**
 * Receives a subscription message from Slack
 *   and returns the appropriate information depending of subscription event received.
 *
 * @param  {JSON} params - Slack Events API parameters as outlined by
 *                       https://api.slack.com/events-api
 * @return {Promise} - Result of the Slack subscription event specified by Slack API
 */
function main(params) {
  return new Promise((resolve, reject) => {
    validateParameters(params);

    if (isDuplicateMessage(params)) {
      reject(extractSlackParameters(params));
    } else if (isUrlVerification(params)) {
      const challenge = params.challenge || '';
      reject({
        code: 200,
        challenge
      });
    } else if (isBotMessage(params)) {
      reject({ bot_id: isBotMessage(params) });
    } else {
      resolve(extractSlackParameters(params));
    }
  });
}

/**
 * Extracts and converts the input parametrs to only parameters that were passed by Slack.
 *
 * @param  {JSON} params - Parameters passed into the action,
 *                       including Slack parameters and package bindings
 * @return {JSON} - JSON containing all and only Slack parameters
 *                    and indicators that the JSON is coming from Slack channel package
 */
function extractSlackParameters(params) {
  const noIncludeKeys = [
    '__ow_headers',
    '__ow_method',
    '__ow_path',
    '__ow_verb',
    'client_id',
    'client_secret',
    'redirect_uri',
    'verification_token'
  ];

  const slackParams = {};
  Object.keys(params).forEach(key => {
    if (noIncludeKeys.indexOf(key) < 0) {
      slackParams[key] = params[key];
    }
  });

  return {
    slack: slackParams,
    provider: 'slack'
  };
}

/**
 * Returns true if the message received was a duplicate/retry message.
 *
 * @param  {JSON}  params - Parameters passed into the action
 * @return {Boolean}      - true only if a duplicate message was detected
 */
function isDuplicateMessage(params) {
  return params.__ow_headers &&
    params.__ow_headers['x-slack-retry-reason'] &&
    params.__ow_headers['x-slack-retry-num'] &&
    params.__ow_headers['x-slack-retry-reason'] === 'http_timeout' &&
    params.__ow_headers['x-slack-retry-num'] > 0;
}

/**
 * Returns true if the message was a challenge request.
 *
 * @param  {JSON}  params - Parameters passed into the action
 * @return {Boolean}      - true only is the message is a challenge message
 */
function isUrlVerification(params) {
  return params.type && params.type === 'url_verification';
}

/**
 * Returns true if the message was sent from a bot instead of a human.
 *
 * @param  {JSON}  params - Parameters passed into the action
 * @return {Boolean}      - true only if the message was from a bot
 */
function isBotMessage(params) {
  const slackEvent = params.event;
  const botId = (slackEvent && slackEvent.bot_id) ||
    (slackEvent && slackEvent.message && slackEvent.message.bot_id);
  return botId;
}

/**
 * Validates the required parameters for running this action.
 *
 * @param  {JSON} params - the parameters passed into the action
 */
function validateParameters(params) {
  // Required: Both expected and actuals verification tokens, and they must be equal
  assert(params.verification_token, 'Verification token is incorrect.');
  const token = params.token ||
    (params.payload &&
      JSON.parse(params.payload) &&
      JSON.parse(params.payload).token);
  assert(token, 'Verification token is incorrect.');
  assert.equal(
    params.verification_token,
    token,
    'Verification token is incorrect.'
  );
}

module.exports = main;
