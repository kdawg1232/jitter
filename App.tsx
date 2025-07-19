import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GetStartedScreen } from './src/screens';
import { MainAppContainer } from './src/components';
import { OnboardingContainer } from './src/screens/onboarding';
import { StorageService, DeepLinkService } from './src/services';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'getStarted' | 'onboarding' | 'main'>('getStarted');
  const [isLoading, setIsLoading] = useState(true);

  const handleGetStarted = () => {
    setCurrentScreen('onboarding');
  };

  const handleOnboardingComplete = () => {
    setCurrentScreen('main');
  };

  // Extract profile checking function so it can be called from components
  const checkUserProfile = async () => {
    try {
      const profile = await StorageService.getUserProfile();
      console.log('🚀 App - checking user profile:', !!profile);
      
      if (profile) {
        console.log('✅ User profile found, routing to main app');
        setCurrentScreen('main');
      } else {
        console.log('❌ No user profile found, showing get started');
        setCurrentScreen('getStarted');
      }
    } catch (error) {
      console.error('Error checking user profile:', error);
      setCurrentScreen('getStarted');
    }
  };

  // Check for existing user profile on app startup
  useEffect(() => {
    const initializeApp = async () => {
      await checkUserProfile();
      
      // Initialize deep linking for widget integration
      await DeepLinkService.initialize();
      
      setIsLoading(false);
    };

    initializeApp();
  }, []);

  // Show loading screen while checking user profile
  if (isLoading) {
    return (
      <>
        <StatusBar style="auto" backgroundColor="#F3ECFF" />
        {/* You could add a loading spinner here if desired */}
      </>
    );
  }

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'getStarted':
        return <GetStartedScreen onGetStarted={handleGetStarted} />;
      case 'onboarding':
        return <OnboardingContainer onComplete={handleOnboardingComplete} />;
      case 'main':
        return <MainAppContainer onProfileCleared={checkUserProfile} />;
      default:
        return <GetStartedScreen onGetStarted={handleGetStarted} />;
    }
  };

  return (
    <>
      <StatusBar style="auto" backgroundColor="#F3ECFF" />
      {renderCurrentScreen()}
    </>
  );
}
