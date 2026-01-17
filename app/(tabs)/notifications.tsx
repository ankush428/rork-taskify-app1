import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Clock, UserPlus, Share2, Award, BellOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Typography, Spacing, BorderRadius } from '@/constants/typography';
import { useApp } from '@/providers/AppProvider';
import EmptyState from '@/components/EmptyState';

const notificationIcons: Record<string, React.ReactNode> = {
  task_due: <Clock size={20} color={Colors.warning} />,
  friend_request: <UserPlus size={20} color={Colors.info} />,
  task_shared: <Share2 size={20} color={Colors.primary} />,
  achievement: <Award size={20} color={Colors.success} />,
  reminder: <Bell size={20} color={Colors.primary} />,
};

const notificationColors: Record<string, string> = {
  task_due: Colors.warning + '20',
  friend_request: Colors.info + '20',
  task_shared: Colors.primaryMuted,
  achievement: Colors.success + '20',
  reminder: Colors.primaryMuted,
};

export default function NotificationsScreen() {
  const { notifications, markNotificationRead } = useApp();

  const handleNotificationPress = (notificationId: string) => {
    Haptics.selectionAsync();
    markNotificationRead(notificationId);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const readNotifications = notifications.filter(n => n.isRead);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {unreadNotifications.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadNotifications.length}</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {notifications.length === 0 ? (
          <EmptyState
            icon={<BellOff size={64} color={Colors.textTertiary} />}
            title="No notifications"
            description="You're all caught up! Check back later for updates."
          />
        ) : (
          <>
            {unreadNotifications.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>New</Text>
                {unreadNotifications.map((notification) => (
                  <TouchableOpacity
                    key={notification.id}
                    style={[styles.notificationCard, styles.notificationCardUnread]}
                    onPress={() => handleNotificationPress(notification.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: notificationColors[notification.type] },
                      ]}
                    >
                      {notificationIcons[notification.type]}
                    </View>
                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationTitle}>
                        {notification.title}
                      </Text>
                      <Text style={styles.notificationMessage}>
                        {notification.message}
                      </Text>
                      <Text style={styles.notificationTime}>
                        {formatTimestamp(notification.timestamp)}
                      </Text>
                    </View>
                    <View style={styles.unreadDot} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {readNotifications.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Earlier</Text>
                {readNotifications.map((notification) => (
                  <TouchableOpacity
                    key={notification.id}
                    style={styles.notificationCard}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: notificationColors[notification.type] },
                      ]}
                    >
                      {notificationIcons[notification.type]}
                    </View>
                    <View style={styles.notificationContent}>
                      <Text style={[styles.notificationTitle, styles.notificationTitleRead]}>
                        {notification.title}
                      </Text>
                      <Text style={[styles.notificationMessage, styles.notificationMessageRead]}>
                        {notification.message}
                      </Text>
                      <Text style={styles.notificationTime}>
                        {formatTimestamp(notification.timestamp)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
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
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  title: {
    ...Typography.largeTitle,
    color: Colors.text,
  },
  badge: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    ...Typography.caption2,
    color: Colors.textInverse,
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.headline,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationCardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    ...Typography.headline,
    color: Colors.text,
    marginBottom: 2,
  },
  notificationTitleRead: {
    color: Colors.textSecondary,
  },
  notificationMessage: {
    ...Typography.subhead,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  notificationMessageRead: {
    color: Colors.textTertiary,
  },
  notificationTime: {
    ...Typography.caption2,
    color: Colors.textTertiary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: Spacing.sm,
    marginTop: Spacing.xs,
  },
});
