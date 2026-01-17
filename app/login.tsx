import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import { CheckSquare, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Typography, Spacing, BorderRadius } from '@/constants/typography';
import { useAuth } from '@/providers/AuthProvider';

type AuthMode = 'login' | 'signup';

export default function LoginScreen() {
  const { signInWithApple, signInWithEmail, signUpWithEmail, isSigningIn, isSigningUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleAppleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    signInWithApple();
  };

  const handleEmailAuth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (mode === 'login') {
      signInWithEmail(email, password);
    } else {
      signUpWithEmail(email, password, name);
    }
  };

  const toggleMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(mode === 'login' ? 'signup' : 'login');
    setEmail('');
    setPassword('');
    setName('');
  };

  const toggleEmailForm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowEmailForm(!showEmailForm);
  };

  const isLoading = isSigningIn || isSigningUp;
  const isFormValid = mode === 'login' 
    ? email.length > 0 && password.length >= 6
    : email.length > 0 && password.length >= 6 && name.length > 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primaryMuted, Colors.background]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View 
              style={[
                styles.header,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.logoContainer}>
                <View style={styles.logoBackground}>
                  <CheckSquare size={48} color={Colors.primary} strokeWidth={1.5} />
                </View>
              </View>
              <Text style={styles.title}>Taskify</Text>
              <Text style={styles.subtitle}>
                {mode === 'login' 
                  ? 'Welcome back! Sign in to continue' 
                  : 'Create an account to get started'}
              </Text>
            </Animated.View>

            <Animated.View 
              style={[
                styles.authContainer,
                { opacity: fadeAnim },
              ]}
            >
              {Platform.OS !== 'web' && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={BorderRadius.lg}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                />
              )}

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {!showEmailForm ? (
                <TouchableOpacity
                  style={styles.emailToggleButton}
                  onPress={toggleEmailForm}
                  activeOpacity={0.8}
                >
                  <Mail size={20} color={Colors.text} />
                  <Text style={styles.emailToggleText}>Continue with Email</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.emailForm}>
                  {mode === 'signup' && (
                    <View style={styles.inputContainer}>
                      <User size={20} color={Colors.textTertiary} />
                      <TextInput
                        style={styles.input}
                        placeholder="Full Name"
                        placeholderTextColor={Colors.textTertiary}
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                        autoComplete="name"
                      />
                    </View>
                  )}

                  <View style={styles.inputContainer}>
                    <Mail size={20} color={Colors.textTertiary} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      placeholderTextColor={Colors.textTertiary}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Lock size={20} color={Colors.textTertiary} />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor={Colors.textTertiary}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete={Platform.OS === 'ios' ? (mode === 'login' ? 'password' : 'new-password') : 'off'}
                      textContentType={Platform.OS === 'ios' ? (mode === 'login' ? 'password' : 'newPassword') : undefined}
                      keyboardType="default"
                      returnKeyType="done"
                      enablesReturnKeyAutomatically={true}
                      editable={true}
                      selectTextOnFocus={false}
                      clearButtonMode="never"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color={Colors.textTertiary} />
                      ) : (
                        <Eye size={20} color={Colors.textTertiary} />
                      )}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      (!isFormValid || isLoading) && styles.submitButtonDisabled,
                    ]}
                    onPress={handleEmailAuth}
                    disabled={!isFormValid || isLoading}
                    activeOpacity={0.8}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={Colors.textInverse} />
                    ) : (
                      <>
                        <Text style={styles.submitButtonText}>
                          {mode === 'login' ? 'Sign In' : 'Create Account'}
                        </Text>
                        <ArrowRight size={20} color={Colors.textInverse} />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              </Text>
              <TouchableOpacity onPress={toggleMode}>
                <Text style={styles.footerLink}>
                  {mode === 'login' ? 'Sign Up' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.terms}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: 0,
    height: '50%',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logoContainer: {
    marginBottom: Spacing.lg,
  },
  logoBackground: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: Spacing.sm,
    letterSpacing: -1,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  authContainer: {
    gap: Spacing.lg,
  },
  appleButton: {
    width: '100%',
    height: 54,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    ...Typography.caption1,
    color: Colors.textTertiary,
  },
  emailToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 54,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emailToggleText: {
    ...Typography.body,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emailForm: {
    gap: Spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    height: '100%',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 54,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.border,
  },
  submitButtonText: {
    ...Typography.body,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xxl,
  },
  footerText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  footerLink: {
    ...Typography.body,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  terms: {
    ...Typography.caption2,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
});
