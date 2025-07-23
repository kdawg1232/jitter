import React, { useState } from 'react';
import { OnboardingData, initialOnboardingData } from '../../types/onboarding';
import { UserProfile } from '../../types';
import { StorageService, WidgetService } from '../../services';
import { OnboardingWelcomeScreen } from './OnboardingWelcomeScreen';
import { OnboardingProfileScreen } from './OnboardingProfileScreen';
import { OnboardingHealthScreen } from './OnboardingHealthScreen';
import { OnboardingCaffeineScreen } from './OnboardingCaffeineScreen';
import { OnboardingSleepScreen } from './OnboardingSleepScreen';
import { SetupWidgetNotificationsScreen } from './SetupWidgetNotificationsScreen';
import { OnboardingCompleteScreen } from './OnboardingCompleteScreen';

interface OnboardingContainerProps {
  onComplete: () => void;
  initialData?: OnboardingData;
  isEditMode?: boolean;
  existingUserId?: string;
}

export const OnboardingContainer: React.FC<OnboardingContainerProps> = ({ 
  onComplete, 
  initialData, 
  isEditMode = false,
  existingUserId 
}) => {
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(
    initialData || initialOnboardingData
  );
  const totalSteps = 7;

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
      userId: existingUserId || 'user_' + now.getTime(), // Use existing ID in edit mode
      weightKg: data.weightKg!,
      age: data.age!,
      sex: data.sex!,
      smoker: data.smoker!,
      pregnant: data.pregnant || false,
      oralContraceptives: data.oralContraceptives || false,
      takesFluvoxamine: data.takesFluvoxamine || false,
      takesCiprofloxacin: data.takesCiprofloxacin || false,
      takesOtherCYP1A2Inhibitors: data.takesOtherCYP1A2Inhibitors || false,
      metabolismRate: data.metabolismRate || 'medium',
      averageSleep7Days: data.lastNightSleep || 7.5,
      meanDailyCaffeineMg: data.typicalDailyCaffeine || 0, // Use collected tolerance data
      createdAt: now, // Will be updated properly in handleComplete for edit mode
      updatedAt: now,
    };
  };

  const handleComplete = async () => {
    try {
      console.log(`🎯 ${isEditMode ? 'Updating' : 'Completing'} onboarding with data:`, {
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

      if (isEditMode && existingUserId) {
        // In edit mode, update existing profile
        const profileUpdates = {
          weightKg: onboardingData.weightKg!,
          age: onboardingData.age!,
          sex: onboardingData.sex!,
          smoker: onboardingData.smoker!,
          pregnant: onboardingData.pregnant || false,
          oralContraceptives: onboardingData.oralContraceptives || false,
          takesFluvoxamine: onboardingData.takesFluvoxamine || false,
          takesCiprofloxacin: onboardingData.takesCiprofloxacin || false,
          takesOtherCYP1A2Inhibitors: onboardingData.takesOtherCYP1A2Inhibitors || false,
          metabolismRate: onboardingData.metabolismRate || 'medium',
          averageSleep7Days: onboardingData.lastNightSleep || 7.5,
          meanDailyCaffeineMg: onboardingData.typicalDailyCaffeine || 0,
        };
        
        await StorageService.updateUserProfile(profileUpdates);
        console.log('✅ User profile updated successfully');
      } else {
        // In new user mode, create new profile
        const userProfile = convertOnboardingToUserProfile(onboardingData);
        console.log('👤 Created user profile:', userProfile);
        
        await StorageService.saveUserProfile(userProfile);
        console.log('✅ User profile saved successfully');
      }
      
      // Initialize sleep records if tracking is enabled
      if (onboardingData.trackSleepDaily && onboardingData.lastNightSleep) {
        const userId = existingUserId || 'user_' + new Date().getTime();
        const today = new Date().toISOString().split('T')[0];
        const sleepRecord = {
          userId: userId,
          date: today,
          hoursSlept: onboardingData.lastNightSleep,
          source: 'manual' as const,
          createdAt: new Date(),
        };
        
        await StorageService.addSleepRecord(sleepRecord);
        console.log('😴 Sleep record saved successfully');
      }

      // Set up widgets if enabled during onboarding
      if (onboardingData.widgetsEnabled) {
        try {
          console.log('📱 Setting up widgets from onboarding...');
          const widgetSetupSuccessful = await WidgetService.setupWidgets(onboardingData);
          if (widgetSetupSuccessful) {
            console.log('✅ Widgets set up successfully from onboarding');
          } else {
            console.log('⚠️ Widget setup failed during onboarding completion');
          }
        } catch (error) {
          console.error('❌ Error setting up widgets from onboarding:', error);
        }
      }
      
      // Verify the profile was saved correctly
      const savedProfile = await StorageService.getUserProfile();
      console.log('🔍 Verification - profile exists:', !!savedProfile);
      
      // Mark onboarding as complete
      updateData({ isComplete: true });
      
      // Call the completion callback
      console.log(`🚀 ${isEditMode ? 'Profile updated' : 'Onboarding complete'} - calling completion callback`);
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
        return <SetupWidgetNotificationsScreen {...commonProps} />;
      case 7:
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