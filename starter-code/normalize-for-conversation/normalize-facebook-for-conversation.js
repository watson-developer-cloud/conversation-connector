'use strict';

/**
 * Converts facebook channel-formatted JSON data into Conversation SDK formatted JSON input.
 *
 * @param  {JSON} params - input parameters in facebook's event subscription format
 * @return {JSON}        - JSON data formatted as input for Conversation SDK
 */
function main(params) {
  try {
    validateParameters(params);
  } catch (e) {
    return Promise.reject(e.message);
  }

  const conversationJson = {
    conversation: {
      input: {
        text: params.facebook.entry[0].messaging[0].message.text
      }
    },
    raw_input_data: {
      facebook: params.facebook,
      provider: 'facebook',
      // TODO: Discuss with Rob/Stephen.
      // This cloudant_key lives till context/saveContext so the action can perform
      // operations in the Cloudant db.
      // Other channels must add a similar parameter
      // which uniquely identifies a conversation for a user.
      cloudant_key: `facebook_${params.facebook.entry[0].messaging[0].sender.id}_${params.workspace_id}_${params.facebook.entry[0].id}`
    }
  };

  return Promise.resolve(conversationJson);
}

/**
 * Validates the required parameters for running this action.
 *
 * @param  {JSON} params - the parameters passed into the action
 */
function validateParameters(params) {
  // Required: the workspace_id must be present as a package binding
  if (!params.workspace_id) {
    throw new Error('workspace_id not present as a package binding.');
  }
  // Required: the provider must be known and supplied
  if (!params.provider || params.provider !== 'facebook') {
    throw new Error("Provider not supplied or isn't Facebook.");
  }
  // Required: JSON data for the channel provider must be supplied
  if (!params.facebook) {
    throw new Error('Facebook JSON data is missing.');
  }
}

module.exports = main;
