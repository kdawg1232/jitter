import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BottomNavigation, TabType } from './BottomNavigation';
import { HomeScreen } from '../screens/HomeScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { WinningsScreen } from '../screens/WinningsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { EditInputScreen } from '../screens/EditInputScreen';
import { HelpSupportScreen } from '../screens/HelpSupportScreen';
import { OnboardingContainer } from '../screens/onboarding';
import { OnboardingData } from '../types/onboarding';
import { StorageService } from '../services';

interface MainAppContainerProps {
  onProfileCleared: () => Promise<void>;
}

type SettingsScreen = 'settings' | 'editInput' | 'helpSupport' | 'onboarding';

export const MainAppContainer: React.FC<MainAppContainerProps> = ({ onProfileCleared }) => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0);
  const [currentSettingsScreen, setCurrentSettingsScreen] = useState<SettingsScreen>('settings');
  const [editOnboardingData, setEditOnboardingData] = useState<OnboardingData | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);

  const handleTabPress = (tab: TabType) => {
    setActiveTab(tab);
    
    // Reset settings screen when switching away from settings
    if (activeTab === 'settings' && tab !== 'settings') {
      setCurrentSettingsScreen('settings');
    }
    
    // Trigger refresh when stats tab is selected
    if (tab === 'stats') {
      setStatsRefreshTrigger(prev => prev + 1);
    }
  };

  // Settings navigation functions
  const handleNavigateToEditInput = async () => {
    // Load user profile to get the user ID for edit mode
    try {
      const userProfile = await StorageService.getUserProfile();
      if (userProfile) {
        setEditUserId(userProfile.userId);
      }
    } catch (error) {
      console.error('Error loading user profile for edit:', error);
    }
    setCurrentSettingsScreen('editInput');
  };

  const handleNavigateToHelpSupport = () => {
    setCurrentSettingsScreen('helpSupport');
  };

  const handleNavigateToOnboarding = async (data: OnboardingData, isEditMode: boolean) => {
    setEditOnboardingData(data);
    
    // Make sure we have the user ID for edit mode
    if (isEditMode && !editUserId) {
      try {
        const userProfile = await StorageService.getUserProfile();
        if (userProfile) {
          setEditUserId(userProfile.userId);
        }
      } catch (error) {
        console.error('Error loading user profile for edit mode:', error);
      }
    }
    
    setCurrentSettingsScreen('onboarding');
  };

  const handleBackToSettings = () => {
    setCurrentSettingsScreen('settings');
    setEditOnboardingData(null);
    setEditUserId(null);
  };

  const handleEditComplete = async () => {
    // After editing is complete, return to settings
    setCurrentSettingsScreen('settings');
    setEditOnboardingData(null);
    setEditUserId(null);
  };

  const renderSettingsScreen = () => {
    switch (currentSettingsScreen) {
      case 'settings':
        return (
          <SettingsScreen 
            onNavigateToEditInput={handleNavigateToEditInput}
            onNavigateToHelpSupport={handleNavigateToHelpSupport}
          />
        );
      case 'editInput':
        return (
          <EditInputScreen
            onNavigateToOnboarding={handleNavigateToOnboarding}
            onBack={handleBackToSettings}
          />
        );
      case 'helpSupport':
        return (
          <HelpSupportScreen
            onBack={handleBackToSettings}
          />
        );
      case 'onboarding':
        if (editOnboardingData) {
          return (
            <OnboardingContainer
              onComplete={handleEditComplete}
              initialData={editOnboardingData}
              isEditMode={true}
              existingUserId={editUserId || undefined}
            />
          );
        }
        return <SettingsScreen onNavigateToEditInput={handleNavigateToEditInput} onNavigateToHelpSupport={handleNavigateToHelpSupport} />;
      default:
        return <SettingsScreen onNavigateToEditInput={handleNavigateToEditInput} onNavigateToHelpSupport={handleNavigateToHelpSupport} />;
    }
  };

  const renderCurrentScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onProfileCleared={onProfileCleared} />;
      case 'stats':
        return <StatsScreen refreshTrigger={statsRefreshTrigger} />;
      case 'planning': {
        // Planning screen disabled for v1, will be enabled in v2
        return <HomeScreen onProfileCleared={onProfileCleared} />;
      }
      case 'winnings':
        // Winnings screen hidden for V1, redirect to home
        return <HomeScreen onProfileCleared={onProfileCleared} />;
      case 'settings':
        return renderSettingsScreen();
      default:
        return <HomeScreen onProfileCleared={onProfileCleared} />;
    }
  };

  const shouldShowBottomNavigation = () => {
    if (activeTab === 'settings') {
      return currentSettingsScreen === 'settings';
    }
    return true;
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {renderCurrentScreen()}
      </View>
      {shouldShowBottomNavigation() && (
        <BottomNavigation 
          activeTab={activeTab} 
          onTabPress={handleTabPress} 
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
}); 