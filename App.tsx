import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GetStartedScreen } from './src/screens';
import { MainAppContainer } from './src/components';
import { OnboardingContainer } from './src/screens/onboarding';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'getStarted' | 'onboarding' | 'main'>('getStarted');

  const handleGetStarted = () => {
    setCurrentScreen('onboarding');
  };

  const handleOnboardingComplete = () => {
    setCurrentScreen('main');
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'getStarted':
        return <GetStartedScreen onGetStarted={handleGetStarted} />;
      case 'onboarding':
        return <OnboardingContainer onComplete={handleOnboardingComplete} />;
      case 'main':
        return <MainAppContainer />;
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
