import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Theme } from '../../theme/colors';
import { OnboardingStepProps, ONBOARDING_CONTENT } from '../../types/onboarding';

interface OnboardingCompleteScreenProps extends OnboardingStepProps {
  onComplete: () => void;
}

export const OnboardingCompleteScreen: React.FC<OnboardingCompleteScreenProps> = ({
  data,
  onBack,
  currentStep,
  totalSteps,
  onComplete,
}) => {
  const content = ONBOARDING_CONTENT[5];

  const handleComplete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onComplete();
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Progress Bar and Back Button */}
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(currentStep / totalSteps) * 100}%` }
              ]} 
            />
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Success Content */}
          <View style={styles.successContainer}>
            {/* Check Mark */}
            <View style={styles.checkContainer}>
              <Text style={styles.checkMark}>✓</Text>
            </View>

            {/* Success Title */}
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.subtitle}>{content.subtitle}</Text>

            {/* Description */}
            <Text style={styles.description}>{content.description}</Text>
          </View>
        </ScrollView>

        {/* Start Button */}
        <TouchableOpacity 
          style={styles.startButton}
          onPress={handleComplete}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>Start Tracking Caffeine</Text>
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
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.lg,
  },
  backButton: {
    marginRight: Theme.spacing.md,
    padding: Theme.spacing.xs,
  },
  backButtonText: {
    fontSize: 24,
    color: Theme.colors.primaryBlue,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: Theme.colors.divider,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Theme.colors.primaryGreen,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  successContainer: {
    alignItems: 'center',
    paddingTop: Theme.spacing.lg,
  },
  checkContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Theme.colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.lg,
  },
  checkMark: {
    fontSize: 30,
    color: Theme.colors.white,
    fontWeight: 'bold',
  },

  title: {
    ...Theme.fonts.bigTitle,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
    marginTop: Theme.spacing.xl,
  },
  subtitle: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.primaryGreen,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },

  description: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Theme.spacing.lg,
  },
  startButton: {
    backgroundColor: Theme.colors.primaryGreen,
    borderRadius: Theme.borderRadius.medium,
    paddingVertical: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    alignItems: 'center',
  },
  startButtonText: {
    ...Theme.fonts.button,
    color: Theme.colors.white,
  },
}); 