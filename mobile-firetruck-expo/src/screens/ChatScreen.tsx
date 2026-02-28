// src/screens/ChatScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';

interface Message {
  id: number;
  text: string;
  sender: 'admin' | 'driver' | 'system';
  timestamp: string;
}

const ChatScreen = () => {
  const route = useRoute<any>();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: 'Dispatch: Fire reported at 123 Main Street. Please respond.',
      sender: 'admin',
      timestamp: '10:30 AM',
    },
    {
      id: 2,
      text: 'Copy. On the way to location.',
      sender: 'driver',
      timestamp: '10:32 AM',
    },
    {
      id: 3,
      text: 'Arrived at scene. Assessing situation.',
      sender: 'driver',
      timestamp: '10:45 AM',
    },
  ]);

  const [inputText, setInputText] = useState('');

  const quickReplies = ['Copy', 'On the way', 'Arrived', 'Standby'];

  /* ================= RECEIVE UPDATE FROM HOME ================= */
  useEffect(() => {
    if (route.params?.newMessage) {
      const newSystemMessage: Message = {
        id: messages.length + 1,
        text: route.params.newMessage,
        sender: 'system',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setMessages((prev) => [...prev, newSystemMessage]);
    }
  }, [route.params?.newMessage]);

  /* ================= SEND MESSAGE ================= */
  const handleSend = () => {
    if (inputText.trim()) {
      const newMessage: Message = {
        id: messages.length + 1,
        text: inputText.trim(),
        sender: 'driver',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages([...messages, newMessage]);
      setInputText('');
    }
  };

  const handleQuickReply = (reply: string) => {
    const newMessage: Message = {
      id: messages.length + 1,
      text: reply,
      sender: 'driver',
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setMessages([...messages, newMessage]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Central Station</Text>
        <Text style={styles.headerSubtitle}>Dispatch Channel</Text>
      </View>

      {/* Messages */}
      <ScrollView style={styles.messagesContainer}>
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageContainer,
              message.sender === 'driver'
                ? styles.driverMessage
                : message.sender === 'admin'
                ? styles.adminMessage
                : styles.systemMessageContainer,
            ]}
          >
            {message.sender === 'system' && (
              <Text style={styles.systemLabel}>SYSTEM UPDATE</Text>
            )}

            <Text
              style={[
                styles.messageText,
                message.sender === 'driver'
                  ? styles.driverMessageText
                  : message.sender === 'admin'
                  ? styles.adminMessageText
                  : styles.systemMessageText,
              ]}
            >
              {message.text}
            </Text>

            <Text style={styles.timestamp}>{message.timestamp}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Quick Replies */}
      <View style={styles.quickRepliesContainer}>
        {quickReplies.map((reply) => (
          <TouchableOpacity
            key={reply}
            style={styles.quickReplyButton}
            onPress={() => handleQuickReply(reply)}
          >
            <Text style={styles.quickReplyText}>{reply}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type message..."
          multiline
          maxLength={200}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  header: {
    backgroundColor: '#D32F2F',
    padding: 16,
    paddingTop: 40,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },

  headerSubtitle: {
    fontSize: 12,
    color: '#ffcccc',
    marginTop: 2,
  },

  messagesContainer: {
    flex: 1,
    padding: 16,
  },

  messageContainer: {
    marginVertical: 6,
    maxWidth: '80%',
  },

  adminMessage: {
    alignSelf: 'flex-start',
  },

  driverMessage: {
    alignSelf: 'flex-end',
  },

  systemMessageContainer: {
    alignSelf: 'center',
    maxWidth: '95%',
  },

  messageText: {
    fontSize: 14,
    padding: 12,
    borderRadius: 8,
  },

  adminMessageText: {
    backgroundColor: '#fff',
    color: '#333',
  },

  driverMessageText: {
    backgroundColor: '#D32F2F',
    color: '#fff',
  },

  systemMessageText: {
    backgroundColor: '#E3F2FD',
    color: '#0D47A1',
  },

  systemLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0D47A1',
    marginBottom: 2,
    textAlign: 'center',
  },

  timestamp: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    paddingHorizontal: 4,
    textAlign: 'right',
  },

  quickRepliesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },

  quickReplyButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },

  quickReplyText: {
    fontSize: 12,
    color: '#333',
  },

  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },

  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 80,
    fontSize: 14,
  },

  sendButton: {
    backgroundColor: '#D32F2F',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen;