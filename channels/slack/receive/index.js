'use strict';

/**
 * Receives a subscription message from Slack
 *   and returns the appropriate information depending of subscription event received.
 *
 * @param  {JSON} params - Slack Events API parameters as outlined by
 *                       https://api.slack.com/events-api
 * @return {Promise} - Result of the Slack subscription event specified by Slack API
 */
function main(params) {
  try {
    validateParameters(params);
  } catch (e) {
    return Promise.reject(e.message);
  }

  const type = params.type;

  // url_verification is for validating this action with slack during slack's setup phase
  //  this action simply passes the challenge passed by slack during verification
  if (type === 'url_verification') {
    const challenge = params.challenge || '';

    // Promise reject is used here to break the Openwhisk sequence-action.
    // Breaking the sequence-action here means sending the challenge directly to the Slack server.
    return Promise.reject({
      code: 200,
      challenge
    });
  }

  // event_callback is sent by slack for most major subscription events such as message sent
  if (type === 'event_callback') {
    const eventType = params.event && params.event.type;
    if (!eventType) {
      return Promise.reject(
        'No event type specified in event callback slack subscription.'
      );
    }

    if (eventType === 'message') {
      const botId = params.event.bot_id;

      if (botId) {
        // Promise reject is used here to break the Openwhisk sequence-action.
        // Breaking the sequence-action here means the pipeline shouldn't handle bot messages.
        return Promise.reject({ bot_id: botId });
      } else if (
        params.__ow_headers &&
        params.__ow_headers['x-slack-retry-reason'] &&
        params.__ow_headers['x-slack-retry-num'] &&
        params.__ow_headers['x-slack-retry-reason'] === 'http_timeout' &&
        params.__ow_headers['x-slack-retry-num'] > 0
      ) {
        // OpenWhisk timed out on Slack, and so Slack resent this event subscription as a duplicate
        //  For now, this duplicate message is ignored,
        //  but in the future, we need to check if this event was handled by the previous event
        //  with a database.
        return Promise.reject(extractSlackParameters(params));
      }

      return Promise.resolve(extractSlackParameters(params));
    }

    return Promise.reject('Message type not understood.');
  }

  return Promise.reject('Event type not understood.');
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
  const slackParams = params;

  delete slackParams.__ow_headers;
  delete slackParams.__ow_method;
  delete slackParams.__ow_path;
  delete slackParams.__ow_verb;
  delete slackParams.ow_api_host;
  delete slackParams.ow_api_key;
  delete slackParams.client_id;
  delete slackParams.client_secret;
  delete slackParams.redirect_uri;
  delete slackParams.verification_token;
  delete slackParams.starter_code_action_name;

  return {
    slack: slackParams,
    provider: 'slack'
  };
}

/**
 * Validates the required parameters for running this action.
 *
 * @param  {JSON} params - the parameters passed into the action
 */
function validateParameters(params) {
  // Required: Both expected and actuals verification tokens, and they must be equal
  if (
    !params.token ||
    !params.verification_token ||
    params.token !== params.verification_token
  ) {
    throw new Error('Verification token is incorrect.');
  }

  // Required: The type of Slack subscription event received
  if (!params.type) {
    throw new Error('No subscription type specified.');
  }
}

module.exports = main;
