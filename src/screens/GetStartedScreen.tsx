import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Image,
} from 'react-native';
import { Theme } from '../theme/colors';

const { width, height } = Dimensions.get('window');

interface GetStartedScreenProps {
  onGetStarted: () => void;
}

export const GetStartedScreen: React.FC<GetStartedScreenProps> = ({ onGetStarted }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Center section with mascot and text */}
        <View style={styles.centerSection}>
          <View style={styles.mascotContainer}>
            <Image 
              source={require('../../assets/purplejittermascot.png')} 
              style={styles.mascotImage}
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroText}>avoid the jitters.</Text>
            <Text style={styles.heroText}>nail your focus.</Text>
          </View>
        </View>
        
        {/* Bottom section with button and terms */}
        <View style={styles.bottomSection}>
          <TouchableOpacity style={styles.getStartedButton} onPress={onGetStarted}>
            <Text style={styles.buttonText}>get started</Text>
          </TouchableOpacity>
          
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <Text style={styles.linkText}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.linkText}>Privacy Policy</Text>
            </Text>
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
    justifyContent: 'space-between',
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
  },
  mascotContainer: {
    marginBottom: Theme.spacing.xl,
  },
  mascotImage: {
    width: 180,
    height: 216,
  },
  heroTextContainer: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xxl,
  },
  heroText: {
    ...Theme.fonts.bigTitle,
    fontSize: 36,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: Theme.spacing.xs,
  },
  bottomSection: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl,
    alignItems: 'center',
  },
  getStartedButton: {
    backgroundColor: Theme.colors.primaryBlue,
    paddingVertical: 18,
    paddingHorizontal: Theme.spacing.xl,
    borderRadius: Theme.borderRadius.large,
    width: width - (Theme.spacing.lg * 2),
    alignItems: 'center',
    shadowColor: Theme.colors.primaryBlue,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    ...Theme.fonts.button,
    color: Theme.colors.white,
    textAlign: 'center',
  },
  termsContainer: {
    marginTop: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
  },
  termsText: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  linkText: {
    color: Theme.colors.primaryBlue,
  },
}); 