import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BottomNavigation, TabType } from './BottomNavigation';
import { 
  HomeScreen, 
  StatsScreen, 
  WinningsScreen, 
  SettingsScreen 
} from '../screens';

export const MainAppContainer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');

  const renderCurrentScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'stats':
        return <StatsScreen />;
      case 'winnings':
        return <WinningsScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <View style={styles.container}>
      {renderCurrentScreen()}
      <BottomNavigation 
        activeTab={activeTab}
        onTabPress={setActiveTab}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 