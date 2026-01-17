import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider, useApp } from "@/providers/AppProvider";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasCompletedOnboarding, isLoading: appLoading } = useApp();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || appLoading) return;

    const inAuthGroup = segments[0] === 'login';
    const inOnboarding = segments[0] === 'onboarding';

    console.log('[AuthGate] Auth state:', { isAuthenticated, hasCompletedOnboarding, segments });

    if (!isAuthenticated && !inAuthGroup) {
      console.log('[AuthGate] Redirecting to login');
      router.replace('/login');
    } else if (isAuthenticated && !hasCompletedOnboarding && !inOnboarding) {
      console.log('[AuthGate] Redirecting to onboarding');
      router.replace('/onboarding');
    } else if (isAuthenticated && hasCompletedOnboarding && (inAuthGroup || inOnboarding)) {
      console.log('[AuthGate] Redirecting to home');
      router.replace('/');
    }
  }, [isAuthenticated, hasCompletedOnboarding, authLoading, appLoading, segments, router]);

  if (authLoading || appLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.primary,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen
        name="task/[id]"
        options={{
          title: "Task Details",
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="new-task"
        options={{
          title: "New Task",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="pricing"
        options={{
          title: "Upgrade",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="admin"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <AppProvider>
            <StatusBar style="dark" />
            <AuthGate>
              <RootLayoutNav />
            </AuthGate>
          </AppProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
