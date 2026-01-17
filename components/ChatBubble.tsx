import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import { Typography, Spacing, BorderRadius } from '@/constants/typography';
import { ChatMessage } from '@/types';

interface ChatBubbleProps {
  message: ChatMessage;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[styles.container, isUser ? styles.containerUser : styles.containerAI]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        <Text style={[styles.text, isUser ? styles.textUser : styles.textAI]}>
          {message.content}
        </Text>
      </View>
      <Text style={[styles.time, isUser ? styles.timeUser : styles.timeAI]}>
        {formatTime(message.timestamp)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    maxWidth: '80%',
    marginHorizontal: Spacing.sm,
  },
  containerUser: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  containerAI: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.xl,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleUser: {
    backgroundColor: Colors.chat.userBubble,
    borderBottomRightRadius: BorderRadius.xs,
  },
  bubbleAI: {
    backgroundColor: Colors.chat.aiBubble,
    borderBottomLeftRadius: BorderRadius.xs,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  text: {
    ...Typography.body,
  },
  textUser: {
    color: Colors.chat.userText,
  },
  textAI: {
    color: Colors.chat.aiText,
  },
  time: {
    ...Typography.caption2,
    marginTop: Spacing.xs,
  },
  timeUser: {
    color: Colors.textTertiary,
  },
  timeAI: {
    color: Colors.textTertiary,
  },
});
