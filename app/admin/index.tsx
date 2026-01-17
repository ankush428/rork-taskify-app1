import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { AdminService } from '@/lib/adminService';
import Colors from '@/constants/colors';

export default function AdminIndex() {
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkAdminAccess() {
      if (authLoading || !user) {
        return;
      }

      setIsChecking(true);
      const adminStatus = await AdminService.isAdmin(user.id, user.email);
      setIsAdmin(adminStatus);
      setIsChecking(false);
    }

    checkAdminAccess();
  }, [user, authLoading]);

  if (authLoading || isChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Checking admin access...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    // Redirect non-admins
    return <Redirect href="/" />;
  }

  // Redirect to dashboard if admin
  return <Redirect href="/admin/dashboard" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    color: Colors.textSecondary,
  },
});
