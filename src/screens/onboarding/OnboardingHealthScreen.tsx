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
import { OnboardingStepProps, ONBOARDING_CONTENT, validateStep } from '../../types/onboarding';

interface OnboardingHealthScreenProps extends OnboardingStepProps {}

export const OnboardingHealthScreen: React.FC<OnboardingHealthScreenProps> = ({
  data,
  onUpdateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  const content = ONBOARDING_CONTENT[3];

  const handleSmokerSelection = (smoker: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdateData({ smoker });
  };

  const handlePregnantSelection = (pregnant: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdateData({ 
      pregnant,
      // If pregnant, clear oral contraceptives
      ...(pregnant ? { oralContraceptives: false } : {})
    });
  };

  const handleOralContraceptivesSelection = (oralContraceptives: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdateData({ oralContraceptives });
  };

  const handleFluvoxamineSelection = (takesFluvoxamine: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdateData({ takesFluvoxamine });
  };

  const handleCiprofloxacinSelection = (takesCiprofloxacin: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdateData({ takesCiprofloxacin });
  };

  const handleOtherCYP1A2InhibitorsSelection = (takesOtherCYP1A2Inhibitors: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdateData({ takesOtherCYP1A2Inhibitors });
  };

  const handleMetabolismRateSelection = (metabolismRate: 'very_slow' | 'slow' | 'medium' | 'fast' | 'very_fast') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdateData({ metabolismRate });
  };

  const handleNext = () => {
    if (validateStep[3](data)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onNext();
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  };

  const isValid = validateStep[3](data);
  const isFemale = data.sex === 'female';

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
          <Text style={styles.description}>{content.description}</Text>

          {/* Smoking Question */}
          <View style={styles.questionSection}>
            <Text style={styles.questionText}>Do you smoke?</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.yesNoButton,
                  data.smoker === false && styles.yesNoButtonSelected
                ]}
                onPress={() => handleSmokerSelection(false)}
              >
                <Text style={[
                  styles.yesNoButtonText,
                  data.smoker === false && styles.yesNoButtonTextSelected
                ]}>
                  No
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.yesNoButton,
                  data.smoker === true && styles.yesNoButtonSelected
                ]}
                onPress={() => handleSmokerSelection(true)}
              >
                <Text style={[
                  styles.yesNoButtonText,
                  data.smoker === true && styles.yesNoButtonTextSelected
                ]}>
                  Yes
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Pregnancy Question (only for females) */}
          {isFemale && (
            <View style={styles.questionSection}>
              <Text style={styles.questionText}>Are you currently pregnant?</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.yesNoButton,
                    data.pregnant === false && styles.yesNoButtonSelected
                  ]}
                  onPress={() => handlePregnantSelection(false)}
                >
                  <Text style={[
                    styles.yesNoButtonText,
                    data.pregnant === false && styles.yesNoButtonTextSelected
                  ]}>
                    No
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.yesNoButton,
                    data.pregnant === true && styles.yesNoButtonSelected
                  ]}
                  onPress={() => handlePregnantSelection(true)}
                >
                  <Text style={[
                    styles.yesNoButtonText,
                    data.pregnant === true && styles.yesNoButtonTextSelected
                  ]}>
                    Yes
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Oral Contraceptives Question (only for non-pregnant females) */}
          {isFemale && data.pregnant === false && (
            <View style={styles.questionSection}>
              <Text style={styles.questionText}>Do you take oral contraceptives?</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.yesNoButton,
                    data.oralContraceptives === false && styles.yesNoButtonSelected
                  ]}
                  onPress={() => handleOralContraceptivesSelection(false)}
                >
                  <Text style={[
                    styles.yesNoButtonText,
                    data.oralContraceptives === false && styles.yesNoButtonTextSelected
                  ]}>
                    No
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.yesNoButton,
                    data.oralContraceptives === true && styles.yesNoButtonSelected
                  ]}
                  onPress={() => handleOralContraceptivesSelection(true)}
                >
                  <Text style={[
                    styles.yesNoButtonText,
                    data.oralContraceptives === true && styles.yesNoButtonTextSelected
                  ]}>
                    Yes
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Medication Screening */}
          <View style={styles.medicationSection}>
            <Text style={styles.sectionTitle}>Basic Medication Screening</Text>
            <Text style={styles.sectionSubtitle}>Do you take any of these medications?</Text>
            
            {/* Fluvoxamine Question */}
            <View style={styles.medicationItem}>
              <Text style={styles.medicationName}>Fluvoxamine (antidepressant)</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.yesNoButton,
                    data.takesFluvoxamine === false && styles.yesNoButtonSelected
                  ]}
                  onPress={() => handleFluvoxamineSelection(false)}
                >
                  <Text style={[
                    styles.yesNoButtonText,
                    data.takesFluvoxamine === false && styles.yesNoButtonTextSelected
                  ]}>
                    No
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.yesNoButton,
                    data.takesFluvoxamine === true && styles.yesNoButtonSelected
                  ]}
                  onPress={() => handleFluvoxamineSelection(true)}
                >
                  <Text style={[
                    styles.yesNoButtonText,
                    data.takesFluvoxamine === true && styles.yesNoButtonTextSelected
                  ]}>
                    Yes
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Ciprofloxacin Question */}
            <View style={styles.medicationItem}>
              <Text style={styles.medicationName}>Ciprofloxacin (antibiotic)</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.yesNoButton,
                    data.takesCiprofloxacin === false && styles.yesNoButtonSelected
                  ]}
                  onPress={() => handleCiprofloxacinSelection(false)}
                >
                  <Text style={[
                    styles.yesNoButtonText,
                    data.takesCiprofloxacin === false && styles.yesNoButtonTextSelected
                  ]}>
                    No
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.yesNoButton,
                    data.takesCiprofloxacin === true && styles.yesNoButtonSelected
                  ]}
                  onPress={() => handleCiprofloxacinSelection(true)}
                >
                  <Text style={[
                    styles.yesNoButtonText,
                    data.takesCiprofloxacin === true && styles.yesNoButtonTextSelected
                  ]}>
                    Yes
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Other CYP1A2 Inhibitors Question */}
            <View style={styles.medicationItem}>
              <Text style={styles.medicationName}>Birth control pills or Cimetidine</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.yesNoButton,
                    data.takesOtherCYP1A2Inhibitors === false && styles.yesNoButtonSelected
                  ]}
                  onPress={() => handleOtherCYP1A2InhibitorsSelection(false)}
                >
                  <Text style={[
                    styles.yesNoButtonText,
                    data.takesOtherCYP1A2Inhibitors === false && styles.yesNoButtonTextSelected
                  ]}>
                    No
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.yesNoButton,
                    data.takesOtherCYP1A2Inhibitors === true && styles.yesNoButtonSelected
                  ]}
                  onPress={() => handleOtherCYP1A2InhibitorsSelection(true)}
                >
                  <Text style={[
                    styles.yesNoButtonText,
                    data.takesOtherCYP1A2Inhibitors === true && styles.yesNoButtonTextSelected
                  ]}>
                    Yes
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Metabolism Rate Question */}
          <View style={styles.questionSection}>
            <Text style={styles.questionText}>How fast is your metabolism?</Text>
            <View style={styles.metabolismOptions}>
              {[
                { key: 'very_slow', label: 'Very Slow' },
                { key: 'slow', label: 'Slow' },
                { key: 'medium', label: 'Medium' },
                { key: 'fast', label: 'Fast' },
                { key: 'very_fast', label: 'Very Fast' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.metabolismButton,
                    data.metabolismRate === option.key && styles.metabolismButtonSelected
                  ]}
                  onPress={() => handleMetabolismRateSelection(option.key as any)}
                >
                  <Text style={[
                    styles.metabolismButtonText,
                    data.metabolismRate === option.key && styles.metabolismButtonTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Info Note */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              These factors significantly affect how quickly your body processes caffeine, 
              helping us provide more accurate predictions.
            </Text>
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
  description: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
    lineHeight: 22,
  },
  questionSection: {
    marginBottom: Theme.spacing.xl,
  },
  questionText: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  yesNoButton: {
    flex: 1,
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.medium,
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.cardStroke,
  },
  yesNoButtonSelected: {
    backgroundColor: Theme.colors.primaryBlue,
    borderColor: Theme.colors.primaryBlue,
  },
  yesNoButtonText: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
  },
  yesNoButtonTextSelected: {
    color: Theme.colors.white,
  },
  infoContainer: {
    backgroundColor: Theme.colors.cardBg,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  infoText: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
  medicationSection: {
    marginBottom: Theme.spacing.xl,
  },
  sectionTitle: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  sectionSubtitle: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
  },
  medicationItem: {
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  medicationName: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.md,
  },
  metabolismOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: Theme.spacing.md,
  },
  metabolismButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.medium,
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.cardStroke,
    marginBottom: Theme.spacing.sm,
  },
  metabolismButtonSelected: {
    backgroundColor: Theme.colors.primaryBlue,
    borderColor: Theme.colors.primaryBlue,
  },
  metabolismButtonText: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    fontSize: 14,
  },
  metabolismButtonTextSelected: {
    color: Theme.colors.white,
  },
}); 