import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BottomNavigation, TabType } from './BottomNavigation';
import { 
  HomeScreen, 
  StatsScreen, 
  WinningsScreen, 
  SettingsScreen 
} from '../screens';

interface MainAppContainerProps {
  onProfileCleared: () => Promise<void>;
}

export const MainAppContainer: React.FC<MainAppContainerProps> = ({ onProfileCleared }) => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0);

  const handleTabPress = (tab: TabType) => {
    setActiveTab(tab);
    
    // Trigger refresh when stats tab is selected
    if (tab === 'stats') {
      setStatsRefreshTrigger(prev => prev + 1);
    }
  };

  const renderCurrentScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onProfileCleared={onProfileCleared} />;
      case 'stats':
        return <StatsScreen refreshTrigger={statsRefreshTrigger} />;
      case 'winnings':
        return <WinningsScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <HomeScreen onProfileCleared={onProfileCleared} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {renderCurrentScreen()}
      </View>
      <BottomNavigation 
        activeTab={activeTab} 
        onTabPress={handleTabPress} 
      />
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