import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Theme } from '../theme/colors';

interface WinningsScreenProps {
  // Add navigation props later if needed
}

const { width } = Dimensions.get('window');
const SQUARE_SIZE = (width - Theme.spacing.lg * 3) / 2; // Two squares per row with proper spacing

export const WinningsScreen: React.FC<WinningsScreenProps> = () => {
  const handleRafflePress = (days: number) => {
    console.log(`Enter raffle for ${days} days pressed`);
    // TODO: Implement raffle entry logic
  };

  const handleCouponPress = () => {
    console.log('Claim $10 off coupon pressed');
    // TODO: Implement coupon claim logic
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>jitter winnings</Text>
        
        <View style={styles.gridContainer}>
          <View style={styles.row}>
            {/* 30 Days Square */}
            <View style={styles.squareContainer}>
              <Text style={styles.dayLabel}>/30</Text>
              <TouchableOpacity 
                style={styles.square}
                onPress={() => handleRafflePress(30)}
              >
                <Text style={styles.squareText}>enter{'\n'}raffle</Text>
              </TouchableOpacity>
            </View>

            {/* 90 Days Square */}
            <View style={styles.squareContainer}>
              <Text style={styles.dayLabel}>/90</Text>
              <TouchableOpacity 
                style={styles.square}
                onPress={() => handleRafflePress(90)}
              >
                <Text style={styles.squareText}>enter{'\n'}raffle</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.row}>
            {/* 180 Days Square */}
            <View style={styles.squareContainer}>
              <Text style={styles.dayLabel}>/180</Text>
              <TouchableOpacity 
                style={styles.square}
                onPress={() => handleRafflePress(180)}
              >
                <Text style={styles.squareText}>enter{'\n'}raffle</Text>
              </TouchableOpacity>
            </View>

            {/* 365 Days Square */}
            <View style={styles.squareContainer}>
              <Text style={styles.dayLabel}>/365</Text>
              <TouchableOpacity 
                style={styles.square}
                onPress={handleCouponPress}
              >
                <Text style={[styles.squareText, styles.premiumText]}>
                  $10 off{'\n'}coupon{'\n'}+{'\n'}free sticker
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
    marginBottom: Theme.spacing.xxl,
  },
  gridContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.lg,
  },
  squareContainer: {
    alignItems: 'center',
    marginHorizontal: Theme.spacing.sm,
  },
  dayLabel: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.md,
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    backgroundColor: Theme.colors.cardBg,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 2,
    borderColor: Theme.colors.cardStroke,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  squareText: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
  },
  premiumText: {
    color: Theme.colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 18,
  },
}); 