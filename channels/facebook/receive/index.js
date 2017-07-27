const crypto = require('crypto');

/**
 * Receives a either a url-verification-type message or a text-message from Facebook
 *   and returns the appropriate response depending on the type of event that is detected.
 *
 * @param  {JSON} params - Facebook Callback API parameters as outlined by
 *                       https://developers.facebook.com/docs/graph-api/webhooks#callback
 * @return {Promise} - Result of the Facebook callback API
 */

function main(params) {
  try {
    validateParams(params);
  } catch (e) {
    return Promise.reject(e.message);
  }
  // url verification is for validating this action with facebook during facebook's webhook
  // setup phase i.e. facebook makes a GET request to the provided webhook endpoint and
  // expects a challenge value in return. This action simply passes the challenge passed
  // by facebook during verification
  if (isURLVerificationEvent(params)) {
    // Promise reject is used here to break the Openwhisk sequence-action.
    // Breaking the sequence-action here means sending the challenge directly to the facebook
    // server.Facebook GET request to the webhook expects a string as the response. In order
    // to return a string simply reject with the challenge parameter
    return Promise.reject(params['hub.challenge']);

    // A message event is detected when a text message is sent by the user on facebook
    // messenger. In this case facebook makes a POST request to the provided webhook endpoint
  } else if (isMessageEvent(params)) {
    // Every time facebook makes a POST request to the webhook endpoint, it sends along
    // x-hub-signature header which basically contains SHA1 key. In order to make sure, that
    // the request is coming from facebook, it is important to calculate the HMAC key using
    // app-secret and the request payload and compare it against the x-hub-signature header.
    try {
      verifyFacebookSignatureHeader(params);
    } catch (e) {
      return Promise.reject(e.message);
    }

    // Extract the appropriate facebook parameters and forward them to the starter-code package
    return Promise.resolve(extractFacebookParameters(params));
  }
  return Promise.reject({
    status: 403,
    text: 'Neither a message type request nor a verfication type request detected'
  });
}

/* Checks if it's a URL verification event
 *
 * @param  {JSON} params - Parameters passed into the action,
 *                       including facebook parameters and package bindings
 * @return {boolean} - true or false
 */
function isURLVerificationEvent(params) {
  if (
    params['hub.mode'] !== 'subscribe' ||
    params['hub.verify_token'] !== params.verification_token
  ) {
    return false;
  }
  return true;
}

/* Checks if it's a message event
 *
 * @param  {JSON} params - Parameters passed into the action,
 *                       including facebook parameters and package bindings
 * @return {boolean} - true or false
 */
function isMessageEvent(params) {
  if (
    params.object !== 'page' ||
    !params.entry ||
    !params.entry[0] ||
    !params.entry[0].messaging ||
    !params.entry[0].messaging[0] ||
    !params.entry[0].messaging[0].message
  ) {
    return false;
  }
  return true;
}

/**
 *  Validates the required parameters for running this action.
 *
 *  @params The parameters passed into the action
 */
function validateParams(params) {
  const verificationToken = params.verification_token;
  const appSecret = params.app_secret;

  // Required: Facebook verification token
  if (!verificationToken) {
    throw new Error('No verification token provided.');
  }
  // Required: Facebook app secret
  if (!appSecret) {
    throw new Error('No app secret provided.');
  }
}

/* Extracts and converts the input parametrs to only parameters that were passed by facebook.
 *
 * @param  {JSON} params - Parameters passed into the action,
 *                       including facebook parameters and package bindings
 * @return {JSON} - JSON containing all and only facebook parameters
 *                    and indicators that the JSON is coming from facebook channel package
 */
function extractFacebookParameters(params) {
  const facebookParams = params;

  delete facebookParams.__ow_headers;
  delete facebookParams.__ow_method;
  delete facebookParams.__ow_path;
  delete facebookParams.__ow_verb;
  delete facebookParams.app_secret;
  delete facebookParams.page_access_token;
  delete facebookParams.verification_token;

  return {
    facebook: facebookParams,
    provider: 'facebook'
  };
}

/* Checks if the HMAC key calculated using app secret and request payload is the
 * same as the key present in x-hub-signature header. For more information, refer to
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference#security
 *
 * @param  {JSON} params - Parameters passed into the action,
 *                       including facebook parameters and package bindings
 */
function verifyFacebookSignatureHeader(params) {
  const xHubSignature = params.__ow_headers['x-hub-signature'];
  const appSecret = params.app_secret;
  if (!xHubSignature) {
    throw new Error('x-hub-signature header not found.');
  } else {
    // Construct the request payload. For more information, refer to
    // https://developers.facebook.com/docs/messenger-platform/webhook-reference#format
    const requestPayload = {};
    requestPayload.object = params.object;
    requestPayload.entry = Object.assign([], params.entry);
    const buffer = new Buffer(JSON.stringify(requestPayload));

    // Get the expected hash from the key i.e. if the key is sha1=1234
    // then remove the algorithm (sha1=) to get the hash.
    const expectedHash = xHubSignature.split('=')[1];

    // Compute the hash using the app secret and the request payload
    const calculatedHash = crypto
      .createHmac('sha1', appSecret)
      .update(buffer, 'utf-8')
      .digest('hex');

    if (calculatedHash !== expectedHash) {
      throw new Error(
        'Verfication of facebook signature header failed. Please make sure you are passing the correct app secret'
      );
    }
  }
}

module.exports = main;
