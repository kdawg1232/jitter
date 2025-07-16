import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
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
        {/* Empty space where animation would be */}
        <View style={styles.animationSpace} />
        
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
  animationSpace: {
    flex: 1,
    // Empty space for where animation would go
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