import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GetStartedScreen } from './src/screens';

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);

  const handleGetStarted = () => {
    setHasStarted(true);
    // TODO: Navigate to main app screens
  };

  if (!hasStarted) {
    return (
      <>
        <StatusBar style="auto" backgroundColor="#F3ECFF" />
        <GetStartedScreen onGetStarted={handleGetStarted} />
      </>
    );
  }

  // TODO: Replace with main app content later
  return (
    <>
      <StatusBar style="auto" backgroundColor="#F3ECFF" />
      {/* Main app content will go here */}
    </>
  );
}
