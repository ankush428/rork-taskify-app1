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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Audio } from 'expo-av';
import { Send, Sparkles, Plus, Mic, Square, CheckCircle2, Circle, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Typography, Spacing, BorderRadius } from '@/constants/typography';
import { useApp } from '@/providers/AppProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useTaskAI, transcribeAudio } from '@/lib/rorkAI';
import ChatTaskCard from '@/components/ChatTaskCard';
import { Task } from '@/types';

export default function ChatScreen() {
  const { 
    tasks, 
    todayTasks, 
    upcomingTasks, 
    overdueTasks, 
    completedTasks,
    addTask, 
    updateTask, 
    deleteTask, 
    toggleTaskComplete 
  } = useApp();
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const sendScale = useRef(new Animated.Value(1)).current;
  const typingAnim = useRef(new Animated.Value(0)).current;
  const quickActionsAnim = useRef(new Animated.Value(0)).current;
  const micScale = useRef(new Animated.Value(1)).current;
  const inputRef = useRef<TextInput>(null);

  const agent = useTaskAI({
    tasks,
    todayTasks,
    upcomingTasks,
    overdueTasks,
    completedTasks,
    onAddTask: addTask,
    onUpdateTask: updateTask,
    onDeleteTask: deleteTask,
    onToggleComplete: toggleTaskComplete,
  });

  const { messages, error, sendMessage, setMessages } = agent;

  const isTyping = messages.length > 0 && 
    messages[messages.length - 1]?.role === 'user' &&
    messages[messages.length - 1]?.parts?.some(p => 
      p.type === 'tool' && (p.state === 'input-streaming' || p.state === 'input-available')
    );

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

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true);
    }
  }, [messages.length]);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setTimeout(() => scrollToBottom(false), 100);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {}
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(micScale, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(micScale, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      micScale.setValue(1);
    }
  }, [isRecording, micScale]);

  const scrollToBottom = useCallback((animated: boolean = true) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    }, 100);
  }, []);

  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    const userMessage = inputText.trim();
    setInputText('');
    scrollToBottom();

    try {
      await sendMessage(userMessage);
      scrollToBottom();
    } catch (err) {
      console.error('[ChatScreen] Error sending message:', err);
    }
  }, [inputText, sendMessage, scrollToBottom]);

  const startRecording = useCallback(async () => {
    if (Platform.OS === 'web') {
      console.log('[ChatScreen] Web recording not implemented');
      return;
    }

    try {
      console.log('[ChatScreen] Starting recording...');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      });

      setRecording(newRecording);
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.error('[ChatScreen] Failed to start recording:', err);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recording) return;

    console.log('[ChatScreen] Stopping recording...');
    setIsRecording(false);
    setIsTranscribing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        
        const transcription = await transcribeAudio(uri, fileType);
        if (transcription) {
          setInputText(transcription);
        }
      }
    } catch (err) {
      console.error('[ChatScreen] Error stopping recording:', err);
    } finally {
      setIsTranscribing(false);
    }
  }, [recording]);

  const handleMicPress = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

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

  const handleQuickAction = useCallback((text: string) => {
    setShowQuickActions(false);
    setInputText(text);
    inputRef.current?.focus();
  }, []);

  const quickActionScale = quickActionsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const quickActionOpacity = quickActionsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const renderToolOutput = (toolName: string, output: unknown) => {
    if (toolName === 'listTasks' && output && typeof output === 'object' && 'tasks' in output) {
      const taskList = (output as { tasks: Array<{ id: string; title: string; priority: string; status: string; dueDate?: string }> }).tasks;
      if (taskList.length === 0) {
        return (
          <View style={styles.emptyTasksCard}>
            <Circle size={20} color={Colors.textTertiary} />
            <Text style={styles.emptyTasksText}>No tasks found</Text>
          </View>
        );
      }
      return (
        <View style={styles.taskListContainer}>
          {taskList.slice(0, 5).map((task) => (
            <View key={task.id} style={styles.miniTaskCard}>
              {task.status === 'completed' ? (
                <CheckCircle2 size={18} color={Colors.success} />
              ) : (
                <Circle size={18} color={Colors.primary} />
              )}
              <View style={styles.miniTaskContent}>
                <Text style={styles.miniTaskTitle} numberOfLines={1}>{task.title}</Text>
                {task.dueDate && (
                  <Text style={styles.miniTaskDue}>{task.dueDate}</Text>
                )}
              </View>
              <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(task.priority) }]} />
            </View>
          ))}
        </View>
      );
    }
    
    if (toolName === 'getTaskSummary' && output && typeof output === 'object') {
      const summary = output as { totalTasks: number; todayCount: number; overdueCount: number; completedCount: number };
      return (
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{summary.todayCount}</Text>
              <Text style={styles.summaryLabel}>Today</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, summary.overdueCount > 0 && styles.overdueNumber]}>{summary.overdueCount}</Text>
              <Text style={styles.summaryLabel}>Overdue</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, styles.completedNumber]}>{summary.completedCount}</Text>
              <Text style={styles.summaryLabel}>Done</Text>
            </View>
          </View>
        </View>
      );
    }

    return null;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return Colors.error;
      case 'medium': return Colors.warning;
      case 'low': return Colors.success;
      default: return Colors.textTertiary;
    }
  };

  const renderMessage = (message: typeof messages[0], index: number) => {
    const isUser = message.role === 'user';
    
    return (
      <View key={message.id || index} style={[styles.messageContainer, isUser && styles.userMessageContainer]}>
        {message.parts.map((part, partIndex) => {
          const partKey = `${message.id || index}-${partIndex}`;
          
          switch (part.type) {
            case 'text':
              if (!part.text) return null;
              return (
                <View 
                  key={partKey} 
                  style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}
                >
                  <Text style={[styles.messageText, isUser && styles.userMessageText]}>
                    {part.text}
                  </Text>
                </View>
              );
            
            case 'tool':
              if (part.state === 'output-available' && part.output) {
                const customRender = renderToolOutput(part.toolName, part.output);
                if (customRender) {
                  return <View key={partKey}>{customRender}</View>;
                }
                
                if (typeof part.output === 'object' && 'success' in (part.output as object)) {
                  const result = part.output as { success: boolean; message: string };
                  return (
                    <View key={partKey} style={styles.toolResultCard}>
                      {result.success ? (
                        <CheckCircle2 size={18} color={Colors.success} />
                      ) : (
                        <AlertCircle size={18} color={Colors.error} />
                      )}
                      <Text style={styles.toolResultText}>{result.message}</Text>
                    </View>
                  );
                }
              }
              
              if (part.state === 'input-streaming' || part.state === 'input-available') {
                return (
                  <View key={partKey} style={styles.toolLoadingCard}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.toolLoadingText}>Processing...</Text>
                  </View>
                );
              }
              
              if (part.state === 'output-error') {
                return (
                  <View key={partKey} style={styles.toolErrorCard}>
                    <AlertCircle size={18} color={Colors.error} />
                    <Text style={styles.toolErrorText}>Something went wrong</Text>
                  </View>
                );
              }
              
              return null;
            
            default:
              return null;
          }
        })}
      </View>
    );
  };

  const hasAssistantResponse = messages.some(m => m.role === 'assistant');
  const isWaitingForResponse = messages.length > 0 && 
    messages[messages.length - 1]?.role === 'user' && 
    !hasAssistantResponse;

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
            <Text style={styles.headerSubtitle}>Powered by AI</Text>
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
        >
          <View style={styles.welcomeContainer}>
            <View style={styles.welcomeIcon}>
              <Sparkles size={32} color={Colors.primary} />
            </View>
            <Text style={styles.welcomeTitle}>Hi{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋</Text>
            <Text style={styles.welcomeText}>
              I&apos;m your AI task assistant. Ask me to create tasks, show your schedule, or help you stay organized.
            </Text>
          </View>

          {messages.map((message, index) => renderMessage(message, index))}
          
          {isWaitingForResponse && (
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

          {error && (
            <View style={styles.errorContainer}>
              <AlertCircle size={18} color={Colors.error} />
              <Text style={styles.errorText}>Something went wrong. Please try again.</Text>
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
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => handleQuickAction("Show my tasks for today")}
            >
              <Text style={styles.quickActionText}>📋 Show my tasks</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => handleQuickAction("What's due today?")}
            >
              <Text style={styles.quickActionText}>⏰ What&apos;s due today?</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => handleQuickAction("Create a new task")}
            >
              <Text style={styles.quickActionText}>✨ Add a new task</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => handleQuickAction("Give me a summary of my tasks")}
            >
              <Text style={styles.quickActionText}>📊 Task summary</Text>
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
              placeholder={isRecording ? "Listening..." : "Message..."}
              placeholderTextColor={isRecording ? Colors.primary : Colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!isRecording && !isTranscribing}
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
            ) : isTranscribing ? (
              <View style={styles.micButton}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : (
              <Animated.View style={{ transform: [{ scale: micScale }] }}>
                <TouchableOpacity 
                  style={[styles.micButton, isRecording && styles.micButtonActive]}
                  onPress={handleMicPress}
                >
                  {isRecording ? (
                    <Square size={16} color={Colors.textInverse} fill={Colors.textInverse} />
                  ) : (
                    <Mic size={20} color={Colors.textTertiary} />
                  )}
                </TouchableOpacity>
              </Animated.View>
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
  messageContainer: {
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xs,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: BorderRadius.xs,
  },
  aiBubble: {
    backgroundColor: Colors.chat.aiBubble,
    borderBottomLeftRadius: BorderRadius.xs,
  },
  messageText: {
    ...Typography.body,
    color: Colors.text,
  },
  userMessageText: {
    color: Colors.textInverse,
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
  micButtonActive: {
    backgroundColor: Colors.error,
  },
  toolResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xs,
  },
  toolResultText: {
    ...Typography.subhead,
    color: Colors.text,
    flex: 1,
  },
  toolLoadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xs,
  },
  toolLoadingText: {
    ...Typography.subhead,
    color: Colors.textSecondary,
  },
  toolErrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.errorMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xs,
  },
  toolErrorText: {
    ...Typography.subhead,
    color: Colors.error,
  },
  taskListContainer: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  miniTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  miniTaskContent: {
    flex: 1,
  },
  miniTaskTitle: {
    ...Typography.subhead,
    color: Colors.text,
  },
  miniTaskDue: {
    ...Typography.caption2,
    color: Colors.textTertiary,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyTasksCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xs,
  },
  emptyTasksText: {
    ...Typography.subhead,
    color: Colors.textTertiary,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: Spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    ...Typography.title2,
    color: Colors.text,
  },
  overdueNumber: {
    color: Colors.error,
  },
  completedNumber: {
    color: Colors.success,
  },
  summaryLabel: {
    ...Typography.caption1,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.errorMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  errorText: {
    ...Typography.subhead,
    color: Colors.error,
    flex: 1,
  },
});
