import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Theme } from '../theme/colors';
import { StorageService } from '../services/StorageService';
import { UserProfile } from '../types';
import { OnboardingData, initialOnboardingData } from '../types/onboarding';

interface EditInputScreenProps {
  onNavigateToOnboarding: (data: OnboardingData, isEditMode: boolean) => Promise<void>;
  onBack: () => void;
}

export const EditInputScreen: React.FC<EditInputScreenProps> = ({
  onNavigateToOnboarding,
  onBack,
}) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profile = await StorageService.getUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartUpdate = async () => {
    if (!userProfile) {
      Alert.alert('Error', 'No profile found to edit');
      return;
    }

    // Convert UserProfile back to OnboardingData format
    const editData: OnboardingData = {
      weightKg: userProfile.weightKg,
      weightUnit: 'kg', // Default to kg, could be stored in profile later
      age: userProfile.age,
      sex: userProfile.sex,
      smoker: userProfile.smoker,
      pregnant: userProfile.pregnant,
      oralContraceptives: userProfile.oralContraceptives,
      typicalDailyCaffeine: userProfile.meanDailyCaffeineMg,
      caffeineSource: null, // This might need to be stored in profile
      lastNightSleep: userProfile.averageSleep7Days,
      trackSleepDaily: true,
      notificationsEnabled: false, // Will be checked from NotificationService if needed
      currentStep: 2, // Start from profile step since we skip welcome
      isComplete: false,
    };

    await onNavigateToOnboarding(editData, true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.messageContainer}>
          <Text style={styles.title}>have some changes?</Text>
          <Text style={styles.subtitle}>let's edit your details</Text>
          
          <Text style={styles.description}>
            update your personal information, health factors, and caffeine habits to keep your predictions accurate
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.updateButton} onPress={handleStartUpdate}>
            <Text style={styles.updateButtonText}>let's update</Text>
          </TouchableOpacity>
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
  header: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.sm,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: Theme.spacing.sm,
    marginLeft: -Theme.spacing.sm,
  },
  backText: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.primaryBlue,
    fontSize: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: Theme.spacing.lg,
    justifyContent: 'space-between',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Theme.spacing.xxl,
  },
  title: {
    ...Theme.fonts.bigTitle,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: Theme.spacing.sm,
  },
  subtitle: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
  description: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Theme.spacing.xl,
  },
  buttonContainer: {
    paddingBottom: Theme.spacing.xl,
  },
  updateButton: {
    backgroundColor: Theme.colors.primaryGreen,
    borderRadius: Theme.borderRadius.large,
    paddingVertical: Theme.spacing.lg,
    alignItems: 'center',
  },
  updateButtonText: {
    ...Theme.fonts.button,
    color: Theme.colors.white,
    fontSize: 18,
  },
}); 