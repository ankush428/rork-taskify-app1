import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

// Supabase configuration
// In production, use environment variables from .env file:
// EXPO_PUBLIC_SUPABASE_URL=https://yfmmxydfpllcyulmbucu.supabase.co
// EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yfmmxydfpllcyulmbucu.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbW14eWRmcGxsY3l1bG1idWN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NjI3OTcsImV4cCI6MjA4NDIzODc5N30.AemsahgV6xaFl4Z1EMcaVd84MEHwZcxjJt7Nlzpqv7M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'x-client-info': 'taskify-app',
    },
  },
});

// Log Supabase configuration (for debugging)
console.log('[Supabase] Initialized with URL:', supabaseUrl);
console.log('[Supabase] Anon key configured:', supabaseAnonKey ? 'Yes' : 'No');
