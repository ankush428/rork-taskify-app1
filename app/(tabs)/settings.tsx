import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import {
  ChevronRight,
  Crown,
  Bell,
  Shield,
  HelpCircle,
  Info,
  LogOut,
  Moon,
  Palette,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Typography, Spacing, BorderRadius } from '@/constants/typography';
import { useAuth } from '@/providers/AuthProvider';

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
}

function SettingItem({
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
  showChevron = true,
}: SettingItemProps) {
  return (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.settingIcon}>{icon}</View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || (showChevron && onPress && (
        <ChevronRight size={20} color={Colors.textTertiary} />
      ))}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut, isSigningOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);
  const [versionPressCount, setVersionPressCount] = React.useState(0);

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/pricing');
  };

  const handleToggleNotifications = () => {
    Haptics.selectionAsync();
    setNotificationsEnabled(!notificationsEnabled);
  };

  const handleToggleDarkMode = () => {
    Haptics.selectionAsync();
    setDarkMode(!darkMode);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.profileCard} activeOpacity={0.8}>
          <Image
            source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face' }}
            style={styles.profileAvatar}
            contentFit="cover"
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email || ''}</Text>
          </View>
          <ChevronRight size={20} color={Colors.textTertiary} />
        </TouchableOpacity>

        {!user?.isPro && (
          <TouchableOpacity style={styles.upgradeCard} onPress={handleUpgrade}>
            <View style={styles.upgradeIcon}>
              <Crown size={24} color={Colors.warning} />
            </View>
            <View style={styles.upgradeContent}>
              <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
              <Text style={styles.upgradeSubtitle}>
                Unlock unlimited tasks and AI features
              </Text>
            </View>
            <ChevronRight size={20} color={Colors.textInverse} />
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon={<Bell size={20} color={Colors.primary} />}
              title="Notifications"
              subtitle={notificationsEnabled ? 'Enabled' : 'Disabled'}
              showChevron={false}
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                  thumbColor={Colors.surface}
                />
              }
            />
            <SettingItem
              icon={<Moon size={20} color={Colors.primary} />}
              title="Dark Mode"
              subtitle="Coming soon"
              showChevron={false}
              rightElement={
                <Switch
                  value={darkMode}
                  onValueChange={handleToggleDarkMode}
                  trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                  thumbColor={Colors.surface}
                  disabled
                />
              }
            />
            <SettingItem
              icon={<Palette size={20} color={Colors.primary} />}
              title="App Theme"
              subtitle="Green (Default)"
              onPress={() => {}}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon={<HelpCircle size={20} color={Colors.info} />}
              title="Help Center"
              onPress={() => {}}
            />
            <SettingItem
              icon={<Shield size={20} color={Colors.success} />}
              title="Privacy Policy"
              onPress={() => {}}
            />
            <SettingItem
              icon={<Info size={20} color={Colors.textSecondary} />}
              title="About Taskify"
              subtitle="Version 1.0.0"
              onPress={async () => {
                // Long press handler for admin access (5 taps)
                const newCount = versionPressCount + 1;
                setVersionPressCount(newCount);
                
                if (newCount >= 5) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setVersionPressCount(0);
                  // Check if user is admin before redirecting
                  try {
                    const { AdminService } = await import('@/lib/adminService');
                    console.log('[Settings] Checking admin access for:', user?.email);
                    const isAdmin = await AdminService.isAdmin(user?.id || '', user?.email);
                    console.log('[Settings] Admin check result:', isAdmin);
                    if (isAdmin) {
                      console.log('[Settings] Navigating to /admin');
                      router.push('/admin');
                    } else {
                      Alert.alert('Access Denied', 'Admin access is restricted.');
                    }
                  } catch (error) {
                    console.error('[Settings] Error checking admin:', error);
                    Alert.alert('Error', 'Failed to check admin access.');
                  }
                } else {
                  setTimeout(() => setVersionPressCount(0), 2000);
                }
              }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionContent}>
            <SettingItem
              icon={<LogOut size={20} color={Colors.error} />}
              title={isSigningOut ? 'Signing Out...' : 'Sign Out'}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                signOut();
                // Navigate to login after a brief delay
                setTimeout(() => {
                  router.replace('/login');
                }, 500);
              }}
              showChevron={false}
            />
          </View>
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
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: {
    ...Typography.largeTitle,
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surfaceSecondary,
  },
  profileInfo: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  profileName: {
    ...Typography.title3,
    color: Colors.text,
  },
  profileEmail: {
    ...Typography.subhead,
    color: Colors.textSecondary,
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
  },
  upgradeIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  upgradeTitle: {
    ...Typography.headline,
    color: Colors.textInverse,
  },
  upgradeSubtitle: {
    ...Typography.caption1,
    color: 'rgba(255,255,255,0.8)',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.footnote,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  sectionContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    ...Typography.body,
    color: Colors.text,
  },
  settingSubtitle: {
    ...Typography.caption1,
    color: Colors.textTertiary,
    marginTop: 2,
  },
});
