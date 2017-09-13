'use strict';

const assert = require('assert');
/**
 * Converts facebook channel-formatted JSON data into Conversation SDK formatted JSON input.
 *
 * @param  {JSON} params - Each individual messaging entry/event
 * {
      "sender": { "id": "1637923046xxxxxx" },
      "recipient": { "id": "268440730xxxxxx" },
      "timestamp": 1501786719609,
      "message": {
        "mid": "mid.$cAACu1giyQ85j2rwNfVdqxxxxxxxx",
        "seq": 3054,
        "text": "find a restaurant"
      }
    }
 * @return {JSON} - JSON data formatted as input for Conversation SDK
 */
function main(params) {
  return new Promise((resolve, reject) => {
    try {
      validateParameters(params);
    } catch (e) {
      reject(e.message);
    }

    return getTextFromPayload(params)
      .then(result => {
        const conversationJson = {
          conversation: {
            input: {
              text: result
            }
          },
          raw_input_data: {
            facebook: params.facebook,
            provider: 'facebook',
            cloudant_key: `facebook_${params.facebook.sender.id}_${params.workspace_id}_${params.facebook.recipient.id}`
          }
        };
        resolve(conversationJson);
      })
      .catch(e => {
        return reject(e);
      });
  });
}

/**
 * Function checks for regular text message or a postback event payload
 * and sends it to watson conversation
 * @param {JSON} params - Params coming into the action
 * @return {JSON} - Text that is to be sent to conversation
 */
function getTextFromPayload(params) {
  return new Promise((resolve, reject) => {
    // 1. Message Type Event
    // Extract text from message event to send it to Conversation
    const messageEventPayload = params.facebook.message &&
      params.facebook.message.text;

    // 2. Postback type event. Usually detected on button clicks
    // Extract text (postback payload) from postback event to send it to Conversation
    const postbackEventPayload = params.facebook.postback &&
      params.facebook.postback.payload;

    /**
     * You can add code to handle other facebook events HERE
     */

    if (messageEventPayload) {
      resolve(messageEventPayload);
    } else if (postbackEventPayload) {
      resolve(postbackEventPayload);
    } else {
      reject(
        'Neither message.text event detected nor postback.payload event detected. Please add appropriate code to handle a different facebook event.'
      );
    }
  });
}

/**
 * Validates the required parameters for running this action.
 *
 * @param  {JSON} params - the parameters passed into the action
 */
function validateParameters(params) {
  // Required: the workspace_id must be present as a package binding
  assert(params.workspace_id, 'workspace_id not present as a package binding.');
  // Required: the provider must be known and supplied
  assert(params.provider, "Provider not supplied or isn't Facebook.");
  // Required: JSON data for the channel provider must be supplied
  assert(params.facebook, 'Facebook JSON data is missing.');
}

module.exports = main;
