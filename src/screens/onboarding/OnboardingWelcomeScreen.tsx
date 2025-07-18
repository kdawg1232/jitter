import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Theme } from '../../theme/colors';
import { OnboardingStepProps, ONBOARDING_CONTENT } from '../../types/onboarding';

interface OnboardingWelcomeScreenProps extends OnboardingStepProps {}

export const OnboardingWelcomeScreen: React.FC<OnboardingWelcomeScreenProps> = ({
  onNext,
  currentStep,
  totalSteps,
}) => {
  const content = ONBOARDING_CONTENT[1];

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(currentStep / totalSteps) * 100}%` }
              ]} 
            />
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Text Content */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.subtitle}>{content.subtitle}</Text>
            <Text style={styles.description}>{content.description}</Text>
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity 
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.canvas,
  },
  content: {
    flex: 1,
    paddingHorizontal: Theme.spacing.lg,
  },
  progressContainer: {
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.lg,
  },
  progressBar: {
    height: 4,
    backgroundColor: Theme.colors.divider,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Theme.colors.primaryBlue,
    borderRadius: 2,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  textContainer: {
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
  },
  title: {
    ...Theme.fonts.bigTitle,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
  subtitle: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
  },
  description: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  continueButton: {
    backgroundColor: Theme.colors.primaryBlue,
    borderRadius: Theme.borderRadius.medium,
    paddingVertical: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    alignItems: 'center',
  },
  continueButtonText: {
    ...Theme.fonts.button,
    color: Theme.colors.white,
  },
}); 