import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Theme } from '../theme/colors';
import { StorageService, CaffScoreService } from '../services';
import { UserProfile, CalendarDayData, CalendarSummary, DayScoreRecord } from '../types';

interface StatsScreenProps {
  refreshTrigger?: number; // Trigger data refresh when this changes
}

const screenWidth = Dimensions.get('window').width;
const calendarPadding = Theme.spacing.lg * 2;
const daySpacing = 10; // Slightly increased spacing between day cells
const dayWidth = (screenWidth - calendarPadding - (6 * daySpacing)) / 7; // 6 gaps between 7 days
const dayHeight = dayWidth * 1.6; // Make rectangles significantly taller

export const StatsScreen: React.FC<StatsScreenProps> = ({ refreshTrigger }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarDayData[]>([]);
  const [summary, setSummary] = useState<CalendarSummary | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Load user profile on mount
  useEffect(() => {
    const loadAndRefresh = async () => {
      const profile = await StorageService.getUserProfile();
      if (profile) {
        setUserProfile(profile);
        console.log('📊 Initial load: profile loaded, loading calendar data');
        // Profile is set, now load calendar data with this profile
        setIsLoading(true);
        try {
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth();
          
          const [dayData, summaryData] = await Promise.all([
            StorageService.getCalendarDayData(profile.userId, year, month),
            StorageService.calculateCalendarSummary(profile.userId, year, month)
          ]);
          
          setCalendarData(dayData);
          setSummary(summaryData);
          
          console.log('📊 Initial calendar data loaded:', {
            totalCaffeine: summaryData.totalCaffeine,
            under400Streak: summaryData.under400Streak
          });
        } catch (error) {
          console.error('Error in initial calendar load:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadAndRefresh();
  }, []);

  // Load calendar data when month changes
  useEffect(() => {
    if (userProfile) {
      console.log('📊 Month changed, reloading calendar data');
      loadCalendarData();
    }
  }, [currentDate]);

  // Load calendar data when refresh is triggered (tab press)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0 && userProfile) {
      console.log('📊 Refresh triggered, reloading calendar data');
      loadCalendarData();
    }
  }, [refreshTrigger]);

  const loadUserProfile = async () => {
    try {
      const profile = await StorageService.getUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadCalendarData = async () => {
    try {
      setIsLoading(true);
      
      let currentProfile = userProfile;
      if (!currentProfile) {
        currentProfile = await StorageService.getUserProfile();
        if (!currentProfile) {
          setIsLoading(false);
          return;
        }
        setUserProfile(currentProfile);
      }

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      console.log('📅 Loading calendar data for:', {
        userId: currentProfile.userId,
        month: monthNames[month],
        year
      });
      
      // Load calendar day data and summary in parallel
      const [dayData, summaryData] = await Promise.all([
        StorageService.getCalendarDayData(currentProfile.userId, year, month),
        StorageService.calculateCalendarSummary(currentProfile.userId, year, month)
      ]);
      
      setCalendarData(dayData);
      setSummary(summaryData);
      
      console.log('📅 Calendar data loaded:', {
        month: monthNames[month],
        year,
        daysWithData: dayData.filter(day => day.hasData).length,
        totalCaffeine: summaryData.totalCaffeine,
        under400Streak: summaryData.under400Streak,
        averageDailyCaffeine: summaryData.averageDailyCaffeine
      });
      
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCaffeineColor = (caffeine: number): string => {
    if (caffeine === 0) return Theme.colors.cardBg;
    if (caffeine <= 150) return Theme.colors.pastelGreen;
    if (caffeine <= 300) return Theme.colors.accentOrange;
    return Theme.colors.accentRed;
  };

  const getScoreColor = (score: number): string => {
    // Score ranges from 0-100
    if (score >= 80) return Theme.colors.primaryGreen;  // Excellent
    if (score >= 60) return Theme.colors.accentOrange;  // Good
    if (score >= 40) return Theme.colors.accentRed;     // Poor
    return Theme.colors.cardStroke;  // Very poor
  };

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const renderDayContent = (dayData: CalendarDayData) => {
    if (dayData.isToday) {
      // Show only day number for today
      return <Text style={styles.dayText}>{dayData.dayNumber}</Text>;
    }
    
    if (!dayData.hasData) {
      // Show only day number if no data
      return <Text style={styles.dayText}>{dayData.dayNumber}</Text>;
    }
    
    // Show day number and peak score if available
    const score = dayData.averagePeakScore;
    
    return (
      <View style={styles.dayContent}>
        <Text style={styles.dayText}>{dayData.dayNumber}</Text>
        {score !== undefined && (
          <Text style={styles.scoreText}>{Math.round(score)}</Text>
        )}
      </View>
    );
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const totalCells = Math.ceil((daysInMonth + firstDay) / 7) * 7;
    const days = [];

    for (let i = 0; i < totalCells; i++) {
      const day = i - firstDay + 1;
      const isValidDay = day >= 1 && day <= daysInMonth;
      
      if (isValidDay) {
        const dayData = calendarData.find(d => d.dayNumber === day);
        
        if (!dayData) {
          // Fallback for missing data
          days.push(
            <View key={day} style={[styles.dayCell, { backgroundColor: Theme.colors.cardBg }]}>
              <Text style={styles.dayText}>{day}</Text>
            </View>
          );
          continue;
        }

        // Determine background color - use stored color if available, otherwise calculate
        let backgroundColor = Theme.colors.cardBg;
        
        if (dayData.hasData) {
          // Check if we have stored display color from DayScoreRecord
          if (dayData.displayColor) {
            backgroundColor = dayData.displayColor;
          } else {
            // Fall back to calculating color from current data
            const score = dayData.averagePeakScore;
            
            if (score !== undefined) {
              // Use score for color
              backgroundColor = getScoreColor(score);
            } else {
              // Use caffeine for color if no score
              backgroundColor = getCaffeineColor(dayData.totalCaffeine);
            }
          }
        }

        days.push(
          <View
            key={day}
            style={[
              styles.dayCell,
              { backgroundColor }
            ]}
          >
            {renderDayContent(dayData)}
          </View>
        );
      } else {
        days.push(
          <View key={`empty-${i}`} style={[styles.dayCell, styles.emptyDay]} />
        );
      }
    }

    return days;
  };

  // Auto-record daily scores for previous day when new day starts
  useEffect(() => {
    const recordYesterdaysScores = async () => {
      if (!userProfile) return;
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = yesterday.toISOString().split('T')[0];
      
      // Check if we already have scores for yesterday
      const existingScore = await StorageService.getDayScore(userProfile.userId, yesterdayKey);
      if (existingScore) return; // Already recorded
      
      try {
        // Get yesterday's drinks
        const yesterdayDrinks = await StorageService.getDrinksForDate(userProfile.userId, yesterdayKey);
        
        if (yesterdayDrinks.length === 0) return; // No drinks to calculate scores for
        
        // Calculate average scores for the day
        let totalPeakScore = 0;
        let scoreCount = 0;
        
        // Sample scores throughout the day (every 2 hours)
        for (let hour = 8; hour <= 22; hour += 2) {
          const sampleTime = new Date(yesterday);
          sampleTime.setHours(hour, 0, 0, 0);
          
          try {
            // Calculate CaffScore
            const focusResult = await CaffScoreService.calculateFocusScore(
              userProfile,
              yesterdayDrinks,
              sampleTime
            );
            
            totalPeakScore += focusResult.score;
            scoreCount++;
          } catch (error) {
            console.error('Error calculating scores for sample time:', error);
          }
        }
        
        if (scoreCount > 0) {
          const averagePeakScore = totalPeakScore / scoreCount;
          const totalCaffeine = yesterdayDrinks.reduce((sum, drink) => sum + drink.actualCaffeineConsumed, 0);
          
          // Calculate display color based on the score
          const displayColor = getScoreColor(averagePeakScore);
          
          const dayScore: DayScoreRecord = {
            userId: userProfile.userId,
            date: yesterdayKey,
            averagePeakScore,
            totalCaffeine,
            displayColor,
            createdAt: new Date()
          };
          
          await StorageService.addDayScore(dayScore);
          console.log('📊 Recorded daily scores for:', yesterdayKey, {
            averagePeakScore: Math.round(averagePeakScore),
            totalCaffeine
          });
          
          // Reload calendar data to show new scores
          loadCalendarData();
        }
      } catch (error) {
        console.error('Error recording daily scores:', error);
      }
    };
    
    recordYesterdaysScores();
  }, [userProfile]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading calendar...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Please complete your profile first</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Calendar Header */}
          <Text style={styles.title}>jitter calendar</Text>
          
          {/* Debug Refresh Button */}
          <TouchableOpacity 
            style={styles.debugButton}
            onPress={() => {
              console.log('🔄 Manual refresh triggered');
              loadCalendarData();
            }}
          >
            <Text style={styles.debugButtonText}>Refresh Data</Text>
          </TouchableOpacity>
          
          {/* Month Navigation */}
          <View style={styles.monthNavigation}>
            <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navButton}>
              <Text style={styles.navButtonText}>{'<'}</Text>
            </TouchableOpacity>
            
            <Text style={styles.monthText}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Text>
            
            <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navButton}>
              <Text style={styles.navButtonText}>{'>'}</Text>
            </TouchableOpacity>
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendar}>
            {/* Day Headers */}
            <View style={styles.dayHeaders}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <View key={index} style={styles.dayHeaderCell}>
                  <Text style={styles.dayHeaderText}>{day}</Text>
                </View>
              ))}
            </View>
            
            {/* Calendar Days */}
            <View style={styles.daysGrid}>
              {renderCalendarDays()}
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>
              Colors represent your daily CaffScore performance
            </Text>
          </View>

          {/* Monthly Summary */}
          {summary && (
            <View style={styles.summarySection}>
              <Text style={styles.summaryTitle}>monthly jitter summary</Text>
              
              <View style={styles.summaryGrid}>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>total caffeine</Text>
                  <Text style={styles.summaryValue}>{summary.totalCaffeine}mg</Text>
                </View>
                
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>average daily caffeine</Text>
                  <Text style={styles.summaryValue}>{summary.averageDailyCaffeine}mg</Text>
                </View>
                
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>worst day</Text>
                  <Text style={styles.summaryValue}>
                    {summary.worstDay ? `${monthNames[summary.month].slice(0, 3)} ${summary.worstDay.day}` : 'None'}
                  </Text>
                </View>
                
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>under 400 mg streak</Text>
                  <Text style={styles.summaryValue}>{summary.under400Streak} days</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.canvas,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl,
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
  title: {
    ...Theme.fonts.bigTitle,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
  },
  navButton: {
    padding: Theme.spacing.sm,
    minWidth: 40,
    alignItems: 'center',
  },
  navButtonText: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    fontSize: 20,
  },
  monthText: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    marginHorizontal: Theme.spacing.lg,
    minWidth: 180,
    textAlign: 'center',
  },
  calendar: {
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  dayHeaders: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.sm,
  },
  dayHeaderCell: {
    width: dayWidth,
    alignItems: 'center',
    paddingVertical: Theme.spacing.xs,
  },
  dayHeaderText: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCell: {
    width: dayWidth,
    height: dayHeight,
    borderRadius: Theme.borderRadius.small,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.sm,
  },
  clickableDay: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyDay: {
    backgroundColor: 'transparent',
  },
  dayContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    ...Theme.fonts.body,
    color: Theme.colors.textPrimary,
    fontWeight: '500',
  },
  scoreText: {
    ...Theme.fonts.caption,
    color: Theme.colors.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  instructionsContainer: {
    paddingHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  instructionsText: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  summarySection: {
    flex: 1,
  },
  summaryTitle: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.lg,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryBox: {
    width: '48%',
    backgroundColor: Theme.colors.cardBg,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.cardStroke,
  },
  summaryLabel: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
  },
  summaryValue: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    fontWeight: '700',
  },
  debugButton: {
    backgroundColor: Theme.colors.primaryBlue,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.medium,
    alignSelf: 'center',
    marginBottom: Theme.spacing.md,
  },
  debugButtonText: {
    ...Theme.fonts.body,
    color: Theme.colors.white,
    fontWeight: '600',
  },
}); 