'use strict';

const openwhisk = require('openwhisk');

/**
 *  Receives a subscription message from Slack
 *    and sends the appropriate information to a starter-code action name.
 *
 *  @params Slack Events API parameters as outlined by https://api.slack.com/events-api
 *
 *  @return Result of invocation of starter-code action if the action was specified;
 *    otherwise, a JSON object of the event subscription received
 */
function main(params) {
  try {
    validateParams(params);
  } catch (e) {
    return Promise.reject(e.message);
  }

  const type = params.type;

  //  url verification is for validation this action with slack during the setup
  //    this action simply passes the challenge passed by slack used for verification
  if (type === 'url_verification') {
    const challenge = params.challenge || '';

    return Promise.resolve({
      code: 200,
      challenge
    });
  }

  //  event_callback is sent by slack for most major subscription events such as message sent
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
        return Promise.resolve({ bot_id: botId });
      }

      const openwhiskApiHost = params.ow_api_host;
      const openwhiskApiKey = params.ow_api_key;
      const ow = openwhisk({
        apihost: openwhiskApiHost,
        api_key: openwhiskApiKey
      });

      const actionName = params.starter_code_action_name;
      const slackParams = extractSlackParams(params);

      //  if starter_code_action_name is specified, send the slack params to that action
      if (actionName) {
        return ow.actions.invoke({
          name: actionName,
          blocking: true,
          result: true,
          params: slackParams
        });
      }
      //  if no starter_code_action_name specified, return the params in a promise
      return Promise.resolve(slackParams);
    }
    return Promise.reject('Message type not understood.');
  }
  return Promise.reject('Event type not understood.');
}

/**
 *  Extracts and converts the input parameters to JSON that starter-code understands.
 *
 *  @params - the parameters passed into the action
 *
 *  @return - JSON containing all and only the parameter that starter-code needs
 */
function extractSlackParams(params) {
  const slackParams = params;

  delete slackParams.__ow_meta_path;
  delete slackParams.__ow_meta_verb;
  delete slackParams.__ow_meta_headers;
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
 *  Validates the required parameters for running this action.
 *
 *  @params - the parameters passed into the action
 */
function validateParams(params) {
  // Required: OpenWhisk API host and key
  const apiHost = params.ow_api_host;
  const apiKey = params.ow_api_key;
  if (!apiHost || !apiKey) {
    throw new Error('No openwhisk credentials provided.');
  }
  // Required: Both the expected and actual verification tokens, and they must be equal
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
