import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { theme } from '../constants/theme';

export const OnboardingScreen: React.FC = () => {
  const [dailyLimit, setDailyLimit] = useState('400');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleComplete = async () => {
    const limitNumber = parseInt(dailyLimit);
    
    if (isNaN(limitNumber) || limitNumber <= 0) {
      Alert.alert('Error', 'Please enter a valid daily caffeine limit');
      return;
    }

    if (limitNumber > 1000) {
      Alert.alert('Warning', 'That seems like a very high daily limit. Are you sure?', [
        { text: 'Change', style: 'cancel' },
        { text: 'Continue', onPress: completeOnboarding },
      ]);
      return;
    }

    completeOnboarding();
  };

  const completeOnboarding = async () => {
    setLoading(true);
    // TODO: Save user profile data to Supabase
    // This will be implemented in Phase 4 when we set up the database
    
    // For now, just simulate saving and proceed
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Welcome!', 'Your profile has been set up successfully!');
    }, 1000);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Jitter!</Text>
          <Text style={styles.subtitle}>
            Let's set up your profile to get started with tracking your caffeine intake
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Caffeine Limit</Text>
            <Text style={styles.sectionSubtitle}>
              The FDA recommends no more than 400mg of caffeine per day for healthy adults
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Daily Limit (mg)</Text>
              <TextInput
                style={styles.input}
                placeholder="400"
                placeholderTextColor={theme.colors.textSecondary}
                value={dailyLimit}
                onChangeText={setDailyLimit}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Don't worry, you can change this later in your profile settings
              </Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleComplete}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Setting up...' : 'Complete Setup'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  sectionSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: theme.spacing.md,
  },
  label: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  infoText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginTop: theme.spacing.xl,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: theme.colors.textSecondary,
  },
  buttonText: {
    ...theme.typography.subheading,
    color: theme.colors.surface,
  },
}); 