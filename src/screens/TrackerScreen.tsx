import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { 
  Button, 
  Card, 
  ProgressBar, 
  Modal, 
  LoadingSpinner, 
  ErrorMessage 
} from '../components';
import { 
  useUserProfile, 
  useDrinks, 
  useEntries, 
  useDailyStats 
} from '../hooks/useDatabase';
import { theme } from '../constants/theme';
import type { Drink } from '../types/database';

export default function TrackerScreen() {
  const [showAddDrinkModal, setShowAddDrinkModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);
  const [drinkAmount, setDrinkAmount] = useState(1);

  // Get today's date
  const today = new Date().toISOString().split('T')[0];
  
  // Database hooks
  const { profile, loading: profileLoading } = useUserProfile();
  const { drinks, loading: drinksLoading } = useDrinks();
  const { entries, loading: entriesLoading, addEntry } = useEntries(today);
  const { stats, loading: statsLoading, refetch: refetchStats } = useDailyStats(today);

  // Get user's daily limit (default 400mg)
  const dailyLimit = profile?.daily_limit_mg || 400;
  const currentIntake = stats?.total_caffeine || 0;
  const currentDrinks = stats?.total_drinks || 0;

  // Calculate warning levels
  const warningLevel = currentIntake >= dailyLimit * 0.8 ? 'high' : 
                      currentIntake >= dailyLimit * 0.6 ? 'medium' : 'low';

  // Format current date and time
  const formatDateTime = () => {
    const now = new Date();
    const dateOptions: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const timeOptions: Intl.DateTimeFormatOptions = { 
      hour: '2-digit', 
      minute: '2-digit' 
    };
    
    return {
      date: now.toLocaleDateString('en-US', dateOptions),
      time: now.toLocaleTimeString('en-US', timeOptions)
    };
  };

  const { date, time } = formatDateTime();

  // Handle adding a drink entry
  const handleAddDrink = async () => {
    if (!selectedDrink || !profile) return;

    try {
      const { error } = await addEntry({
        user_id: profile.id,
        drink_id: selectedDrink.id,
        amount: drinkAmount,
        timestamp: new Date().toISOString(),
      });

      if (error) {
        Alert.alert('Error', 'Failed to add drink entry. Please try again.');
        return;
      }

      // Check if this puts user over their limit
      const newIntake = currentIntake + (selectedDrink.caffeine_mg * drinkAmount);
      if (newIntake > dailyLimit) {
        Alert.alert(
          'Daily Limit Exceeded! ⚠️',
          `You've exceeded your daily caffeine limit of ${dailyLimit}mg. Current intake: ${newIntake}mg`,
          [{ text: 'OK', style: 'default' }]
        );
      } else if (newIntake >= dailyLimit * 0.8) {
        Alert.alert(
          'Approaching Limit! ⚠️',
          `You're approaching your daily caffeine limit. Current: ${newIntake}mg / ${dailyLimit}mg`,
          [{ text: 'OK', style: 'default' }]
        );
      }

      // Reset and close modal
      setSelectedDrink(null);
      setDrinkAmount(1);
      setShowAddDrinkModal(false);
      refetchStats();
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  // Quick add a drink (1x serving)
  const quickAddDrink = async (drink: Drink) => {
    if (!profile) return;

    try {
      const { error } = await addEntry({
        user_id: profile.id,
        drink_id: drink.id,
        amount: 1,
        timestamp: new Date().toISOString(),
      });

      if (error) {
        Alert.alert('Error', 'Failed to add drink entry. Please try again.');
        return;
      }

      // Check if this puts user over their limit
      const newIntake = currentIntake + drink.caffeine_mg;
      if (newIntake > dailyLimit) {
        Alert.alert(
          'Daily Limit Exceeded! ⚠️',
          `You've exceeded your daily caffeine limit of ${dailyLimit}mg. Current intake: ${newIntake}mg`,
          [{ text: 'OK', style: 'default' }]
        );
      } else if (newIntake >= dailyLimit * 0.8) {
        Alert.alert(
          'Approaching Limit! ⚠️',
          `You're approaching your daily caffeine limit. Current: ${newIntake}mg / ${dailyLimit}mg`,
          [{ text: 'OK', style: 'default' }]
        );
      }

      refetchStats();
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  // Remove the most recent entry for a specific drink
  const removeDrinkEntry = async (drinkId: string) => {
    const lastEntry = entries.find(entry => entry.drink_id === drinkId);
    if (!lastEntry) return;

    // For now, just show an alert - delete functionality can be implemented later
    Alert.alert('Remove Entry', 'Entry removal will be available in a future update.');
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchStats();
    setRefreshing(false);
  };

  // Get recent entries for display
  const recentEntries = entries.slice(0, 5);

  const isLoading = profileLoading || drinksLoading || entriesLoading || statsLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner variant="overlay" text="Loading your data..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.content}>
          {/* Header with Date/Time */}
          <View style={styles.header}>
            <View>
              <Text style={styles.dateText}>{date}</Text>
              <Text style={styles.timeText}>{time}</Text>
            </View>
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={16} color={theme.colors.primary} />
              <Text style={styles.streakText}>Day {Math.floor(Math.random() * 7) + 1}</Text>
            </View>
          </View>

          {/* Daily Summary Badge */}
          <Card variant="elevated" style={styles.summaryCard}>
            <View style={styles.summaryContent}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{currentDrinks}</Text>
                <Text style={styles.summaryLabel}>Drinks Today</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNumber, { color: getWarningColor(warningLevel) }]}>
                  {currentIntake}mg
                </Text>
                <Text style={styles.summaryLabel}>Caffeine</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>${stats?.total_spent?.toFixed(2) || '0.00'}</Text>
                <Text style={styles.summaryLabel}>Spent</Text>
              </View>
            </View>
          </Card>

          {/* Progress Bar */}
          <Card variant="default" style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.cardTitle}>Daily Progress</Text>
              <Text style={styles.progressRatio}>
                {currentIntake}/{dailyLimit}mg
              </Text>
            </View>
            <ProgressBar
              current={currentIntake}
              max={dailyLimit}
              showLabel={false}
              showPercentage
              animated
              style={{ marginTop: theme.spacing.md }}
            />
            {warningLevel !== 'low' && (
              <View style={[styles.warningBanner, { backgroundColor: getWarningColor(warningLevel) + '20' }]}>
                <Ionicons 
                  name={warningLevel === 'high' ? 'warning' : 'alert-circle'} 
                  size={16} 
                  color={getWarningColor(warningLevel)} 
                />
                <Text style={[styles.warningText, { color: getWarningColor(warningLevel) }]}>
                  {warningLevel === 'high' 
                    ? 'High caffeine intake - consider reducing' 
                    : 'Moderate caffeine intake - monitor closely'}
                </Text>
              </View>
            )}
          </Card>

          {/* Quick Add Popular Drinks */}
          <Card variant="default" style={styles.quickAddCard}>
            <Text style={styles.cardTitle}>Quick Add</Text>
            <View style={styles.quickAddGrid}>
              {drinks.slice(0, 6).map((drink) => {
                const todayCount = entries.filter(entry => entry.drink_id === drink.id).length;
                return (
                  <View key={drink.id} style={styles.quickAddItem}>
                    <Text style={styles.quickAddName}>{drink.name}</Text>
                    <View style={styles.quickAddCounter}>
                      <TouchableOpacity
                        style={styles.quickAddButton}
                        onPress={() => removeDrinkEntry(drink.id)}
                        disabled={todayCount === 0}
                      >
                        <Ionicons 
                          name="remove" 
                          size={16} 
                          color={todayCount > 0 ? theme.colors.primary : theme.colors.textSecondary} 
                        />
                      </TouchableOpacity>
                      <Text style={styles.quickAddCount}>{todayCount}</Text>
                      <TouchableOpacity
                        style={styles.quickAddButton}
                        onPress={() => quickAddDrink(drink)}
                      >
                        <Ionicons name="add" size={16} color={theme.colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>

          {/* Recent Entries */}
          {recentEntries.length > 0 && (
            <Card variant="default" style={styles.entriesCard}>
              <Text style={styles.cardTitle}>Recent Drinks</Text>
              {recentEntries.slice(0, 3).map((entry) => (
                <View key={entry.id} style={styles.entryItem}>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryName}>{entry.drink.name}</Text>
                    <Text style={styles.entryDetails}>
                      {entry.drink.caffeine_mg * entry.amount}mg caffeine
                      {entry.amount !== 1 && ` (${entry.amount}x)`}
                    </Text>
                  </View>
                  <Text style={styles.entryTime}>
                    {new Date(entry.timestamp).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Text>
                </View>
              ))}
            </Card>
          )}

          {/* Add Drink Button */}
          <Button
            title="Add Drink"
            onPress={() => setShowAddDrinkModal(true)}
            variant="primary"
            size="large"
            fullWidth
            style={styles.addButton}
          />
        </View>
      </ScrollView>

      {/* Add Drink Modal */}
      <Modal
        visible={showAddDrinkModal}
        onClose={() => {
          setShowAddDrinkModal(false);
          setSelectedDrink(null);
          setDrinkAmount(1);
        }}
        title="Add Drink"
        size="large"
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalSubtitle}>Select a drink to add to your daily intake</Text>
          
          <ScrollView style={styles.drinkList} showsVerticalScrollIndicator={false}>
            {drinks.map((drink) => (
                             <TouchableOpacity
                 key={drink.id}
                 onPress={() => setSelectedDrink(drink)}
               >
                 <Card
                   variant={selectedDrink?.id === drink.id ? "elevated" : "outlined"}
                   style={selectedDrink?.id === drink.id ? 
                     { ...styles.drinkCard, ...styles.selectedDrinkCard } : 
                     styles.drinkCard
                   }
                 >
                <View style={styles.drinkInfo}>
                  <Text style={styles.drinkName}>{drink.name}</Text>
                  <Text style={styles.drinkBrand}>{drink.brand}</Text>
                  <View style={styles.drinkStats}>
                    <Text style={styles.drinkStat}>{drink.caffeine_mg}mg caffeine</Text>
                    <Text style={styles.drinkStat}>{drink.volume_ml}ml</Text>
                    {drink.price > 0 && (
                      <Text style={styles.drinkStat}>${drink.price.toFixed(2)}</Text>
                    )}
                  </View>
                                   </View>
                 </Card>
               </TouchableOpacity>
               ))}
           </ScrollView>

          {selectedDrink && (
            <View style={styles.modalActions}>
              <View style={styles.amountSelector}>
                <Text style={styles.amountLabel}>Amount:</Text>
                <View style={styles.amountControls}>
                  <Button
                    title="-"
                    onPress={() => setDrinkAmount(Math.max(0.5, drinkAmount - 0.5))}
                    variant="outline"
                    size="small"
                  />
                  <Text style={styles.amountValue}>{drinkAmount}x</Text>
                  <Button
                    title="+"
                    onPress={() => setDrinkAmount(drinkAmount + 0.5)}
                    variant="outline"
                    size="small"
                  />
                </View>
              </View>
              
              <Button
                title={`Add ${selectedDrink.name} (${selectedDrink.caffeine_mg * drinkAmount}mg)`}
                onPress={handleAddDrink}
                variant="primary"
                size="large"
                fullWidth
                style={{ marginTop: theme.spacing.md }}
              />
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Helper function to get warning colors
const getWarningColor = (level: 'low' | 'medium' | 'high') => {
  switch (level) {
    case 'high': return theme.colors.error;
    case 'medium': return theme.colors.warning;
    default: return theme.colors.success;
  }
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  dateText: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    fontSize: 20,
  },
  timeText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  streakText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryCard: {
    marginBottom: theme.spacing.lg,
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  summaryLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.sm,
  },
  progressCard: {
    marginBottom: theme.spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  progressRatio: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  warningText: {
    ...theme.typography.body,
    fontSize: 12,
    marginLeft: theme.spacing.xs,
    fontWeight: '500',
  },
  entriesCard: {
    marginBottom: theme.spacing.lg,
  },
  entryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  entryDetails: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
  entryTime: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  quickAddCard: {
    marginBottom: theme.spacing.lg,
  },
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  quickAddItem: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  quickAddName: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  quickAddCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  quickAddButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddCount: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  addButton: {
    marginTop: theme.spacing.md,
  },
  modalContent: {
    flex: 1,
  },
  modalSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  drinkList: {
    maxHeight: 300,
    marginBottom: theme.spacing.lg,
  },
  drinkCard: {
    marginBottom: theme.spacing.sm,
  },
  selectedDrinkCard: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  drinkInfo: {
    padding: theme.spacing.sm,
  },
  drinkName: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  drinkBrand: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
  drinkStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  drinkStat: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  modalActions: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  amountSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountLabel: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
  },
  amountControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountValue: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    marginHorizontal: theme.spacing.md,
    minWidth: 40,
    textAlign: 'center',
  },
}); 