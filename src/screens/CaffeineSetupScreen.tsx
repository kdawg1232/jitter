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
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useDatabase';
import { theme } from '../constants/theme';

export const CaffeineSetupScreen: React.FC = () => {
  const [dailyLimit, setDailyLimit] = useState('400');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { updateProfile } = useUserProfile();

  const handleComplete = async () => {
    const limitNumber = parseInt(dailyLimit);
    
    if (isNaN(limitNumber) || limitNumber <= 0) {
      Alert.alert('Error', 'Please enter a valid daily caffeine limit');
      return;
    }

    if (limitNumber > 1000) {
      Alert.alert('Warning', 'That seems like a very high daily limit. Are you sure?', [
        { text: 'Change', style: 'cancel' },
        { text: 'Continue', onPress: completeSetup },
      ]);
      return;
    }

    completeSetup();
  };

  const completeSetup = async () => {
    setLoading(true);
    
    try {
      // Save user profile data to Supabase
      const { error } = await updateProfile({
        daily_limit_mg: parseInt(dailyLimit),
      });

      if (error) {
        Alert.alert('Error', 'Failed to save your profile. Please try again.');
        console.error('Setup error:', error);
      } else {
        Alert.alert('Welcome to Jitter!', 'Your profile has been set up successfully!');
        // The RootNavigator will automatically detect the profile update and navigate to the main app
      }
    } catch (error) {
      console.error('Setup error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="flash" size={48} color={theme.colors.primary} />
              </View>
            </View>

            {/* White Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Set Your Daily Limit</Text>
              <Text style={styles.cardSubtitle}>
                The FDA recommends no more than 400mg of caffeine per day for healthy adults
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Daily Limit (mg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="400"
                  placeholderTextColor="#A0A0A0"
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

              <TouchableOpacity
                style={[styles.completeButton, loading && styles.buttonDisabled]}
                onPress={handleComplete}
                disabled={loading}
              >
                <Text style={styles.completeButtonText}>
                  {loading ? 'Setting up...' : 'Complete Setup'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F9F9FB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: '#F8F8F8',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  infoBox: {
    backgroundColor: '#F0F8FF',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
  },
  completeButton: {
    backgroundColor: '#FFA500',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#D0D0D0',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
}); 