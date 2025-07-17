import React, { useState } from 'react';
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

interface StatsScreenProps {
  // Add navigation props later if needed
}

// Mock data for demonstration
const mockCaffeineData: { [key: string]: number } = {
  '2024-01-01': 120,
  '2024-01-02': 200,
  '2024-01-03': 350,
  '2024-01-04': 80,
  '2024-01-05': 420,
  '2024-01-06': 150,
  '2024-01-07': 280,
  '2024-01-08': 95,
  '2024-01-09': 310,
  '2024-01-10': 180,
  '2024-01-11': 240,
  '2024-01-12': 50,
  '2024-01-13': 160,
  '2024-01-14': 390,
  '2024-01-15': 125,
};

const screenWidth = Dimensions.get('window').width;
const calendarPadding = Theme.spacing.lg * 2;
const daySpacing = 10; // Slightly increased spacing between day cells
const dayWidth = (screenWidth - calendarPadding - (6 * daySpacing)) / 7; // 6 gaps between 7 days
const dayHeight = dayWidth * 1.6; // Make rectangles significantly taller

export const StatsScreen: React.FC<StatsScreenProps> = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getCaffeineColor = (caffeine: number): string => {
    if (caffeine === 0) return Theme.colors.cardBg;
    if (caffeine <= 150) return Theme.colors.pastelGreen;
    if (caffeine <= 300) return Theme.colors.accentOrange;
    return Theme.colors.accentRed;
  };

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateKey = (year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const totalCells = Math.ceil((daysInMonth + firstDay) / 7) * 7;
    const days = [];

    for (let i = 0; i < totalCells; i++) {
      const day = i - firstDay + 1;
      const isValidDay = day >= 1 && day <= daysInMonth;
      
      if (isValidDay) {
        const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day);
        const caffeineLevel = mockCaffeineData[dateKey] || 0;
        const backgroundColor = getCaffeineColor(caffeineLevel);

        days.push(
          <View
            key={day}
            style={[
              styles.dayCell,
              { backgroundColor }
            ]}
          >
            <Text style={styles.dayText}>{day}</Text>
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

  const calculateMonthlySummary = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(currentDate);
    
    let totalCaffeine = 0;
    let daysWithData = 0;
    let worstDay = { day: 0, amount: 0 };
    let streakCount = 0;
    let currentStreak = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(year, month, day);
      const caffeineLevel = mockCaffeineData[dateKey];
      
      if (caffeineLevel !== undefined) {
        totalCaffeine += caffeineLevel;
        daysWithData++;
        
        if (caffeineLevel > worstDay.amount) {
          worstDay = { day, amount: caffeineLevel };
        }

        if (caffeineLevel < 400) {
          currentStreak++;
        } else {
          if (currentStreak > streakCount) {
            streakCount = currentStreak;
          }
          currentStreak = 0;
        }
      }
    }

    // Update streak count if the month ended with a streak
    if (currentStreak > streakCount) {
      streakCount = currentStreak;
    }

    const averageCaffeine = daysWithData > 0 ? Math.round(totalCaffeine / daysWithData) : 0;

    return {
      total: totalCaffeine,
      average: averageCaffeine,
      worstDay: worstDay.day > 0 ? `${monthNames[month].slice(0, 3)} ${worstDay.day}` : 'None',
      streakCount
    };
  };

  const summary = calculateMonthlySummary();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Calendar Header */}
          <Text style={styles.title}>jitter calendar</Text>
          
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

          {/* Monthly Summary */}
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>monthly jitter summary</Text>
            
            <View style={styles.summaryGrid}>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>total caffeine</Text>
                <Text style={styles.summaryValue}>{summary.total}mg</Text>
              </View>
              
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>average daily caffeine</Text>
                <Text style={styles.summaryValue}>{summary.average}mg</Text>
              </View>
              
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>worst day</Text>
                <Text style={styles.summaryValue}>{summary.worstDay}</Text>
              </View>
              
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>under 400 mg streak</Text>
                <Text style={styles.summaryValue}>{summary.streakCount} days</Text>
              </View>
            </View>
          </View>
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
    justifyContent: 'flex-start',
    paddingTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.sm,
  },
  emptyDay: {
    backgroundColor: 'transparent',
  },
  dayText: {
    ...Theme.fonts.body,
    color: Theme.colors.textPrimary,
    fontWeight: '500',
  },
  summarySection: {
    flex: 1,
  },
  summaryTitle: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
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
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryLabel: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  summaryValue: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
  },
}); 