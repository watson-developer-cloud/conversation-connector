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
        },
        {
          label: 'Location 4',
          value: 'Location 4'
        },
        {
          label: 'Location 5',
          value: 'Location 5'
        },
        {
          label: 'Location 6',
          value: 'Location 6'
        },
        {
          label: 'Location 7',
          value: 'Location 7'
        },
        {
          label: 'Location 8',
          value: 'Location 8'
        },
        {
          label: 'Location 9',
          value: 'Location 9'
        },
        {
          label: 'Location 10',
          value: 'Location 10'
        },
        {
          label: 'Location 11',
          value: 'Location 11'
        },
        {
          label: 'Location 12',
          value: 'Location 12'
        }
      ]
    },
    {
      time: '10000',
      typing: true,
      response_type: 'pause'
    },
    {
      title: 'Audio title',
      source: 'http://www.audio.com/audio/mp3/mp3.mp3',
      description: 'Audio description',
      response_type: 'audio'
    },
    {
      title: 'Video title',
      source: 'https://www.video.com/video/mp4/mp4.mp4',
      description: 'Video description',
      response_type: 'video'
    }
  ];

  const genericForFacebook = [
    {
      text
    },
    {
      attachment: {
        type: 'image',
        payload: {
          url: genericFromConversation[1].source
        }
      }
    },
    {
      text: genericFromConversation[2].title,
      quick_replies: genericFromConversation[2].options.map(e => {
        const el = {};
        el.content_type = 'text';
        el.title = e.label;
        el.payload = e.value;
        return el;
      })
    },
    {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: [
            {
              title: genericFromConversation[2].title,
              buttons: [
                {
                  title: 'Location 1',
                  payload: 'Location 1',
                  type: 'postback'
                },
                {
                  title: 'Location 2',
                  payload: 'Location 2',
                  type: 'postback'
                },
                {
                  title: 'Location 3',
                  payload: 'Location 3',
                  type: 'postback'
                }
              ]
            },
            {
              title: genericFromConversation[2].title,
              buttons: [
                {
                  title: 'Location 4',
                  payload: 'Location 4',
                  type: 'postback'
                },
                {
                  title: 'Location 5',
                  payload: 'Location 5',
                  type: 'postback'
                },
                {
                  title: 'Location 6',
                  payload: 'Location 6',
                  type: 'postback'
                }
              ]
            },
            {
              title: genericFromConversation[2].title,
              buttons: [
                {
                  title: 'Location 7',
                  payload: 'Location 7',
                  type: 'postback'
                },
                {
                  title: 'Location 8',
                  payload: 'Location 8',
                  type: 'postback'
                },
                {
                  title: 'Location 9',
                  payload: 'Location 9',
                  type: 'postback'
                }
              ]
            },
            {
              title: genericFromConversation[2].title,
              buttons: [
                {
                  title: 'Location 10',
                  payload: 'Location 10',
                  type: 'postback'
                },
                {
                  title: 'Location 11',
                  payload: 'Location 11',
                  type: 'postback'
                },
                {
                  title: 'Location 12',
                  payload: 'Location 12',
                  type: 'postback'
                }
              ]
            }
          ]
        }
      }
    },
    {
      sender_action: 'typing_on',
      time: genericFromConversation[4].time
    },
    {
      attachment: {
        type: 'audio',
        payload: {
          url: genericFromConversation[5].source
        }
      }
    },
    {
      text: genericFromConversation[6].source
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
    textRes.message = [genericForFacebook[0]];

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
    textRes.message = [genericForFacebook[1]];

    return actionNormForFacebook(textMsgParams).then(
      result => {
        assert.deepEqual(result, textRes);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for generic response_type - option (under 11 options)', () => {
    delete textMsgParams.conversation.output.text;
    delete textMsgParams.conversation.output.facebook;

    delete textRes.raw_output_data.conversation.output.text;
    delete textRes.raw_output_data.conversation.output.facebook;
    delete textRes.text;

    // Add a generic option response from Conversation
    textMsgParams.conversation.output.generic = genericFromConversation[2];

    textRes.raw_output_data.conversation.output.generic = textMsgParams.conversation.output.generic;
    delete textRes.message;
    textRes.message = [genericForFacebook[2]];

    return actionNormForFacebook(textMsgParams).then(
      result => {
        assert.deepEqual(result, textRes);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for generic response_type - video', () => {
    delete textMsgParams.conversation.output.text;
    delete textMsgParams.conversation.output.facebook;

    // Add a generic image response from Conversation
    textMsgParams.conversation.output.generic = genericFromConversation[6];

    textRes.raw_output_data.conversation.output.generic = textMsgParams.conversation.output.generic;

    delete textRes.message;
    textRes.message = [genericForFacebook[6]];

    return actionNormForFacebook(textMsgParams).then(
      result => {
        assert.deepEqual(result, textRes);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for generic response_type - audio', () => {
    delete textMsgParams.conversation.output.text;
    delete textMsgParams.conversation.output.facebook;

    // Add a generic image response from Conversation
    textMsgParams.conversation.output.generic = genericFromConversation[5];

    textRes.raw_output_data.conversation.output.generic = textMsgParams.conversation.output.generic;

    delete textRes.message;
    textRes.message = [genericForFacebook[5]];

    return actionNormForFacebook(textMsgParams).then(
      result => {
        // console.log('AUDIO RESULT: ' + JSON.stringify(result));
        assert.deepEqual(result, textRes);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for generic response_type - option (over 11 options)', () => {
    delete textMsgParams.conversation.output.text;
    delete textMsgParams.conversation.output.facebook;

    delete textRes.raw_output_data.conversation.output.text;
    delete textRes.raw_output_data.conversation.output.facebook;
    delete textRes.text;

    // Add a generic option response from Conversation
    textMsgParams.conversation.output.generic = genericFromConversation[3];

    textRes.raw_output_data.conversation.output.generic = textMsgParams.conversation.output.generic;
    delete textRes.message;
    textRes.message = [genericForFacebook[3]];

    return actionNormForFacebook(textMsgParams).then(
      result => {
        assert.deepEqual(result, textRes);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for generic multi-modal response (under 11 options)', () => {
    delete textMsgParams.conversation.output.text;
    delete textMsgParams.conversation.output.facebook;

    delete textRes.raw_output_data.conversation.output.text;
    delete textRes.raw_output_data.conversation.output.facebook;
    delete textRes.text;

    // Add a generic mixed response from Conversation with 3 options.
    textMsgParams.conversation.output.generic = genericFromConversation.slice(
      0,
      3
    );

    textRes.raw_output_data.conversation.output.generic = textMsgParams.conversation.output.generic;
    delete textRes.message;
    textRes.message = genericForFacebook.slice(0, 3);

    return actionNormForFacebook(textMsgParams).then(
      result => {
        assert.deepEqual(result, textRes);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for generic multi-modal response (over 11 options)', () => {
    delete textMsgParams.conversation.output.text;
    delete textMsgParams.conversation.output.facebook;

    delete textRes.raw_output_data.conversation.output.text;
    delete textRes.raw_output_data.conversation.output.facebook;
    delete textRes.text;

    // Add a generic mixed response from Conversation with 12 options.
    textMsgParams.conversation.output.generic = genericFromConversation.slice(
      0,
      2
    );
    textMsgParams.conversation.output.generic.push(genericFromConversation[3]);

    textRes.raw_output_data.conversation.output.generic = textMsgParams.conversation.output.generic;
    delete textRes.message;

    textRes.message = genericForFacebook.slice(0, 2);
    textRes.message.push(genericForFacebook[3]);

    return actionNormForFacebook(textMsgParams).then(
      result => {
        assert.deepEqual(result, textRes);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for generic response_type - option (options.value is JSON object)', () => {
    delete textMsgParams.conversation.output.text;
    delete textMsgParams.conversation.output.facebook;

    delete textRes.raw_output_data.conversation.output.text;
    delete textRes.raw_output_data.conversation.output.facebook;
    delete textRes.text;

    // Make the first option value an object instead of a string.
    genericFromConversation[2].options[0].value = {
      input: {
        text: 'Location 1'
      },
      intents: [
        {
          intent: 'get-location',
          confidence: 0.8177993774414063
        }
      ],
      entities: [
        {
          entity: 'Location',
          location: [0, 9],
          value: '1',
          confidence: 1
        }
      ]
    };

    // Add a generic option response from Conversation
    textMsgParams.conversation.output.generic = genericFromConversation[2];

    textRes.raw_output_data.conversation.output.generic = textMsgParams.conversation.output.generic;
    delete textRes.message;
    textRes.message = [genericForFacebook[2]];

    return actionNormForFacebook(textMsgParams).then(
      result => {
        assert.deepEqual(result, textRes);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for generic response_type - pause (typing TRUE)', () => {
    delete textMsgParams.conversation.output.text;
    delete textMsgParams.conversation.output.facebook;

    delete textRes.raw_output_data.conversation.output.text;
    delete textRes.raw_output_data.conversation.output.facebook;
    delete textRes.text;

    // Add a generic pause response from Conversation
    textMsgParams.conversation.output.generic = genericFromConversation[4];

    textRes.raw_output_data.conversation.output.generic = textMsgParams.conversation.output.generic;
    delete textRes.message;
    textRes.message = [genericForFacebook[4]];

    return actionNormForFacebook(textMsgParams).then(
      result => {
        assert.deepEqual(result, textRes);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for generic response_type - pause (typing FALSE)', () => {
    delete textMsgParams.conversation.output.text;
    delete textMsgParams.conversation.output.facebook;

    delete textRes.raw_output_data.conversation.output.text;
    delete textRes.raw_output_data.conversation.output.facebook;
    delete textRes.text;

    genericFromConversation[4].typing = false;
    // Add a generic pause response from Conversation
    textMsgParams.conversation.output.generic = genericFromConversation[4];

    textRes.raw_output_data.conversation.output.generic = textMsgParams.conversation.output.generic;
    delete textRes.message;
    delete genericForFacebook[4].sender_action;
    textRes.message = [genericForFacebook[4]];

    return actionNormForFacebook(textMsgParams).then(
      result => {
        assert.deepEqual(result, textRes);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate no action taken for generic response_type- UNKNOWN', () => {
    delete textMsgParams.conversation.output.text;
    delete textMsgParams.conversation.output.facebook;

    delete textRes.raw_output_data.conversation.output.text;
    delete textRes.raw_output_data.conversation.output.facebook;
    delete textRes.text;

    // Add an unknown generic response from Conversation
    textMsgParams.conversation.output.generic = [
      {
        response_type: 'connect_to_agent',
        message_to_human_agent: 'Customer needs to know their PUK.',
        topic: 'Find PUK'
      }
    ];
    textRes.raw_output_data.conversation.output.generic = textMsgParams.conversation.output.generic;
    textRes.message = []; // Facebook POST doesn't need to be invoked. Result list is empty.

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
