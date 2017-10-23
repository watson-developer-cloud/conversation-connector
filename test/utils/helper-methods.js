/**
 * Copyright IBM Corp. 2017
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an AS IS BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/**
 * Takes an error object or string and returns a string containing the core error message.
 *
 * @param  {string/object} error Error string or object
 * @return {string}              Error string
 */
function safeExtractErrorMessage(error) {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const owError = extractCloudFunctionsErrorMessage(errorMessage);

  return owError || errorMessage;

  /**
   * Cloud Functions error messages are in the form:
   *   POST <URL> Returned HTTP <Code> (<Code Meaning>) --> "The request resource does not exist."
   * and this method will extract the core error message after the -->.
   *
   * @param  {string} eMessage Detailed Cloud Functions error message.
   * @return {string}          Core error message.
   */
  function extractCloudFunctionsErrorMessage(eMessage) {
    const arrow = '--> ';
    if (eMessage.indexOf(arrow) < 0) return null;

    return eMessage.substring(
      eMessage.indexOf(arrow) + arrow.length + 1,
      eMessage.length - 1
    );
  }
}

module.exports = { safeExtractErrorMessage };
