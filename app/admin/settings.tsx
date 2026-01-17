import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Power, Brain, Users, Bell, AlertTriangle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Typography, Spacing, BorderRadius } from '@/constants/typography';
import { AdminService } from '@/lib/adminService';
import { useAuth } from '@/providers/AuthProvider';

export default function AdminSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const data = await AdminService.getSystemSettings();
      setSettings(data || {});
    } catch (error) {
      console.error('[AdminSettings] Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSetting = async (key: string, value: any) => {
    if (!user?.id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = await AdminService.updateSystemSetting(key, value, user.id);
    
    if (success) {
      setSettings({ ...settings, [key]: value });
      Alert.alert('Success', 'Setting updated');
    } else {
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleToggle = (key: string, enabledKey: string = 'enabled') => {
    const currentValue = settings[key] || {};
    const newValue = { ...currentValue, [enabledKey]: !currentValue[enabledKey] };
    updateSetting(key, newValue);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Settings</Text>
        <Text style={styles.subtitle}>System controls & kill switches</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Controls</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <Power size={20} color={Colors.error} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Maintenance Mode</Text>
                <Text style={styles.settingDescription}>
                  App will be read-only for all users
                </Text>
              </View>
              <Switch
                value={settings.maintenance_mode?.enabled || false}
                onValueChange={() => handleToggle('maintenance_mode')}
                trackColor={{ false: Colors.border, true: Colors.error + '80' }}
                thumbColor={Colors.surface}
              />
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <Brain size={20} color={Colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>AI Service</Text>
                <Text style={styles.settingDescription}>
                  Enable/disable AI chat features
                </Text>
              </View>
              <Switch
                value={settings.ai_enabled?.enabled !== false}
                onValueChange={() => handleToggle('ai_enabled')}
                trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                thumbColor={Colors.surface}
              />
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <Users size={20} color={Colors.info} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Collaboration</Text>
                <Text style={styles.settingDescription}>
                  Enable/disable task sharing
                </Text>
              </View>
              <Switch
                value={settings.collaboration_enabled?.enabled !== false}
                onValueChange={() => handleToggle('collaboration_enabled')}
                trackColor={{ false: Colors.border, true: Colors.info + '80' }}
                thumbColor={Colors.surface}
              />
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <Bell size={20} color={Colors.warning} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Notifications</Text>
                <Text style={styles.settingDescription}>
                  Enable/disable push notifications
                </Text>
              </View>
              <Switch
                value={settings.notifications_enabled?.enabled !== false}
                onValueChange={() => handleToggle('notifications_enabled')}
                trackColor={{ false: Colors.border, true: Colors.warning + '80' }}
                thumbColor={Colors.surface}
              />
            </View>
          </View>
        </View>

        <View style={styles.warningSection}>
          <AlertTriangle size={24} color={Colors.warning} />
          <Text style={styles.warningText}>
            Changes take effect immediately. Use these controls carefully.
          </Text>
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
    backgroundColor: Colors.surface,
  },
  title: {
    ...Typography.largeTitle,
    color: Colors.text,
  },
  subtitle: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.headline,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  settingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  settingTitle: {
    ...Typography.headline,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  settingDescription: {
    ...Typography.caption1,
    color: Colors.textSecondary,
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '20',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  warningText: {
    ...Typography.caption1,
    color: Colors.warning,
    flex: 1,
  },
});
