import React, { useEffect, useState } from "react";
import {
  Button,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import SendBird, {
  AdminMessage,
  BaseChannel,
  BaseMessageInstance,
  FileMessage,
  GroupChannelContext,
  MessageCollection,
  MessageContext,
  SendBirdError,
  SendBirdInstance,
  User,
  UserMessage,
} from "sendbird";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * SET YOUR SENDBIRD INFORMATION HERE
 */
const APP_ID = "6A6CF887-E6F6-4763-84B6-BEFD2410EE42";
var USER_ID = "walter2";
var ACCESS_TOKEN: any = null;
var sb: SendBirdInstance;
const USE_LOCAL_CACHE = true;

/**
 * INIT SENDBIRD AND CONNECT
 */
function initAndConnect(callback: any) {
  // Init Sendbird
  sb = new SendBird({ appId: APP_ID, localCacheEnabled: USE_LOCAL_CACHE });
  sb.useAsyncStorageAsDatabase(AsyncStorage);
  // Connect to chat
  return sb.connect(USER_ID, ACCESS_TOKEN, (user: User, error: SendBirdError) => {
    if (error) {
      console.log(
        "Unable to connect. You need to get a first connection to access Local Cache"
      );
      callback(null);
    } else {
      console.log(user);
      callback(user);
    }
  });
}

/**
 * GET CHANNEL LIST FROM CACHE OR FROM SERVER
 */
function getChannelList(callback: any) {
  // Set your filters
  var groupChannelFilter = new sb.GroupChannelFilter();
  groupChannelFilter.includeEmpty = true;

  // Define your channel sort order
  const order: any =
    sb.GroupChannelCollection.GroupChannelOrder.LATEST_LAST_MESSAGE;

  // Create the Builder
  var groupChannelCollection = sb.GroupChannel.createGroupChannelCollection()
    .setOrder(order)
    .setFilter(groupChannelFilter)
    .build();

  // This handler will get the information
  groupChannelCollection.setGroupChannelCollectionHandler({
    onChannelsAdded: (context: any, channels: Array<any>) => {
      console.log("Local cache: onChannelsAdded", channels);
      callback({
        action: "add",
        context,
        channels,
      });
    },
    onChannelsUpdated: (context: any, channels: Array<any>) => {
      console.log("Local cache: onChannelsUpdated", channels);
      callback({
        action: "update",
        context,
        channels,
      });
    },
    onChannelsDeleted: (context: any, channelUrls: Array<string>) => {
      console.log("Local cache: onChannelsDeleted", channelUrls);
      callback({
        action: "delete",
        context,
        channelUrls,
      });
    },
  });

  // Request the info
  try {
    groupChannelCollection.loadMore().then((channels: Array<any>) => {
      callback(channels);
    });
  } catch (e) {
    console.log("Error getting channels", e);
  }
}

/**
 * GET MESSAGES FROM CACHE OR FROM SERVER
 */
function getMessagesFromChannel(groupChannel: any, callback: any) {
  // Set your filters for getting your messages
  var messageFilter = new sb.MessageFilter();
  messageFilter.customTypes = [];

  // Set the starting point to get your messages from
  var startingPoint = Date.now();

  // How many messages you want?
  var messageCollectionFetchLimit = 100;

  // Create the collection
  var messageCollection: MessageCollection = groupChannel
    .createMessageCollection()
    .setFilter(messageFilter)
    .setStartingPoint(startingPoint)
    .setLimit(messageCollectionFetchLimit)
    .build();

  // Initialise the collection and start getting messages
  messageCollection
    .initialize(
      sb.MessageCollection.MessageCollectionInitPolicy.CACHE_AND_REPLACE_BY_API
    )
    .onCacheResult((error: Error, messages: Array<BaseMessageInstance>) => {
      // Messages will be retrieved from the local cache.
      // They might be too outdated or far from the startingPoint.
      console.log("Messages from CACHE: ", messages);
      if (error) {
        console.log("Error getting messages from cache");
      } else {
        callback(true, messages);
      }
    })
    .onApiResult((error: Error, messages: Array<BaseMessageInstance>) => {
      // Messages will be retrieved from the Sendbird server through API.
      // According to the MessageCollectionInitPolicy.CACHE_AND_REPLACE_BY_API,
      // the existing data source needs to be cleared
      // before adding retrieved messages to the local cache.
      console.log("Messages from API: ", messages);
      if (error) {
        console.log("Error getting messages from Api");
      } else {
        callback(false, messages);
      }
    });

  // Set a hanlder for messages
  var messageCollectionHandler = {
    onMessagesAdded: (
      context: MessageContext,
      channel: BaseChannel,
      messages: BaseMessageInstance[]
    ) => {
      // Add the messages to your data source.
      console.log(
        `A new message was added. If you see the pendingStatus attribute for this message is: "pending"`
      );
      console.log(messages);
    },
    onMessagesUpdated: (
      context: MessageContext,
      channel: BaseChannel,
      messages: BaseMessageInstance[]
    ) => {
      // Update the messages in your data source.
      console.log("Message was updated");
      console.log(messages);
    },
    onMessagesDeleted: (
      context: MessageContext,
      channel: BaseChannel,
      messages: BaseMessageInstance[]
    ) => {
      // Remove the messages from the data source.
      console.log("Message was deleted");
      console.log(messages);
    },
    onChannelUpdated: (context: GroupChannelContext, channel: BaseChannel) => {
      // Change the chat view with the updated channel information.
      console.log("Channel for this message was updated");
    },
    onChannelDeleted: (context: GroupChannelContext, channelUrl: string) => {
      // This is called when a channel was deleted. So the current chat view should be cleared.
      console.log("Channel for this message was deleted");
    },
    onHugeGapDetected: () => {
      // The Chat SDK detects more than 300 messages missing.
      console.log("There is a gap of more than 300 messages. ");
      console.log(
        "Sendbird needs newer data  not continue with any cache action."
      );
      messageCollection.dispose();
    },
  };
  messageCollection.setMessageCollectionHandler(messageCollectionHandler);
}

/**
 * SEND A MESSAGEM EITHER ONLINE OR OFFLILNE
 */
function sendMessage(groupChannel: any, messageText: string, callback: any) {
  console.log("About to send: " + messageText);
  const params = new sb.UserMessageParams();
  params.message = messageText;
  groupChannel.sendUserMessage(
    params,
    (
      userMessage: UserMessage | FileMessage | AdminMessage,
      error: SendBirdError
    ) => {
      if (error) {
        console.log(`Error sending message. If the error code reported below is one of these: \n
                SendBirdError.ERR_NETWORK \n
                SendBirdError.ERR_ACK_TIMEOUT \n
                Then Sendbird will retry. Otherwise, the message will be lost.
            `);
        console.log(error);
      }
      callback(userMessage);
    }
  );
}

export default function App() {
  const [channelList, setChannelList] = useState<any>(null);
  const [messagesRecovered, setMessagesRecovered] = useState<any>(null);
  const [text, onChangeText] = useState("");
  const [channelSelected, setChannelSelected] = useState(null);

  /**
   * Let's begin...
   */
  useEffect(() => {
    initAndConnect((user: User) => {
      console.log(
        `
              Connected to sendbird. 
              Select a channel from the list to see its messages 
              from CACHE and from API (server)`,
        user
      )
    }).then(() => {
        getChannelList((groupChannels: Array<any>) => {
            setChannelList(groupChannels);
          });    
    })
  }, []);

  const ChannelList = () => {
    return (
      <>
        <FlatList
          data={channelList}
          renderItem={(itemSelected: any) => (
            <TouchableOpacity
              onPress={() => {
                setChannelSelected(itemSelected.item);
                getMessagesFromChannel(
                  itemSelected.item,
                  (isFromCache: boolean, messages: any) => {
                    setMessagesRecovered(messages);
                  }
                );
              }}
            >
              <Text>{itemSelected.item.url}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.url}
        />
      </>
    );
  };

  const MessageList = (messages: any) => {
    return (
      <div>
        <FlatList
          data={messages.messages}
          renderItem={({ item }) => <Text>{item.message}</Text>}
          keyExtractor={(item) => item.messageId}
        />
      </div>
    );
  };

  return (
    <View style={styles.container}>
      <View>
        <Text>Sendbird test with React-Native and Local Cache</Text>
        <View
          style={{
            borderBottomColor: "black",
            borderBottomWidth: 1,
          }}
        />

        {/* CHANNELS LIST */}
        <Text>
          {channelList
            ? "Total group channels: " + channelList.length
            : "Loading channels..."}
        </Text>
        {channelList ? <ChannelList /> : <Text>No channels</Text>}
        <View
          style={{
            borderBottomColor: "black",
            borderBottomWidth: 1,
          }}
        />

        {/* MESSAGES */}
        {messagesRecovered ? (
          <MessageList messages={messagesRecovered} />
        ) : (
          <Text>Select a channel to see its messages</Text>
        )}
        <View
          style={{
            borderBottomColor: "black",
            borderBottomWidth: 1,
          }}
        />

        {/* SEND MESSAGE */}
        <TextInput
          style={styles.input}
          onChangeText={onChangeText}
          value={text}
          placeholder="Type your message..."
        />
        <Button
          title="Send message"
          onPress={() =>
            sendMessage(channelSelected, text, () => {
              onChangeText("");
            })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
  },
});
