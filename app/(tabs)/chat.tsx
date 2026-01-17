import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Send, Sparkles, Plus, Mic } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Typography, Spacing, BorderRadius } from '@/constants/typography';
import { useApp } from '@/providers/AppProvider';
import { useAuth } from '@/providers/AuthProvider';
import { AIService } from '@/lib/aiService';
import ChatBubble from '@/components/ChatBubble';
import ChatTaskCard from '@/components/ChatTaskCard';
import { ChatMessage, Task } from '@/types';

interface EnhancedChatMessage extends ChatMessage {
  task?: Task;
}

export default function ChatScreen() {
  const { chatMessages, addChatMessage, todayTasks, tasks, addTask } = useApp();
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const sendScale = useRef(new Animated.Value(1)).current;
  const typingAnim = useRef(new Animated.Value(0)).current;
  const quickActionsAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(typingAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      typingAnim.setValue(0);
    }
  }, [isTyping, typingAnim]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToBottom(true);
    }
  }, [chatMessages.length, scrollToBottom]);

  // Handle keyboard show/hide for better scrolling
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setTimeout(() => scrollToBottom(false), 100);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        // Optional: scroll to bottom when keyboard hides
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [scrollToBottom]);

  const scrollToBottom = useCallback((animated: boolean = true) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    }, 100);
  }, []);

  const handleSend = async () => {
    if (!inputText.trim() || !user?.id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    const userMessage = inputText.trim();
    setInputText('');
    addChatMessage(userMessage, 'user');
    scrollToBottom();

    setIsTyping(true);

    try {
      // Prepare conversation history
      const conversationHistory = chatMessages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Process message with AI service
      const aiResponse = await AIService.processMessage(user.id, userMessage, conversationHistory);

      setIsTyping(false);

      // Add AI response
      addChatMessage(aiResponse.reply, 'assistant');
      scrollToBottom();

      // If tasks were extracted, create them (with confirmation if required)
      if (aiResponse.extractedTasks && aiResponse.extractedTasks.length > 0) {
        if (!aiResponse.requiresConfirmation) {
          // Auto-create tasks
          for (const extractedTask of aiResponse.extractedTasks) {
            addTask({
              title: extractedTask.title,
              description: extractedTask.description,
              dueDate: extractedTask.dueDate,
              dueTime: extractedTask.dueTime,
              priority: extractedTask.priority || 'medium',
              category: extractedTask.category || 'personal',
              status: 'pending',
              isRecurring: extractedTask.isRecurring,
              recurringPattern: extractedTask.recurringPattern,
            });
          }
        } else {
          // Show confirmation message - tasks will be created when user confirms
          // For now, we'll create them but mention it in the response
          const confirmMessage = `I've prepared ${aiResponse.extractedTasks.length} task${aiResponse.extractedTasks.length > 1 ? 's' : ''} for you. Would you like me to add ${aiResponse.extractedTasks.length > 1 ? 'them' : 'it'}?`;
          addChatMessage(confirmMessage, 'assistant');
          // TODO: Implement confirmation flow
        }
      }
    } catch (error) {
      console.error('[ChatScreen] Error processing message:', error);
      setIsTyping(false);
      
      // Fallback response
      const fallbackResponse = "I'm having trouble processing that right now. Could you try rephrasing your request?";
      addChatMessage(fallbackResponse, 'assistant');
      scrollToBottom();
    }
  };

  const handleSendPressIn = () => {
    Animated.spring(sendScale, {
      toValue: 0.85,
      useNativeDriver: true,
    }).start();
  };

  const handleSendPressOut = () => {
    Animated.spring(sendScale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const toggleQuickActions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const toValue = showQuickActions ? 0 : 1;
    Animated.spring(quickActionsAnim, {
      toValue,
      friction: 8,
      useNativeDriver: true,
    }).start();
    setShowQuickActions(!showQuickActions);
  };

  const quickActionScale = quickActionsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const quickActionOpacity = quickActionsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const renderMessage = (message: EnhancedChatMessage) => {
    if (message.task) {
      return (
        <View key={message.id} style={styles.taskMessageContainer}>
          <ChatTaskCard task={message.task} />
        </View>
      );
    }
    return <ChatBubble key={message.id} message={message} />;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            <View style={styles.aiAvatar}>
              <Sparkles size={20} color={Colors.primary} />
            </View>
            <View style={styles.onlineIndicator} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Task Assistant</Text>
            <Text style={styles.headerSubtitle}>Always here to help</Text>
          </View>
        </View>
        {user?.avatar && (
          <Image
            source={{ uri: user.avatar }}
            style={styles.userAvatar}
            contentFit="cover"
          />
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollToBottom(false)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
          }}
        >
          <View style={styles.welcomeContainer}>
            <View style={styles.welcomeIcon}>
              <Sparkles size={32} color={Colors.primary} />
            </View>
            <Text style={styles.welcomeTitle}>Hi{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋</Text>
            <Text style={styles.welcomeText}>
              I&apos;m your personal task assistant. Ask me about your tasks, or let me help you stay organized.
            </Text>
          </View>

          {chatMessages.map((message) => renderMessage(message))}
          
          {isTyping && (
            <View style={styles.typingContainer}>
              <View style={styles.typingBubble}>
                <Animated.View
                  style={[styles.typingDot, { opacity: typingAnim }]}
                />
                <Animated.View
                  style={[
                    styles.typingDot,
                    {
                      opacity: typingAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.3, 1, 0.3],
                      }),
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.typingDot,
                    {
                      opacity: typingAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0],
                      }),
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </ScrollView>

        {showQuickActions && (
          <Animated.View 
            style={[
              styles.quickActionsContainer,
              {
                opacity: quickActionOpacity,
                transform: [{ scale: quickActionScale }],
              },
            ]}
          >
            <TouchableOpacity style={styles.quickAction}>
              <Text style={styles.quickActionText}>📋 Show my tasks</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
              <Text style={styles.quickActionText}>⏰ What&apos;s due today?</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
              <Text style={styles.quickActionText}>✨ Add a new task</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity 
              style={styles.attachButton}
              onPress={toggleQuickActions}
            >
              <Plus 
                size={22} 
                color={showQuickActions ? Colors.primary : Colors.textTertiary}
                style={{ transform: [{ rotate: showQuickActions ? '45deg' : '0deg' }] }}
              />
            </TouchableOpacity>
            
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Message..."
              placeholderTextColor={Colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              onFocus={() => {
                setShowQuickActions(false);
                setTimeout(() => scrollToBottom(false), 200);
              }}
              blurOnSubmit={false}
              returnKeyType="default"
              textAlignVertical="center"
            />
            
            {inputText.trim() ? (
              <Animated.View style={{ transform: [{ scale: sendScale }] }}>
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleSend}
                  onPressIn={handleSendPressIn}
                  onPressOut={handleSendPressOut}
                  activeOpacity={1}
                >
                  <Send size={18} color={Colors.textInverse} />
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <TouchableOpacity style={styles.micButton}>
                <Mic size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarContainer: {
    position: 'relative' as const,
  },
  aiAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  headerTitle: {
    ...Typography.headline,
    color: Colors.text,
  },
  headerSubtitle: {
    ...Typography.caption1,
    color: Colors.success,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
  },
  content: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  welcomeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  welcomeTitle: {
    ...Typography.title2,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  welcomeText: {
    ...Typography.subhead,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  taskMessageContainer: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  typingContainer: {
    alignSelf: 'flex-start',
  },
  typingBubble: {
    flexDirection: 'row',
    backgroundColor: Colors.chat.aiBubble,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderBottomLeftRadius: BorderRadius.xs,
    gap: Spacing.xs,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textTertiary,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  quickAction: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionText: {
    ...Typography.subhead,
    color: Colors.text,
  },
  inputContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.xxl,
    paddingLeft: Spacing.xs,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    maxHeight: 100,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
