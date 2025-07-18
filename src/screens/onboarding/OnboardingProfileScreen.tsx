import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Theme } from '../../theme/colors';
import { OnboardingStepProps, ONBOARDING_CONTENT, convertWeight, validateStep } from '../../types/onboarding';

interface OnboardingProfileScreenProps extends OnboardingStepProps {}

export const OnboardingProfileScreen: React.FC<OnboardingProfileScreenProps> = ({
  data,
  onUpdateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  const content = ONBOARDING_CONTENT[2];
  const [weightInput, setWeightInput] = useState(
    data.weightKg 
      ? data.weightUnit === 'kg' 
        ? data.weightKg.toString() 
        : convertWeight.kgToLbs(data.weightKg).toString()
      : ''
  );
  const [ageInput, setAgeInput] = useState(data.age?.toString() || '');
  const slideAnim = useState(new Animated.Value(0))[0];

  const handleWeightChange = (text: string) => {
    Haptics.selectionAsync();
    setWeightInput(text);
    const numericValue = parseFloat(text);
    if (!isNaN(numericValue) && numericValue > 0) {
      const weightInKg = data.weightUnit === 'kg' 
        ? numericValue 
        : convertWeight.lbsToKg(numericValue);
      onUpdateData({ weightKg: weightInKg });
    } else {
      onUpdateData({ weightKg: null });
    }
  };

  const handleAgeChange = (text: string) => {
    Haptics.selectionAsync();
    setAgeInput(text);
    const numericValue = parseInt(text);
    if (!isNaN(numericValue) && numericValue > 0 && numericValue <= 120) {
      onUpdateData({ age: numericValue });
    } else {
      onUpdateData({ age: null });
    }
  };

  const toggleWeightUnit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newUnit = data.weightUnit === 'kg' ? 'lbs' : 'kg';
    onUpdateData({ weightUnit: newUnit });
    
    // Convert displayed weight
    if (data.weightKg) {
      const newDisplayWeight = newUnit === 'kg' 
        ? data.weightKg.toString()
        : convertWeight.kgToLbs(data.weightKg).toString();
      setWeightInput(newDisplayWeight);
    }
  };

  const handleSexSelection = (sex: 'male' | 'female') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdateData({ 
      sex,
      // Reset female-specific fields if switching away from female
      ...(sex !== 'female' ? { pregnant: null, oralContraceptives: null } : {})
    });
  };

  const handleNext = () => {
    if (validateStep[2](data)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Add smooth transition
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onNext();
      });
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  };

  const isValid = validateStep[2](data);

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

          {/* Weight Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Weight</Text>
            <View style={styles.weightContainer}>
              <TextInput
                style={styles.weightInput}
                value={weightInput}
                onChangeText={handleWeightChange}
                placeholder="70"
                keyboardType="numeric"
                placeholderTextColor={Theme.colors.textTertiary}
              />
              <TouchableOpacity 
                style={styles.unitToggle}
                onPress={toggleWeightUnit}
              >
                <Text style={styles.unitText}>{data.weightUnit}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Age Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Age</Text>
            <TextInput
              style={styles.textInput}
              value={ageInput}
              onChangeText={handleAgeChange}
              placeholder="25"
              keyboardType="numeric"
              placeholderTextColor={Theme.colors.textTertiary}
            />
          </View>

          {/* Sex Selection */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Sex</Text>
            <View style={styles.sexButtonContainer}>
              {['male', 'female'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.sexButton,
                    data.sex === option && styles.sexButtonSelected
                  ]}
                  onPress={() => handleSexSelection(option as 'male' | 'female')}
                >
                  <Text style={[
                    styles.sexButtonText,
                    data.sex === option && styles.sexButtonTextSelected
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
  inputSection: {
    marginBottom: Theme.spacing.xl,
  },
  inputLabel: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.md,
  },
  weightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightInput: {
    flex: 1,
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    ...Theme.fonts.body,
    color: Theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: Theme.colors.cardStroke,
  },
  unitToggle: {
    backgroundColor: Theme.colors.primaryBlue,
    borderRadius: Theme.borderRadius.medium,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    marginLeft: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.primaryBlue,
    minWidth: 60,
    alignItems: 'center',
  },
  unitText: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.white,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    ...Theme.fonts.body,
    color: Theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: Theme.colors.cardStroke,
  },
  sexButtonContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  sexButton: {
    flex: 1,
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.medium,
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.cardStroke,
  },
  sexButtonSelected: {
    backgroundColor: Theme.colors.primaryBlue,
    borderColor: Theme.colors.primaryBlue,
  },
  sexButtonText: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
  },
  sexButtonTextSelected: {
    color: Theme.colors.white,
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