import React, { useState } from 'react';
import { OnboardingData, initialOnboardingData } from '../../types/onboarding';
import { UserProfile } from '../../types';
import { StorageService } from '../../services';
import { OnboardingWelcomeScreen } from './OnboardingWelcomeScreen';
import { OnboardingProfileScreen } from './OnboardingProfileScreen';
import { OnboardingHealthScreen } from './OnboardingHealthScreen';
import { OnboardingCaffeineScreen } from './OnboardingCaffeineScreen';
import { OnboardingSleepScreen } from './OnboardingSleepScreen';
import { OnboardingCompleteScreen } from './OnboardingCompleteScreen';

interface OnboardingContainerProps {
  onComplete: () => void;
}

export const OnboardingContainer: React.FC<OnboardingContainerProps> = ({ onComplete }) => {
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(initialOnboardingData);
  const totalSteps = 6;

  const updateData = (updates: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...updates }));
  };

  const goToNextStep = () => {
    if (onboardingData.currentStep < totalSteps) {
      updateData({ currentStep: onboardingData.currentStep + 1 });
    }
  };

  const goToPreviousStep = () => {
    if (onboardingData.currentStep > 1) {
      updateData({ currentStep: onboardingData.currentStep - 1 });
    }
  };

  const convertOnboardingToUserProfile = (data: OnboardingData): UserProfile => {
    const now = new Date();
    return {
      userId: 'user_' + now.getTime(), // Simple ID generation
      weightKg: data.weightKg!,
      age: data.age!,
      sex: data.sex!,
      smoker: data.smoker!,
      pregnant: data.pregnant || false,
      oralContraceptives: data.oralContraceptives || false,
      averageSleep7Days: data.lastNightSleep || 7.5,
      meanDailyCaffeineMg: data.typicalDailyCaffeine || 0, // Use collected tolerance data
      createdAt: now,
      updatedAt: now,
    };
  };

  const handleComplete = async () => {
    try {
      console.log('🎯 Completing onboarding with data:', {
        weightKg: onboardingData.weightKg,
        age: onboardingData.age,
        sex: onboardingData.sex,
        smoker: onboardingData.smoker,
        pregnant: onboardingData.pregnant,
        oralContraceptives: onboardingData.oralContraceptives,
        typicalDailyCaffeine: onboardingData.typicalDailyCaffeine,
        caffeineSource: onboardingData.caffeineSource,
        lastNightSleep: onboardingData.lastNightSleep,
        trackSleepDaily: onboardingData.trackSleepDaily
      });

      // Convert onboarding data to user profile
      const userProfile = convertOnboardingToUserProfile(onboardingData);
      console.log('👤 Created user profile:', userProfile);
      
      // Save user profile using StorageService
      await StorageService.saveUserProfile(userProfile);
      console.log('✅ User profile saved successfully');
      
      // Initialize sleep records if tracking is enabled
      if (onboardingData.trackSleepDaily && onboardingData.lastNightSleep) {
        const today = new Date().toISOString().split('T')[0];
        const sleepRecord = {
          userId: userProfile.userId,
          date: today,
          hoursSlept: onboardingData.lastNightSleep,
          source: 'manual' as const,
          createdAt: new Date(),
        };
        
        await StorageService.addSleepRecord(sleepRecord);
        console.log('😴 Sleep record saved successfully');
      }
      
      // Verify the profile was saved correctly
      const savedProfile = await StorageService.getUserProfile();
      console.log('🔍 Verification - profile exists:', !!savedProfile);
      
      // Mark onboarding as complete
      updateData({ isComplete: true });
      
      // Call the completion callback
      console.log('🚀 Calling completion callback - routing to main app');
      onComplete();
    } catch (error) {
      console.error('❌ Error saving onboarding data:', error);
      // Still proceed to main app even if save fails
      onComplete();
    }
  };

  const renderCurrentStep = () => {
    const commonProps = {
      data: onboardingData,
      onUpdateData: updateData,
      onNext: goToNextStep,
      onBack: goToPreviousStep,
      currentStep: onboardingData.currentStep,
      totalSteps,
    };

    switch (onboardingData.currentStep) {
      case 1:
        return <OnboardingWelcomeScreen {...commonProps} />;
      case 2:
        return <OnboardingProfileScreen {...commonProps} />;
      case 3:
        return <OnboardingHealthScreen {...commonProps} />;
      case 4:
        return <OnboardingCaffeineScreen {...commonProps} />;
      case 5:
        return <OnboardingSleepScreen {...commonProps} />;
      case 6:
        return (
          <OnboardingCompleteScreen 
            {...commonProps} 
            onComplete={handleComplete}
          />
        );
      default:
        return <OnboardingWelcomeScreen {...commonProps} />;
    }
  };

  return renderCurrentStep();
}; 