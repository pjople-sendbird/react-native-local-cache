# react-native-local-cache
Simple sample for Sendbird Local Cache with React Native

# Sendbird SDK version
You need to install version 3.1.1 or superior.

# Local Cache information
https://sendbird.com/docs/chat/v3/javascript/guides/local-caching#1-local-caching


# Rnning this sample
Change the information for your Sendbird application and user id (access token optional) 
from the ```App.tsx``` file. All the content is located in this file only 
(to make it easy to understand)

```
/**
 * SET YOUR SENDBIRD INFORMATION HERE
 */
const APP_ID = 'YOUR APPLICATION ID HERE';
var USER_ID = 'YOUR USER ID HERE';
var ACCESS_TOKEN: any = null;
var sb: SendBirdInstance;
const USE_LOCAL_CACHE = true;
```
