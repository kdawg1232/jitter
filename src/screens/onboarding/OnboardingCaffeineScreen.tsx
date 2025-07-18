import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Theme } from '../../theme/colors';
import { OnboardingStepProps, ONBOARDING_CONTENT, validateStep } from '../../types/onboarding';

interface OnboardingCaffeineScreenProps extends OnboardingStepProps {}

const CAFFEINE_SOURCES = [
  { key: 'coffee', label: 'Coffee', description: '95-200mg per cup' },
  { key: 'tea', label: 'Tea', description: '25-50mg per cup' },
  { key: 'energy_drinks', label: 'Energy Drinks', description: '50-300mg per can' },
  { key: 'soda', label: 'Soda/Cola', description: '25-50mg per can' },
  { key: 'mixed', label: 'Mixed Sources', description: 'Combination of above' },
] as const;

const TYPICAL_AMOUNTS = [
  { value: 0, label: 'None', description: 'I don\'t consume caffeine regularly' },
  { value: 100, label: 'Light', description: '50-150mg (1-2 cups coffee)' },
  { value: 250, label: 'Moderate', description: '150-300mg (2-3 cups coffee)' },
  { value: 400, label: 'Heavy', description: '300-500mg (4+ cups coffee)' },
  { value: 600, label: 'Very Heavy', description: '500mg+ (5+ cups coffee)' },
];

export const OnboardingCaffeineScreen: React.FC<OnboardingCaffeineScreenProps> = ({
  data,
  onUpdateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  const content = ONBOARDING_CONTENT[4];
  const [customAmount, setCustomAmount] = useState(
    data.typicalDailyCaffeine && !TYPICAL_AMOUNTS.find(a => a.value === data.typicalDailyCaffeine) 
      ? data.typicalDailyCaffeine.toString() 
      : ''
  );
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleAmountSelection = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdateData({ typicalDailyCaffeine: amount });
    setShowCustomInput(false);
    setCustomAmount('');
  };

  const handleCustomAmount = () => {
    setShowCustomInput(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCustomAmountChange = (text: string) => {
    Haptics.selectionAsync();
    setCustomAmount(text);
    const numericValue = parseFloat(text);
    if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 1000) {
      onUpdateData({ typicalDailyCaffeine: numericValue });
    } else if (text === '') {
      onUpdateData({ typicalDailyCaffeine: null });
    }
  };

  const handleSourceSelection = (source: 'coffee' | 'tea' | 'energy_drinks' | 'soda' | 'mixed') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdateData({ caffeineSource: source });
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
  const isCustomSelected = showCustomInput || (data.typicalDailyCaffeine && !TYPICAL_AMOUNTS.find(a => a.value === data.typicalDailyCaffeine));

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

          {/* Caffeine Amount Question */}
          <View style={styles.questionSection}>
            <Text style={styles.questionText}>
              How much caffeine do you typically consume per day?
            </Text>
            <View style={styles.amountGrid}>
              {TYPICAL_AMOUNTS.map((amount) => (
                <TouchableOpacity
                  key={amount.value}
                  style={[
                    styles.amountButton,
                    (data.typicalDailyCaffeine === amount.value && !isCustomSelected) ? styles.amountButtonSelected : null
                  ]}
                  onPress={() => handleAmountSelection(amount.value)}
                >
                  <Text style={[
                    styles.amountLabel,
                    (data.typicalDailyCaffeine === amount.value && !isCustomSelected) ? styles.amountLabelSelected : null
                  ]}>
                    {amount.label}
                  </Text>
                  <Text style={[
                    styles.amountDescription,
                    (data.typicalDailyCaffeine === amount.value && !isCustomSelected) ? styles.amountDescriptionSelected : null
                  ]}>
                    {amount.description}
                  </Text>
                </TouchableOpacity>
              ))}
              
              {/* Custom Amount Button */}
              <TouchableOpacity
                style={[
                  styles.amountButton,
                  isCustomSelected ? styles.amountButtonSelected : null
                ]}
                onPress={handleCustomAmount}
              >
                <Text style={[
                  styles.amountLabel,
                  isCustomSelected ? styles.amountLabelSelected : null
                ]}>
                  Custom
                </Text>
                <Text style={[
                  styles.amountDescription,
                  isCustomSelected ? styles.amountDescriptionSelected : null
                ]}>
                  Enter exact amount
                </Text>
              </TouchableOpacity>
            </View>

            {/* Custom Input */}
            {showCustomInput && (
              <View style={styles.customInputContainer}>
                <View style={styles.customInputRow}>
                  <TextInput
                    style={styles.customInput}
                    value={customAmount}
                    onChangeText={handleCustomAmountChange}
                    placeholder="250"
                    keyboardType="numeric"
                    placeholderTextColor={Theme.colors.textTertiary}
                  />
                  <Text style={styles.customInputLabel}>mg/day</Text>
                </View>
              </View>
            )}
          </View>

          {/* Primary Source Question */}
          {data.typicalDailyCaffeine !== null && data.typicalDailyCaffeine > 0 && (
            <View style={styles.questionSection}>
              <Text style={styles.questionText}>
                What's your primary source of caffeine?
              </Text>
              <View style={styles.sourceGrid}>
                {CAFFEINE_SOURCES.map((source) => (
                  <TouchableOpacity
                    key={source.key}
                    style={[
                      styles.sourceButton,
                      data.caffeineSource === source.key ? styles.sourceButtonSelected : null
                    ]}
                    onPress={() => handleSourceSelection(source.key)}
                  >
                    <Text style={[
                      styles.sourceLabel,
                      data.caffeineSource === source.key ? styles.sourceLabelSelected : null
                    ]}>
                      {source.label}
                    </Text>
                    <Text style={[
                      styles.sourceDescription,
                      data.caffeineSource === source.key ? styles.sourceDescriptionSelected : null
                    ]}>
                      {source.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Info Note */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              This information helps us calculate your personal caffeine tolerance and provide 
              more accurate crash risk predictions. We'll also learn from your daily tracking.
            </Text>
          </View>
        </ScrollView>

        {/* Continue Button */}
        <TouchableOpacity 
          style={[
            styles.continueButton,
            !isValid ? styles.continueButtonDisabled : null
          ]}
          onPress={handleNext}
          disabled={!isValid}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.continueButtonText,
            !isValid ? styles.continueButtonTextDisabled : null
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
  amountGrid: {
    gap: Theme.spacing.sm,
  },
  amountButton: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.cardStroke,
  },
  amountButtonSelected: {
    backgroundColor: Theme.colors.primaryBlue,
    borderColor: Theme.colors.primaryBlue,
  },
  amountLabel: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  amountLabelSelected: {
    color: Theme.colors.white,
  },
  amountDescription: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    fontSize: 13,
  },
  amountDescriptionSelected: {
    color: Theme.colors.white,
  },
  customInputContainer: {
    marginTop: Theme.spacing.md,
    alignItems: 'center',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  customInput: {
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
  customInputLabel: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textSecondary,
  },
  sourceGrid: {
    gap: Theme.spacing.sm,
  },
  sourceButton: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.cardStroke,
  },
  sourceButtonSelected: {
    backgroundColor: Theme.colors.primaryBlue,
    borderColor: Theme.colors.primaryBlue,
  },
  sourceLabel: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  sourceLabelSelected: {
    color: Theme.colors.white,
  },
  sourceDescription: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    fontSize: 13,
  },
  sourceDescriptionSelected: {
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
}); 