import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isPro: boolean;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const mapSupabaseUser = (user: SupabaseUser): AuthUser => ({
  id: user.id,
  email: user.email || '',
  name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
  avatar: user.user_metadata?.avatar_url,
  isPro: false,
  createdAt: user.created_at,
});

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    console.log('[AuthProvider] Initializing auth state...');
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AuthProvider] Initial session:', session ? 'exists' : 'null');
      if (session?.user) {
        setAuthState({
          user: mapSupabaseUser(session.user),
          session,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[AuthProvider] Auth state changed:', _event);
      if (session?.user) {
        setAuthState({
          user: mapSupabaseUser(session.user),
          session,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setAuthState({
          user: null,
          session: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const { mutate: signInWithAppleMutate, isPending: isAppleSigningIn } = useMutation({
    mutationFn: async () => {
      if (Platform.OS === 'web') {
        throw new Error('Apple Sign-In is not available on web');
      }

      const nonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nonce
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new Error('No identity token provided');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce,
      });

      if (error) throw error;

      if (credential.fullName && data.user) {
        const fullName = [
          credential.fullName.givenName,
          credential.fullName.familyName,
        ].filter(Boolean).join(' ');

        if (fullName) {
          await supabase.auth.updateUser({
            data: { full_name: fullName },
          });
        }
      }

      return data;
    },
    onError: (error) => {
      console.error('[AuthProvider] Apple sign-in error:', error);
      if ((error as { code?: string }).code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Sign In Failed', 'Could not sign in with Apple. Please try again.');
      }
    },
  });

  const { mutate: signInWithEmailMutate, isPending: isEmailSigningIn } = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    },
    onError: (error: Error) => {
      console.error('[AuthProvider] Email sign-in error:', error);
      Alert.alert('Sign In Failed', error.message);
    },
  });

  const { mutate: signUpWithEmailMutate, isPending: isSigningUp } = useMutation({
    mutationFn: async ({ email, password, name }: { email: string; password: string; name: string }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });
      if (error) throw error;
      return data;
    },
    onError: (error: Error) => {
      console.error('[AuthProvider] Email sign-up error:', error);
      Alert.alert('Sign Up Failed', error.message);
    },
  });

  const { mutate: signOutMutate, isPending: isSigningOut } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onError: (error: Error) => {
      console.error('[AuthProvider] Sign-out error:', error);
      Alert.alert('Sign Out Failed', error.message);
    },
  });

  const signInWithApple = useCallback(() => {
    signInWithAppleMutate();
  }, [signInWithAppleMutate]);

  const signInWithEmail = useCallback((email: string, password: string) => {
    signInWithEmailMutate({ email, password });
  }, [signInWithEmailMutate]);

  const signUpWithEmail = useCallback((email: string, password: string, name: string) => {
    signUpWithEmailMutate({ email, password, name });
  }, [signUpWithEmailMutate]);

  const signOut = useCallback(() => {
    signOutMutate();
  }, [signOutMutate]);

  return {
    ...authState,
    signInWithApple,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    isSigningIn: isAppleSigningIn || isEmailSigningIn,
    isSigningUp,
    isSigningOut,
  };
});
