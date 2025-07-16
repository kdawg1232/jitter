import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Theme } from '../theme/colors';

interface WinningsScreenProps {
  // Add navigation props later if needed
}

export const WinningsScreen: React.FC<WinningsScreenProps> = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>winnings</Text>
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>Winnings screen coming soon!</Text>
          <Text style={styles.subtitle}>Here you'll see your achievements and rewards</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.canvas,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
  },
  title: {
    ...Theme.fonts.bigTitle,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xl,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
  },
  subtitle: {
    ...Theme.fonts.body,
    color: Theme.colors.textTertiary,
    textAlign: 'center',
  },
}); 