import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { UserPlus, Check, X, Share2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Typography, Spacing, BorderRadius } from '@/constants/typography';
import { mockFriends } from '@/mocks/data';
import Button from '@/components/Button';

export default function FriendsScreen() {
  const acceptedFriends = mockFriends.filter(f => f.status === 'accepted');
  const pendingFriends = mockFriends.filter(f => f.status === 'pending');

  const handleAccept = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDecline = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleInvite = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleInvite}>
          <UserPlus size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {pendingFriends.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Friend Requests</Text>
            {pendingFriends.map((friend) => (
              <View key={friend.id} style={styles.friendCard}>
                <Image
                  source={{ uri: friend.user.avatar }}
                  style={styles.avatar}
                  contentFit="cover"
                />
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{friend.user.name}</Text>
                  <Text style={styles.friendEmail}>{friend.user.email}</Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={handleAccept}
                  >
                    <Check size={18} color={Colors.textInverse} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.declineButton]}
                    onPress={handleDecline}
                  >
                    <X size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Friends</Text>
          {acceptedFriends.map((friend) => (
            <TouchableOpacity key={friend.id} style={styles.friendCard} activeOpacity={0.7}>
              <Image
                source={{ uri: friend.user.avatar }}
                style={styles.avatar}
                contentFit="cover"
              />
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{friend.user.name}</Text>
                <Text style={styles.friendMeta}>
                  {friend.sharedTasks} shared tasks
                </Text>
              </View>
              <TouchableOpacity style={styles.shareButton}>
                <Share2 size={18} color={Colors.primary} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inviteSection}>
          <Text style={styles.inviteTitle}>Invite Friends</Text>
          <Text style={styles.inviteDescription}>
            Share tasks and collaborate with your friends. Complete tasks together!
          </Text>
          <Button
            title="Invite Friends"
            onPress={handleInvite}
            variant="secondary"
            icon={<UserPlus size={18} color={Colors.primary} />}
          />
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: {
    ...Typography.largeTitle,
    color: Colors.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    ...Typography.headline,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surfaceSecondary,
  },
  friendInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  friendName: {
    ...Typography.headline,
    color: Colors.text,
  },
  friendEmail: {
    ...Typography.caption1,
    color: Colors.textTertiary,
  },
  friendMeta: {
    ...Typography.caption1,
    color: Colors.primary,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: Colors.primary,
  },
  declineButton: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteSection: {
    backgroundColor: Colors.primaryMuted,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
  },
  inviteTitle: {
    ...Typography.title3,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  inviteDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
});
