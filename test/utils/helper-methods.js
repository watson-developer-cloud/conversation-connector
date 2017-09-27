'use strict';

/**
 * Takes an error object or string and returns a string containing the core error message.
 *
 * @param  {string/object} error Error string or object
 * @return {string}              Error string
 */
function safeExtractErrorMessage(error) {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const owError = extractOpenwhiskErrorMessage(errorMessage);

  return owError || errorMessage;

  /**
   * OpenWhisk error messages are in the form:
   *   POST <URL> Returned HTTP <Code> (<Code Meaning>) --> "The request resource does not exist."
   * and this method will extract the core error message after the -->.
   *
   * @param  {string} eMessage Detailed OpenWhisk error message.
   * @return {string}          Core error message.
   */
  function extractOpenwhiskErrorMessage(eMessage) {
    const arrow = '--> ';
    if (eMessage.indexOf(arrow) < 0) return null;

    return eMessage.substring(
      eMessage.indexOf(arrow) + arrow.length + 1,
      eMessage.length - 1
    );
  }
}

module.exports = { safeExtractErrorMessage };
