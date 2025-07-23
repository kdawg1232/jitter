import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Theme } from '../theme/colors';

const { width } = Dimensions.get('window');

export type TabType = 'home' | 'stats' | 'planning' | 'winnings' | 'settings';

interface BottomNavigationProps {
  activeTab: TabType;
  onTabPress: (tab: TabType) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabPress,
}) => {
  const tabs: { key: TabType; label: string; icon?: string; iconSource?: any }[] = [
    { key: 'home', label: 'home', iconSource: require('../../assets/houseicon.png') },
    { key: 'stats', label: 'stats', iconSource: require('../../assets/statsicon.png') },
    { key: 'winnings', label: 'winnings', iconSource: require('../../assets/winningsicon.png') },
    { key: 'settings', label: 'settings', iconSource: require('../../assets/settingsicon.png') },
  ];

  const handleTabPress = (tab: TabType) => {
    // Only trigger haptics if switching to a different tab
    if (activeTab !== tab) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onTabPress(tab);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab,
            ]}
            onPress={() => handleTabPress(tab.key)}
          >
            {tab.iconSource ? (
              <Image source={tab.iconSource} style={styles.tabIconImage} />
            ) : (
              <Text style={styles.tabIcon}>{tab.icon}</Text>
            )}
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.key && styles.activeTabLabel,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.canvas,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.divider,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingBottom: 20, // Extra padding for iPhone bottom area
    paddingTop: Theme.spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Theme.spacing.xs,
  },
  activeTab: {
    // Add any active tab styling if needed
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabIconImage: {
    width: 20,
    height: 20,
    marginBottom: 2,
  },
  tabLabel: {
    ...Theme.fonts.caption,
    color: Theme.colors.textTertiary,
    fontSize: 10,
  },
  activeTabLabel: {
    color: Theme.colors.textPrimary,
    fontWeight: '600',
  },
}); 