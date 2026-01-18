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

  // Function to create or update user profile in Supabase
  // Note: Database trigger handles initial creation, this handles updates
  const createOrUpdateUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const profileData = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.full_name || 
              supabaseUser.user_metadata?.name || 
              'User',
        avatar: supabaseUser.user_metadata?.avatar_url || null,
        is_pro: false,
        updated_at: new Date().toISOString(),
      };

      // Try to update first (in case profile already exists from trigger)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          email: profileData.email,
          name: profileData.name,
          avatar: profileData.avatar,
          updated_at: profileData.updated_at,
        })
        .eq('id', profileData.id);

      // If update failed because profile doesn't exist, try insert
      if (updateError && (updateError.code === 'PGRST116' || updateError.message?.includes('No rows') || updateError.message?.includes('not found'))) {
        console.log('[AuthProvider] Profile not found, creating new profile...');
        const { error: insertError, data: insertedData } = await supabase
          .from('profiles')
          .insert({
            ...profileData,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error('[AuthProvider] Profile insert failed:', insertError);
          console.error('[AuthProvider] Insert error code:', insertError.code);
          console.error('[AuthProvider] Insert error message:', insertError.message);
          console.error('[AuthProvider] Insert error details:', insertError.details);
          console.error('[AuthProvider] Profile data attempted:', JSON.stringify(profileData, null, 2));
          
          // If RLS is blocking, try to fetch profile to see if it exists
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', profileData.id)
            .single();
            
          if (existingProfile) {
            console.log('[AuthProvider] Profile actually exists, update should have worked');
          }
        } else {
          console.log('[AuthProvider] Profile created successfully:', insertedData?.id);
        }
      } else if (updateError) {
        // Other errors - log but don't throw
        console.warn('[AuthProvider] Profile update error:', updateError.message);
        console.warn('[AuthProvider] Update error code:', updateError.code);
      } else {
        console.log('[AuthProvider] Profile updated successfully');
      }
    } catch (error) {
      // Silently handle errors - database trigger will create profile automatically
      console.warn('[AuthProvider] Profile update error (non-critical):', error);
    }
  };

  useEffect(() => {
    console.log('[AuthProvider] Initializing auth state...');
    
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[AuthProvider] Initial session:', session ? 'exists' : 'null');
      if (session?.user) {
        // Create/update profile on initial load
        await createOrUpdateUserProfile(session.user);
        
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AuthProvider] Auth state changed:', _event);
      if (session?.user) {
        // Create/update profile on auth state change (sign in/sign up)
        if (_event === 'SIGNED_IN' || _event === 'SIGNED_UP' || _event === 'TOKEN_REFRESHED') {
          await createOrUpdateUserProfile(session.user);
        }
        
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
          
          // Update the user object with full name
          data.user.user_metadata = {
            ...data.user.user_metadata,
            full_name: fullName,
          };
        }
      }

      // Ensure profile is created after sign in
      if (data.user) {
        await createOrUpdateUserProfile(data.user);
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
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        return data;
      } catch (error: any) {
        console.error('[AuthProvider] Email sign-in error:', error);
        console.error('[AuthProvider] Error name:', error?.name);
        console.error('[AuthProvider] Error message:', error?.message);
        console.error('[AuthProvider] Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yfmmxydfpllcyulmbucu.supabase.co');
        throw error;
      }
    },
    onError: (error: Error) => {
      console.error('[AuthProvider] Email sign-in error:', error);
      let errorMessage = error.message || 'Unable to sign in. Please check your internet connection.';
      
      if (error.message?.includes('Network request failed')) {
        errorMessage = 'Network error: Please check your internet connection and try again.';
      } else if (error.message?.includes('Database error')) {
        errorMessage = 'Server error: Please try again later.';
      }
      
      Alert.alert('Sign In Failed', errorMessage);
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
      
      // Create profile after signup
      if (data.user) {
        await createOrUpdateUserProfile(data.user);
      }
      
      return data;
    },
    onError: (error: Error) => {
      console.error('[AuthProvider] Email sign-up error:', error);
      Alert.alert('Sign Up Failed', error.message);
    },
  });

  const { mutate: signOutMutate, isPending: isSigningOut } = useMutation({
    mutationFn: async () => {
      console.log('[AuthProvider] Signing out...');
      // Clear auth state immediately
      setAuthState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
      });
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AuthProvider] Sign-out error:', error);
        throw error;
      }
      
      console.log('[AuthProvider] Signed out successfully');
    },
    onSuccess: () => {
      // Ensure state is cleared
      setAuthState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
      });
    },
    onError: (error: Error) => {
      console.error('[AuthProvider] Sign-out error:', error);
      // Still clear state even if there's an error
      setAuthState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
      });
      Alert.alert('Sign Out Failed', error.message || 'Unable to sign out. Please try again.');
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
