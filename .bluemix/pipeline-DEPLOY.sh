#!/bin/bash
echo 'Installing nvm (Node.js Version Manager)...'
npm config delete prefix
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.2/install.sh | bash > /dev/null 2>&1
. ~/.nvm/nvm.sh

echo 'Installing Node.js 7.9.0...'
nvm install 7.9.0 1>/dev/null
npm install --progress false --loglevel error 1>/dev/null

echo 'Retrieving Cloud Functions authorization key...'

# Retrieve the Cloud Functions authorization key
CF_ACCESS_TOKEN=`cat ~/.cf/config.json | jq -r .AccessToken | awk '{print $2}'`

export CLOUDFUNCTIONS_API_HOST=openwhisk.ng.bluemix.net

CLOUDFUNCTIONS_KEYS=`curl -XPOST -k -d "{ \"accessToken\" : \"$CF_ACCESS_TOKEN\", \"refreshToken\" : \"$CF_ACCESS_TOKEN\" }" \
  -H 'Content-Type:application/json' https://$CLOUDFUNCTIONS_API_HOST/bluemix/v2/authenticate`

SPACE_KEY=`echo $CLOUDFUNCTIONS_KEYS | jq -r '.namespaces[] | select(.name == "'$CF_ORG'_'$CF_SPACE'") | .key'`
SPACE_UUID=`echo $CLOUDFUNCTIONS_KEYS | jq -r '.namespaces[] | select(.name == "'$CF_ORG'_'$CF_SPACE'") | .uuid'`
CLOUDFUNCTIONS_AUTH=$SPACE_UUID:$SPACE_KEY

# Configure the Cloud Functions CLI
bx wsk property set --apihost $CLOUDFUNCTIONS_API_HOST --auth "${CLOUDFUNCTIONS_AUTH}"

./setup.sh -s
