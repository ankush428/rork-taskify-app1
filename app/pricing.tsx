import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';

import { Check, Crown, X, Sparkles, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Typography, Spacing, BorderRadius } from '@/constants/typography';
import { pricingPlans } from '@/mocks/data';
import Button from '@/components/Button';

export default function PricingScreen() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [billingPeriod, setBillingPeriod] = useState<'month' | 'year'>('month');

  const handleClose = () => {
    router.back();
  };

  const handleSelectPlan = (planId: string) => {
    Haptics.selectionAsync();
    setSelectedPlan(planId);
  };

  const handleSubscribe = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const getPrice = (plan: typeof pricingPlans[0]) => {
    if (plan.price === 0) return 'Free';
    const yearlyPrice = plan.price * 12 * 0.8;
    const price = billingPeriod === 'year' ? yearlyPrice / 12 : plan.price;
    return `$${price.toFixed(2)}`;
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free':
        return <Check size={24} color={Colors.primary} />;
      case 'pro':
        return <Crown size={24} color={Colors.warning} />;
      case 'max':
        return <Zap size={24} color={Colors.info} />;
      default:
        return <Check size={24} color={Colors.primary} />;
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerLeft: () => (
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Sparkles size={40} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Upgrade Your Experience</Text>
          <Text style={styles.subtitle}>
            Unlock powerful features and boost your productivity
          </Text>
        </View>

        <View style={styles.billingToggle}>
          <TouchableOpacity
            style={[
              styles.billingOption,
              billingPeriod === 'month' && styles.billingOptionActive,
            ]}
            onPress={() => setBillingPeriod('month')}
          >
            <Text
              style={[
                styles.billingText,
                billingPeriod === 'month' && styles.billingTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.billingOption,
              billingPeriod === 'year' && styles.billingOptionActive,
            ]}
            onPress={() => setBillingPeriod('year')}
          >
            <Text
              style={[
                styles.billingText,
                billingPeriod === 'year' && styles.billingTextActive,
              ]}
            >
              Yearly
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveText}>-20%</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.plansContainer}>
          {pricingPlans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.planCardSelected,
                plan.isPopular && styles.planCardPopular,
              ]}
              onPress={() => handleSelectPlan(plan.id)}
              activeOpacity={0.8}
            >
              {plan.isPopular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>Most Popular</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <View
                  style={[
                    styles.planIcon,
                    selectedPlan === plan.id && styles.planIconSelected,
                  ]}
                >
                  {getPlanIcon(plan.id)}
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.priceContainer}>
                    <Text style={styles.planPrice}>{getPrice(plan)}</Text>
                    {plan.price > 0 && (
                      <Text style={styles.pricePeriod}>
                        /{billingPeriod === 'year' ? 'mo' : 'month'}
                      </Text>
                    )}
                  </View>
                </View>
                <View
                  style={[
                    styles.radioButton,
                    selectedPlan === plan.id && styles.radioButtonSelected,
                  ]}
                >
                  {selectedPlan === plan.id && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </View>

              <View style={styles.featuresContainer}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Check size={16} color={Colors.success} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={selectedPlan === 'free' ? 'Continue with Free' : 'Subscribe Now'}
          onPress={handleSubscribe}
          size="large"
          style={styles.subscribeButton}
        />
        <Text style={styles.termsText}>
          Cancel anytime. Terms and conditions apply.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: 160,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.title1,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  billingOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  billingOptionActive: {
    backgroundColor: Colors.surface,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  billingText: {
    ...Typography.subhead,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  billingTextActive: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  saveBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  saveText: {
    ...Typography.caption2,
    color: Colors.textInverse,
    fontWeight: '600' as const,
  },
  plansContainer: {
    gap: Spacing.lg,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  planCardSelected: {
    borderColor: Colors.primary,
  },
  planCardPopular: {
    borderColor: Colors.warning,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: Spacing.lg,
    backgroundColor: Colors.warning,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  popularText: {
    ...Typography.caption2,
    color: Colors.textInverse,
    fontWeight: '600' as const,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  planIconSelected: {
    backgroundColor: Colors.primaryMuted,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    ...Typography.headline,
    color: Colors.text,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    ...Typography.title2,
    color: Colors.text,
  },
  pricePeriod: {
    ...Typography.subhead,
    color: Colors.textSecondary,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  featuresContainer: {
    gap: Spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureText: {
    ...Typography.subhead,
    color: Colors.textSecondary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  subscribeButton: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  termsText: {
    ...Typography.caption1,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
});
