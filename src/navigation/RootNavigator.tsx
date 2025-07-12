import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { AuthNavigator } from './AuthNavigator';
import TabNavigator from './TabNavigator';
import { LoadingSpinner } from '../components';
import { theme } from '../constants/theme';
import { supabase } from '../constants/supabase';
import { CaffeineSetupScreen } from '../screens/CaffeineSetupScreen';

export const RootNavigator: React.FC = () => {
  const { user, loading, initialized } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (user && initialized) {
      fetchUserProfile();
    } else if (!user && initialized) {
      setProfileLoading(false);
    }
  }, [user, initialized]);

  useEffect(() => {
    // Set up real-time subscription for user profile changes
    if (user) {
      const subscription = supabase
        .channel('user-profile-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            console.log('User profile updated:', payload);
            setUserProfile(payload.new);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
      } else {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  // Show loading screen while initializing
  if (!initialized || (user && profileLoading)) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner variant="overlay" />
      </View>
    );
  }

  // Show auth screens if not authenticated
  if (!user) {
    return <AuthNavigator />;
  }

  // Show setup screen if user hasn't completed caffeine setup
  if (userProfile && userProfile.daily_limit_mg === null) {
    return <CaffeineSetupScreen />;
  }

  // Show main app if authenticated and setup is complete
  return <TabNavigator />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
}); 