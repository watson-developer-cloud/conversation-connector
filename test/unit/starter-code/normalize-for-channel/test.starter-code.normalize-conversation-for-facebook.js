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
 * Unit tests for normalizing conversation SDK output parameters into Facebook parameters
 */

const assert = require('assert');
const actionNormForFacebook = require('./../../../../starter-code/normalize-for-channel/normalize-conversation-for-facebook.js');

const recipient = {
  id: 'user_id'
};
const text = 'hello, world!';

const errorNoConversationOutput = 'No conversation output.';
const errorNoOutputMessage = 'No facebook/generic/text field in conversation.output.';
const errorNoRawInputData = 'No raw input data found.';
const errorNoFacebookInputData = 'No Facebook input data found.';
const errorNoConvInputData = 'No Conversation input data found.';
const errorNoFacebookSenderId = 'No Facebook sender_id found in raw data.';

describe('Starter-Code Normalize-For-Facebook Unit Tests', () => {
  let textMsgParams;
  let interactiveMsgParamsWithoutMsgObj;
  let interactiveMsgParamsWithMsgObj;
  const fbTextMsgParams = {
    sender: {
      id: 'user_id'
    },
    recipient: {
      id: 'page_id'
    },
    message: {
      text: 'hello, world!'
    }
  };
  const fbInteractiveMsgParams = {
    sender: {
      id: 'user_id'
    },
    recipient: {
      id: 'page_id'
    },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'list',
          elements: [
            {
              title: 'Black T-Shirt',
              buttons: [
                {
                  type: 'postback',
                  title: 'Buy Black Shirt',
                  payload: 'Buy Black Shirt'
                }
              ],
              subtitle: '100% Cotton, 200% Comfortable'
            }
          ],
          top_element_style: 'compact'
        }
      }
    }
  };

  const genericFromConversation = [
    {
      response_type: 'text',
      text
    },
    {
      response_type: 'image',
      source: 'http://my-website.com/path/to/image.jpg',
      title: 'Image title',
      description: ' '
    },
    {
      response_type: 'option',
      title: 'Select a location',
      options: [
        {
          label: 'Location 1',
          value: 'Location 1'
        },
        {
          label: 'Location 2',
          value: 'Location 2'
        },
        {
          label: 'Location 3',
          value: 'Location 3'
        }
      ]
    }
  ];

  const genericForFacebook = [
    {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: [
            {
              title: text,
              subtitle: ' '
            }
          ]
        }
      }
    },
    {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: [
            {
              title: genericFromConversation[1].title,
              image_url: genericFromConversation[1].source,
              subtitle: genericFromConversation[1].description
            }
          ]
        }
      }
    },
    {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: [
            {
              title: genericFromConversation[2].title,
              buttons: genericFromConversation[2].options.map(e => {
                const el = {};
                el.type = 'postback';
                el.title = e.label;
                el.payload = ' ';
                return el;
              })
            }
          ]
        }
      }
    },
    {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: [
            {
              title: text,
              subtitle: ' '
            },
            {
              title: genericFromConversation[1].title,
              image_url: genericFromConversation[1].source,
              subtitle: genericFromConversation[1].description
            },
            {
              title: genericFromConversation[2].title,
              buttons: genericFromConversation[2].options.map(e => {
                const el = {};
                el.type = 'postback';
                el.title = e.label;
                el.payload = ' ';
                return el;
              })
            }
          ]
        }
      }
    }
  ];

  const textRes = {
    raw_input_data: {
      conversation: {
        input: {
          text
        }
      },
      facebook: fbTextMsgParams,
      provider: 'facebook'
    },
    raw_output_data: {
      conversation: {
        output: {
          text: [text]
        }
      }
    },
    message: {
      text
    },
    recipient
  };

  const interactiveResWithoutMsgObj = {
    raw_input_data: {
      conversation: {
        input: {
          text
        }
      },
      facebook: fbInteractiveMsgParams,
      provider: 'facebook'
    },
    raw_output_data: {
      conversation: {
        output: {
          text: [text],
          facebook: fbInteractiveMsgParams.message
        }
      }
    },
    message: fbInteractiveMsgParams.message,
    recipient
  };

  const interactiveResWithMsgObj = {
    raw_input_data: {
      conversation: {
        input: {
          text
        }
      },
      facebook: fbInteractiveMsgParams,
      provider: 'facebook'
    },
    raw_output_data: {
      conversation: {
        output: {
          text: [text],
          facebook: fbInteractiveMsgParams
        }
      }
    },
    message: fbInteractiveMsgParams.message,
    recipient
  };

  beforeEach(() => {
    textMsgParams = {
      conversation: {
        output: {
          text: [text]
        }
      },
      raw_input_data: {
        conversation: {
          input: {
            text
          }
        },
        facebook: fbTextMsgParams,
        provider: 'facebook'
      }
    };
    interactiveMsgParamsWithoutMsgObj = {
      conversation: {
        output: {
          text: [text],
          facebook: fbInteractiveMsgParams.message
        }
      },
      raw_input_data: {
        conversation: {
          input: {
            text
          }
        },
        facebook: fbInteractiveMsgParams,
        provider: 'facebook'
      }
    };
    interactiveMsgParamsWithMsgObj = {
      conversation: {
        output: {
          text: [text],
          facebook: fbInteractiveMsgParams
        }
      },
      raw_input_data: {
        conversation: {
          input: {
            text
          }
        },
        facebook: fbInteractiveMsgParams,
        provider: 'facebook'
      }
    };
  });

  it('validate normalization works for text messages', () => {
    return actionNormForFacebook(textMsgParams).then(
      result => {
        assert.deepEqual(result, textRes);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for interactive messages (i.e. output.facebook) ', () => {
    return actionNormForFacebook(interactiveMsgParamsWithoutMsgObj).then(
      result => {
        assert.deepEqual(result, interactiveResWithoutMsgObj);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for interactive messages (i.e. output.facebook.message)', () => {
    return actionNormForFacebook(interactiveMsgParamsWithMsgObj).then(
      result => {
        assert.deepEqual(result, interactiveResWithMsgObj);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for generic response_type - text', () => {
    delete textMsgParams.conversation.output.text;

    delete textRes.raw_output_data.conversation.output.text;
    delete textRes.raw_output_data.conversation.output.facebook;

    // Add a generic text response from Conversation
    textMsgParams.conversation.output.generic = genericFromConversation[0];

    textRes.raw_output_data.conversation.output.generic = textMsgParams.conversation.output.generic;
    delete textRes.message;
    textRes.message = genericForFacebook[0];

    return actionNormForFacebook(textMsgParams).then(
      result => {
        assert.deepEqual(result, textRes);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for generic response_type - image', () => {
    delete textMsgParams.conversation.output.text;
    delete textMsgParams.conversation.output.facebook;

    delete textRes.raw_output_data.conversation.output.text;
    delete textRes.raw_output_data.conversation.output.facebook;
    delete textRes.text;

    // Add a generic image response from Conversation
    textMsgParams.conversation.output.generic = genericFromConversation[1];

    textRes.raw_output_data.conversation.output.generic = textMsgParams.conversation.output.generic;
    delete textRes.message;
    textRes.message = genericForFacebook[1];

    return actionNormForFacebook(textMsgParams).then(
      result => {
        assert.deepEqual(result, textRes);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for generic response_type - option', () => {
    delete textMsgParams.conversation.output.text;
    delete textMsgParams.conversation.output.facebook;

    delete textRes.raw_output_data.conversation.output.text;
    delete textRes.raw_output_data.conversation.output.facebook;
    delete textRes.text;

    // Add a generic option response from Conversation
    textMsgParams.conversation.output.generic = genericFromConversation[2];

    textRes.raw_output_data.conversation.output.generic = textMsgParams.conversation.output.generic;
    delete textRes.message;
    textRes.message = genericForFacebook[2];

    return actionNormForFacebook(textMsgParams).then(
      result => {
        assert.deepEqual(result, textRes);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for generic response_type - mixed', () => {
    delete textMsgParams.conversation.output.text;
    delete textMsgParams.conversation.output.facebook;

    delete textRes.raw_output_data.conversation.output.text;
    delete textRes.raw_output_data.conversation.output.facebook;
    delete textRes.text;

    // Add a generic mixed response from Conversation
    textMsgParams.conversation.output.generic = genericFromConversation;

    textRes.raw_output_data.conversation.output.generic = textMsgParams.conversation.output.generic;
    delete textRes.message;
    textRes.message = genericForFacebook[3];

    return actionNormForFacebook(textMsgParams).then(
      result => {
        assert.deepEqual(result, textRes);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate error when no conversation data', () => {
    delete textMsgParams.conversation.output;

    return actionNormForFacebook(textMsgParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoConversationOutput);
      }
    );
  });

  it('validate error when no conversation output', () => {
    delete textMsgParams.conversation.output.text;

    return actionNormForFacebook(textMsgParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoOutputMessage);
      }
    );
  });

  it('validate error when no facebook input data', () => {
    delete textMsgParams.raw_input_data;

    return actionNormForFacebook(textMsgParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoRawInputData);
      }
    );
  });

  it('validate error when no facebook input data', () => {
    delete textMsgParams.raw_input_data.facebook;

    return actionNormForFacebook(textMsgParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoFacebookInputData);
      }
    );
  });

  it('validate error when no conversation input data', () => {
    delete textMsgParams.raw_input_data.conversation;

    return actionNormForFacebook(textMsgParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoConvInputData);
      }
    );
  });

  it('validate error when no facebook channel', () => {
    delete textMsgParams.raw_input_data.facebook.sender;

    return actionNormForFacebook(textMsgParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoFacebookSenderId);
      }
    );
  });
});
