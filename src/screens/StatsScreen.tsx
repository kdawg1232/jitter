import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components';
import { 
  useUserProfile, 
  useDailyStats, 
  useCaffeineMetabolism,
  useEntries 
} from '../hooks/useDatabase';
import { theme } from '../constants/theme';

type TimePeriod = 'Today' | 'Weekly' | 'Monthly';

const { width } = Dimensions.get('window');

export default function StatsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('Today');
  
  // Get today's date for filtering
  const today = new Date().toISOString().split('T')[0];
  
  // Database hooks
  const { profile } = useUserProfile();
  const { stats } = useDailyStats(today);
  const { metabolism } = useCaffeineMetabolism(24);
  const { entries } = useEntries(today);

  // Calculate crashout time (when caffeine level drops below 25mg)
  const calculateCrashoutTime = () => {
    const currentCaffeine = stats?.total_caffeine || 0;
    if (currentCaffeine <= 25) return 'Now clear!';
    
    // Rough calculation: 5.5 hour half-life
    const hoursToLow = Math.log(currentCaffeine / 25) / Math.log(2) * 5.5;
    const crashoutTime = new Date(Date.now() + hoursToLow * 60 * 60 * 1000);
    
    return crashoutTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Get current caffeine level
  const getCurrentCaffeineLevel = () => {
    if (metabolism.length === 0) return 0;
    return Math.round(metabolism[0]?.caffeine_level || 0);
  };

  // Simple chart component
  const SimpleChart = () => {
    if (metabolism.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons 
            name="analytics-outline" 
            size={48} 
            color={theme.colors.textSecondary} 
          />
          <Text style={styles.noDataText}>
            No caffeine data yet. Start tracking drinks to see your metabolism!
          </Text>
        </View>
      );
    }

    const chartWidth = width - 120;
    const chartHeight = 120;
    const maxCaffeine = Math.max(...metabolism.map(m => m.caffeine_level), 100);
    
    return (
      <View style={styles.chartWrapper}>
        <View style={styles.chartArea}>
          <View style={styles.yAxisLabels}>
            <Text style={styles.axisLabel}>{Math.round(maxCaffeine)}mg</Text>
            <Text style={styles.axisLabel}>{Math.round(maxCaffeine/2)}mg</Text>
            <Text style={styles.axisLabel}>0mg</Text>
          </View>
          <View style={[styles.chartContainer, { width: chartWidth, height: chartHeight }]}>
            <View style={styles.chartLine}>
              {metabolism.slice(0, 12).map((point, index) => {
                const x = (index / 11) * chartWidth;
                const y = chartHeight - (point.caffeine_level / maxCaffeine) * chartHeight;
                return (
                  <View
                    key={index}
                    style={[
                      styles.chartPoint,
                      {
                        left: x - 2,
                        top: y - 2,
                      }
                    ]}
                  />
                );
              })}
            </View>
          </View>
        </View>
        <View style={styles.xAxisLabels}>
          <Text style={styles.axisLabel}>12:00 PM</Text>
          <Text style={styles.axisLabel}>6:00 PM</Text>
          <Text style={styles.axisLabel}>12:00 AM</Text>
        </View>
      </View>
    );
  };

  // Time period stats (for now, all show today's data - can be enhanced later)
  const periodStats = {
    Today: stats,
    Weekly: stats, // TODO: Implement weekly aggregation
    Monthly: stats, // TODO: Implement monthly aggregation
  };

  const currentStats = periodStats[selectedPeriod];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Statistics</Text>
          
          {/* Time Period Tabs */}
          <View style={styles.tabContainer}>
            {(['Today', 'Weekly', 'Monthly'] as TimePeriod[]).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.tab,
                  selectedPeriod === period && styles.activeTab
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text style={[
                  styles.tabText,
                  selectedPeriod === period && styles.activeTabText
                ]}>
                  {period}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Nutritional Stats */}
          <Card variant="elevated" style={styles.statsCard}>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{currentStats?.total_sugar?.toFixed(0) || '0'} mg</Text>
                <Text style={styles.statLabel}>Sugar</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
                  {currentStats?.total_caffeine || 0} mg
                </Text>
                <Text style={styles.statLabel}>Caffeine</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{currentStats?.total_calories || 0}</Text>
                <Text style={styles.statLabel}>Calories</Text>
              </View>
            </View>
          </Card>

          {/* Caffeine in System */}
          <Card variant="default" style={styles.chartCard}>
            <Text style={styles.cardTitle}>Caffeine in System (approx)</Text>
            <Text style={styles.currentLevel}>
              Current: {getCurrentCaffeineLevel()}mg
            </Text>
            
            <SimpleChart />
          </Card>

          {/* Crashout Clock Preview */}
          <Card variant="default" style={styles.crashoutCard}>
            <View style={styles.crashoutHeader}>
              <Text style={styles.cardTitle}>Crashout Clock</Text>
              <TouchableOpacity style={styles.viewFullButton}>
                <Text style={styles.viewFullText}>View Full</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.crashoutContent}>
              <View style={styles.crashoutTime}>
                <Text style={styles.crashoutLabel}>Caffeine Clear by:</Text>
                <Text style={styles.crashoutValue}>{calculateCrashoutTime()}</Text>
              </View>
              
              <View style={styles.todaySpending}>
                <Text style={styles.spendingLabel}>Today's Spending:</Text>
                <Text style={styles.spendingValue}>
                  ${currentStats?.total_spent?.toFixed(2) || '0.00'}
                </Text>
              </View>
            </View>
          </Card>

          {/* Recent Activity */}
          {entries.length > 0 && (
            <Card variant="default" style={styles.activityCard}>
              <Text style={styles.cardTitle}>Recent Activity</Text>
              {entries.slice(0, 3).map((entry) => (
                <View key={entry.id} style={styles.activityItem}>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityDrink}>{entry.drink.name}</Text>
                    <Text style={styles.activityDetails}>
                      {entry.drink.caffeine_mg * entry.amount}mg caffeine
                    </Text>
                  </View>
                  <Text style={styles.activityTime}>
                    {new Date(entry.timestamp).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Text>
                </View>
              ))}
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
  title: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    marginBottom: theme.spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    ...theme.typography.subheading,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  activeTabText: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  statsCard: {
    marginBottom: theme.spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.sm,
  },
  chartCard: {
    marginBottom: theme.spacing.lg,
  },
  cardTitle: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  currentLevel: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: theme.spacing.md,
  },
  chartWrapper: {
    alignItems: 'center',
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yAxisLabels: {
    justifyContent: 'space-between',
    height: 120,
    marginRight: theme.spacing.sm,
  },
  chartContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chartLine: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  chartPoint: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: width - 120,
    marginTop: theme.spacing.sm,
  },
  axisLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 10,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
  },
  noDataText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    maxWidth: 250,
  },
  crashoutCard: {
    marginBottom: theme.spacing.lg,
  },
  crashoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  viewFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewFullText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontSize: 14,
    marginRight: theme.spacing.xs,
  },
  crashoutContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  crashoutTime: {
    flex: 1,
  },
  crashoutLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  crashoutValue: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
  todaySpending: {
    flex: 1,
    alignItems: 'flex-end',
  },
  spendingLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  spendingValue: {
    ...theme.typography.subheading,
    color: theme.colors.success,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
  activityCard: {
    marginBottom: theme.spacing.lg,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  activityInfo: {
    flex: 1,
  },
  activityDrink: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  activityDetails: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
  activityTime: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
}); 