import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, Input, Modal } from '../components';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile, useEntries } from '../hooks/useDatabase';
import { theme } from '../constants/theme';

export const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const { profile, updateProfile, loading: profileLoading } = useUserProfile();
  const { entries, loading: entriesLoading } = useEntries(); // Get all entries for all-time stats
  
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [newLimit, setNewLimit] = useState('');

  // Calculate all-time statistics
  const calculateAllTimeStats = () => {
    if (!entries || entries.length === 0) {
      return {
        totalSugar: 0,
        totalCaffeine: 0,
        totalCalories: 0,
        totalSpent: 0,
        totalDrinks: 0
      };
    }

    return entries.reduce((acc, entry) => {
      const drink = entry.drink;
      const amount = entry.amount;
      
      return {
        totalSugar: acc.totalSugar + (drink.sugar_g * amount),
        totalCaffeine: acc.totalCaffeine + (drink.caffeine_mg * amount),
        totalCalories: acc.totalCalories + (drink.calories * amount),
        totalSpent: acc.totalSpent + (drink.price * amount),
        totalDrinks: acc.totalDrinks + 1
      };
    }, {
      totalSugar: 0,
      totalCaffeine: 0,
      totalCalories: 0,
      totalSpent: 0,
      totalDrinks: 0
    });
  };

  const allTimeStats = calculateAllTimeStats();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleUpdateLimit = async () => {
    const limitNumber = parseInt(newLimit);
    
    if (isNaN(limitNumber) || limitNumber <= 0) {
      Alert.alert('Error', 'Please enter a valid daily caffeine limit');
      return;
    }

    if (limitNumber > 1000) {
      Alert.alert('Warning', 'That seems like a very high daily limit. Are you sure?', [
        { text: 'Change', style: 'cancel' },
        { text: 'Continue', onPress: updateLimit },
      ]);
      return;
    }

    updateLimit();
  };

  const updateLimit = async () => {
    try {
      const { error } = await updateProfile({
        daily_limit_mg: parseInt(newLimit),
      });

      if (error) {
        Alert.alert('Error', 'Failed to update your daily limit. Please try again.');
      } else {
        Alert.alert('Success', 'Your daily caffeine limit has been updated!');
        setShowLimitModal(false);
        setNewLimit('');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const openLimitModal = () => {
    setNewLimit(profile?.daily_limit_mg?.toString() || '400');
    setShowLimitModal(true);
  };

  if (profileLoading || entriesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Profile</Text>
          
          {/* User Info Section */}
          <Card variant="default" style={styles.userCard}>
            <View style={styles.userHeader}>
              <View style={styles.userAvatar}>
                <Ionicons name="person" size={32} color={theme.colors.primary} />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userEmail}>{user?.email}</Text>
                <Text style={styles.userSince}>
                  Member since {new Date(user?.created_at || '').toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long' 
                  })}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.settingItem} onPress={openLimitModal}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Daily Caffeine Limit</Text>
                <Text style={styles.settingValue}>{profile?.daily_limit_mg || 400}mg</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </Card>

          {/* All Time Stats */}
          <Card variant="elevated" style={styles.statsCard}>
            <Text style={styles.statsTitle}>All Time Stats</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{Math.round(allTimeStats.totalSugar)} mg</Text>
                  <Text style={styles.statLabel}>Sugar</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
                    {Math.round(allTimeStats.totalCaffeine)} mg
                  </Text>
                  <Text style={styles.statLabel}>Caffeine</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{Math.round(allTimeStats.totalCalories)}</Text>
                  <Text style={styles.statLabel}>Calories</Text>
                </View>
              </View>
              
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: theme.colors.success }]}>
                    ${allTimeStats.totalSpent.toFixed(2)}
                  </Text>
                  <Text style={styles.statLabel}>Money Spent</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: theme.colors.info }]}>
                    {allTimeStats.totalDrinks}
                  </Text>
                  <Text style={styles.statLabel}># of Drinks</Text>
                </View>
                <View style={styles.statItem}>
                  {/* Empty space for layout */}
                </View>
              </View>
            </View>
          </Card>

          {/* Additional Stats */}
          <Card variant="default" style={styles.additionalStatsCard}>
            <Text style={styles.cardTitle}>Your Journey</Text>
            
            <View style={styles.journeyStats}>
              <View style={styles.journeyItem}>
                <Ionicons name="calendar" size={20} color={theme.colors.primary} />
                <Text style={styles.journeyLabel}>Days Active</Text>
                <Text style={styles.journeyValue}>
                  {entries.length > 0 ? 
                    Math.ceil((Date.now() - new Date(entries[entries.length - 1].created_at).getTime()) / (1000 * 60 * 60 * 24)) 
                    : 0}
                </Text>
              </View>
              
              <View style={styles.journeyItem}>
                <Ionicons name="trophy" size={20} color={theme.colors.warning} />
                <Text style={styles.journeyLabel}>Avg per Day</Text>
                <Text style={styles.journeyValue}>
                  {entries.length > 0 ? 
                    Math.round(allTimeStats.totalCaffeine / Math.max(1, Math.ceil((Date.now() - new Date(entries[entries.length - 1].created_at).getTime()) / (1000 * 60 * 60 * 24))))
                    : 0}mg
                </Text>
              </View>
              
              <View style={styles.journeyItem}>
                <Ionicons name="flash" size={20} color={theme.colors.error} />
                <Text style={styles.journeyLabel}>Highest Day</Text>
                <Text style={styles.journeyValue}>
                  {/* This would need daily aggregation - simplified for now */}
                  {Math.round(allTimeStats.totalCaffeine / Math.max(1, allTimeStats.totalDrinks) * 3)}mg
                </Text>
              </View>
            </View>
          </Card>

          {/* Account Actions */}
          <View style={styles.actionsContainer}>
            <Button
              title="Sign Out"
              onPress={handleSignOut}
              variant="outline"
              size="large"
              fullWidth
              style={styles.signOutButton}
            />
          </View>
        </View>
      </ScrollView>

      {/* Daily Limit Modal */}
      <Modal
        visible={showLimitModal}
        onClose={() => {
          setShowLimitModal(false);
          setNewLimit('');
        }}
        title="Update Daily Limit"
        size="medium"
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalSubtitle}>
            Set your personal daily caffeine limit. The FDA recommends no more than 400mg per day for healthy adults.
          </Text>
          
          <Input
            label="Daily Limit (mg)"
            value={newLimit}
            onChangeText={setNewLimit}
            placeholder="400"
            keyboardType="numeric"
            style={{ marginBottom: theme.spacing.lg }}
          />
          
          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              onPress={() => {
                setShowLimitModal(false);
                setNewLimit('');
              }}
              variant="outline"
              size="medium"
              style={{ flex: 1, marginRight: theme.spacing.sm }}
            />
            <Button
              title="Update"
              onPress={handleUpdateLimit}
              variant="primary"
              size="medium"
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  userCard: {
    marginBottom: theme.spacing.lg,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  userSince: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  settingValue: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
  statsCard: {
    marginBottom: theme.spacing.lg,
  },
  statsTitle: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  statsGrid: {
    gap: theme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  additionalStatsCard: {
    marginBottom: theme.spacing.lg,
  },
  cardTitle: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
  },
  journeyStats: {
    gap: theme.spacing.md,
  },
  journeyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  journeyLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  journeyValue: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  actionsContainer: {
    marginTop: theme.spacing.md,
  },
  signOutButton: {
    borderColor: theme.colors.error,
  },
  modalContent: {
    flex: 1,
  },
  modalSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
}); 