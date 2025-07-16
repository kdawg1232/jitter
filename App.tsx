import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GetStartedScreen } from './src/screens';
import { MainAppContainer } from './src/components';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'getStarted' | 'main'>('getStarted');

  const handleGetStarted = () => {
    setCurrentScreen('main');
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'getStarted':
        return <GetStartedScreen onGetStarted={handleGetStarted} />;
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
