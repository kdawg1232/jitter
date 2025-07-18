import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Theme } from '../../theme/colors';
import { OnboardingStepProps, ONBOARDING_CONTENT, validateStep } from '../../types/onboarding';

interface OnboardingSleepScreenProps extends OnboardingStepProps {}

export const OnboardingSleepScreen: React.FC<OnboardingSleepScreenProps> = ({
  data,
  onUpdateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  const content = ONBOARDING_CONTENT[4];
  const [sleepInput, setSleepInput] = useState(data.lastNightSleep?.toString() || '');

  const handleSleepChange = (text: string) => {
    Haptics.selectionAsync();
    setSleepInput(text);
    const numericValue = parseFloat(text);
    if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 16) {
      onUpdateData({ lastNightSleep: numericValue });
    } else {
      onUpdateData({ lastNightSleep: null });
    }
  };

  const handleTrackingToggle = (trackSleepDaily: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdateData({ trackSleepDaily });
  };

  const handleNext = () => {
    if (validateStep[4](data)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onNext();
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  };

  const isValid = validateStep[4](data);

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
          {/* Title */}
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.subtitle}>{content.subtitle}</Text>

          {/* Sleep Hours Input */}
          <View style={styles.inputSection}>
            <Text style={styles.questionText}>
              How many hours did you sleep last night?
            </Text>
            <View style={styles.sleepInputContainer}>
              <TextInput
                style={styles.sleepInput}
                value={sleepInput}
                onChangeText={handleSleepChange}
                placeholder="7.5"
                keyboardType="numeric"
                placeholderTextColor={Theme.colors.textTertiary}
              />
              <Text style={styles.hoursLabel}>hours</Text>
            </View>
          </View>

          {/* Daily Tracking Toggle */}
          <View style={styles.toggleSection}>
            <View style={styles.toggleContent}>
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleTitle}>Track sleep daily</Text>
                <Text style={styles.toggleDescription}>
                  Enable daily sleep tracking for better predictions
                </Text>
              </View>
              <Switch
                value={data.trackSleepDaily}
                onValueChange={handleTrackingToggle}
                trackColor={{ 
                  false: Theme.colors.divider, 
                  true: Theme.colors.accentOrange 
                }}
                thumbColor={Theme.colors.white}
                ios_backgroundColor={Theme.colors.divider}
              />
            </View>
          </View>

          {/* Info Container */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Why sleep matters</Text>
            <Text style={styles.infoText}>
              Poor sleep amplifies caffeine crash severity. Tracking your sleep helps us 
              predict when you're most vulnerable to energy crashes.
            </Text>
          </View>

          {/* Note */}
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>{content.description}</Text>
          </View>
        </ScrollView>

        {/* Continue Button */}
        <TouchableOpacity 
          style={[
            styles.continueButton,
            !isValid && styles.continueButtonDisabled
          ]}
          onPress={handleNext}
          disabled={!isValid}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.continueButtonText,
            !isValid && styles.continueButtonTextDisabled
          ]}>
            continue
          </Text>
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
    backgroundColor: Theme.colors.primaryBlue,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },

  title: {
    ...Theme.fonts.bigTitle,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
  },
  subtitle: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  inputSection: {
    marginBottom: Theme.spacing.xl,
  },
  questionText: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
  sleepInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.md,
  },
  sleepInput: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: Theme.colors.cardStroke,
    textAlign: 'center',
    minWidth: 80,
  },
  hoursLabel: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textSecondary,
  },
  toggleSection: {
    marginBottom: Theme.spacing.xl,
  },
  toggleContent: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Theme.colors.cardStroke,
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  toggleTitle: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  toggleDescription: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    lineHeight: 18,
  },
  infoContainer: {
    backgroundColor: Theme.colors.cardBg,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  infoTitle: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  infoText: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    lineHeight: 20,
  },
  noteContainer: {
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  noteText: {
    ...Theme.fonts.body,
    color: Theme.colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  continueButton: {
    backgroundColor: Theme.colors.primaryBlue,
    borderRadius: Theme.borderRadius.medium,
    paddingVertical: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: Theme.colors.textTertiary,
  },
  continueButtonText: {
    ...Theme.fonts.button,
    color: Theme.colors.white,
  },
  continueButtonTextDisabled: {
    color: Theme.colors.divider,
  },
}); 