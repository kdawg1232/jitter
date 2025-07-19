import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity
} from 'react-native';
import { Theme } from '../theme/colors';
import { 
  CaffeineCurvePoint, 
  FocusSession, 
  CaffeineRecommendation 
} from '../types';

const { width } = Dimensions.get('window');
const MAX_HEIGHT = 150; // Timeline height constant

interface CaffeineTimelineProps {
  caffeineCurve: CaffeineCurvePoint[];
  focusSessions: FocusSession[];
  recommendations: CaffeineRecommendation[];
  bedtime: Date;
  latestSafeCaffeineTime: Date;
  onRecommendationPress?: (recommendation: CaffeineRecommendation) => void;
}

export const CaffeineTimeline: React.FC<CaffeineTimelineProps> = ({
  caffeineCurve,
  focusSessions,
  recommendations,
  bedtime,
  latestSafeCaffeineTime,
  onRecommendationPress
}) => {
  const TIMELINE_WIDTH = width * 2; // Make it scrollable

  // Find max caffeine level for scaling
  const maxCaffeineLevel = Math.max(
    ...(caffeineCurve.length > 0 ? caffeineCurve.map(point => point.projectedLevel) : []),
    200 // Minimum scale
  );

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getZoneColor = (zone: CaffeineCurvePoint['zone']): string => {
    switch (zone) {
      case 'low': return Theme.colors.textTertiary;
      case 'building': return Theme.colors.accentOrange;
      case 'peak': return Theme.colors.primaryGreen;
      case 'stable': return Theme.colors.primaryBlue;
      case 'declining': return Theme.colors.accentOrange;
      case 'crash': return Theme.colors.accentRed;
      default: return Theme.colors.textTertiary;
    }
  };

  const getRecommendationStatus = (rec: CaffeineRecommendation): string => {
    switch (rec.status) {
      case 'pending': return Theme.colors.primaryBlue;
      case 'consumed': return Theme.colors.primaryGreen;
      case 'skipped': return Theme.colors.textTertiary;
      case 'adjusted': return Theme.colors.accentOrange;
      default: return Theme.colors.textTertiary;
    }
  };

  const getTimelinePosition = (time: Date): number => {
    const startOfDay = new Date(time);
    startOfDay.setHours(0, 0, 0, 0);
    
    const hoursFromStart = (time.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
    return (hoursFromStart / 24) * TIMELINE_WIDTH;
  };

  const getCaffeineHeight = (level: number): number => {
    return (level / maxCaffeineLevel) * MAX_HEIGHT;
  };

  // Generate hour markers
  const hourMarkers = Array.from({ length: 25 }, (_, i) => {
    const hour = new Date();
    hour.setHours(i, 0, 0, 0);
    return hour;
  });

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={[styles.timeline, { width: TIMELINE_WIDTH }]}>
          {/* Hour grid lines */}
          {hourMarkers.map((hour, index) => (
            <View
              key={index}
              style={[
                styles.gridLine,
                { left: getTimelinePosition(hour) }
              ]}
            >
              <Text style={styles.hourLabel}>
                {formatTime(hour)}
              </Text>
            </View>
          ))}

          {/* Sleep window background */}
          <View
            style={[
              styles.sleepWindow,
              {
                left: getTimelinePosition(latestSafeCaffeineTime),
                width: getTimelinePosition(bedtime) - getTimelinePosition(latestSafeCaffeineTime)
              }
            ]}
          />

          {/* Caffeine curve */}
          <View style={styles.curveContainer}>
            {caffeineCurve.map((point, index) => {
              if (index === 0) return null;
              
              const previousPoint = caffeineCurve[index - 1];
              const x1 = getTimelinePosition(previousPoint.time);
              const x2 = getTimelinePosition(point.time);
              const y1 = MAX_HEIGHT - getCaffeineHeight(previousPoint.projectedLevel);
              const y2 = MAX_HEIGHT - getCaffeineHeight(point.projectedLevel);
              
              return (
                <View
                  key={index}
                  style={[
                    styles.curveLine,
                    {
                      left: x1,
                      top: Math.min(y1, y2),
                      width: x2 - x1,
                      height: Math.abs(y2 - y1) + 2,
                      backgroundColor: getZoneColor(point.zone)
                    }
                  ]}
                />
              );
            })}
            
            {/* Caffeine level points */}
            {caffeineCurve.map((point, index) => (
              <View
                key={`point-${index}`}
                style={[
                  styles.curvePoint,
                  {
                    left: getTimelinePosition(point.time) - 3,
                    top: MAX_HEIGHT - getCaffeineHeight(point.projectedLevel) - 3,
                    backgroundColor: getZoneColor(point.zone)
                  }
                ]}
              />
            ))}
          </View>

          {/* Focus sessions */}
          {focusSessions.map((session) => (
            <View
              key={session.id}
              style={[
                styles.focusSession,
                {
                  left: getTimelinePosition(session.startTime),
                  width: getTimelinePosition(session.endTime) - getTimelinePosition(session.startTime)
                }
              ]}
            >
              <View style={[
                styles.sessionBar,
                { backgroundColor: session.importance === 3 ? Theme.colors.accentRed : 
                                  session.importance === 2 ? Theme.colors.accentOrange : 
                                  Theme.colors.primaryBlue }
              ]} />
              <Text style={styles.sessionLabel} numberOfLines={1}>
                {session.name}
              </Text>
            </View>
          ))}

          {/* Caffeine recommendations */}
          {recommendations.map((rec) => (
            <TouchableOpacity
              key={rec.id}
              style={[
                styles.recommendation,
                {
                  left: getTimelinePosition(rec.recommendedTime) - 10,
                  backgroundColor: getRecommendationStatus(rec)
                }
              ]}
              onPress={() => onRecommendationPress?.(rec)}
            >
              <Text style={styles.recommendationText}>
                {rec.doseMg}mg
              </Text>
            </TouchableOpacity>
          ))}

          {/* Current time indicator */}
          <View
            style={[
              styles.currentTimeIndicator,
              { left: getTimelinePosition(new Date()) }
            ]}
          >
            <View style={styles.currentTimeLine} />
            <Text style={styles.currentTimeLabel}>now</Text>
          </View>

          {/* Bedtime indicator */}
          <View
            style={[
              styles.bedtimeIndicator,
              { left: getTimelinePosition(bedtime) }
            ]}
          >
            <View style={styles.bedtimeLine} />
            <Text style={styles.bedtimeLabel}>🌙 sleep</Text>
          </View>
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Theme.colors.primaryGreen }]} />
            <Text style={styles.legendText}>Peak</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Theme.colors.accentOrange }]} />
            <Text style={styles.legendText}>Building/Declining</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Theme.colors.accentRed }]} />
            <Text style={styles.legendText}>Crash Risk</Text>
          </View>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBar, { backgroundColor: Theme.colors.primaryBlue }]} />
            <Text style={styles.legendText}>Focus Session</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBar, { backgroundColor: Theme.colors.pastelGreen, opacity: 0.3 }]} />
            <Text style={styles.legendText}>Sleep Window</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.cardBg,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: Theme.colors.cardStroke,
    overflow: 'hidden',
  },
  scrollView: {
    height: MAX_HEIGHT + 80, // Extra space for labels
  },
  timeline: {
    height: MAX_HEIGHT + 60,
    position: 'relative',
    backgroundColor: Theme.colors.white,
  },
  gridLine: {
    position: 'absolute',
    top: 0,
    bottom: 20,
    width: 1,
    backgroundColor: Theme.colors.divider,
  },
  hourLabel: {
    position: 'absolute',
    bottom: 0,
    left: -15,
    ...Theme.fonts.caption,
    color: Theme.colors.textTertiary,
    fontSize: 10,
    width: 30,
    textAlign: 'center',
  },
  sleepWindow: {
    position: 'absolute',
    top: 0,
    bottom: 20,
    backgroundColor: Theme.colors.pastelGreen,
    opacity: 0.3,
  },
  curveContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: MAX_HEIGHT,
  },
  curveLine: {
    position: 'absolute',
    minHeight: 1,
    opacity: 0.6,
  },
  curvePoint: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: Theme.colors.white,
  },
  focusSession: {
    position: 'absolute',
    top: MAX_HEIGHT + 5,
    height: 20,
    borderRadius: 2,
    overflow: 'hidden',
  },
  sessionBar: {
    height: 4,
    width: '100%',
  },
  sessionLabel: {
    ...Theme.fonts.caption,
    color: Theme.colors.textPrimary,
    fontSize: 9,
    marginTop: 2,
    paddingHorizontal: 2,
  },
  recommendation: {
    position: 'absolute',
    top: MAX_HEIGHT - 15,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.white,
  },
  recommendationText: {
    ...Theme.fonts.caption,
    color: Theme.colors.white,
    fontSize: 8,
    fontWeight: '600',
  },
  currentTimeIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  currentTimeLine: {
    width: 2,
    height: MAX_HEIGHT,
    backgroundColor: Theme.colors.accentRed,
  },
  currentTimeLabel: {
    ...Theme.fonts.caption,
    color: Theme.colors.accentRed,
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    marginLeft: -8,
  },
  bedtimeIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  bedtimeLine: {
    width: 2,
    height: MAX_HEIGHT,
    backgroundColor: Theme.colors.textSecondary,
    opacity: 0.8,
  },
  bedtimeLabel: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    fontSize: 9,
    marginTop: 2,
    marginLeft: -15,
  },
  legend: {
    padding: Theme.spacing.sm,
    backgroundColor: Theme.colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.divider,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Theme.spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Theme.spacing.xs,
  },
  legendBar: {
    width: 12,
    height: 4,
    borderRadius: 2,
    marginRight: Theme.spacing.xs,
  },
  legendText: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    fontSize: 9,
    flex: 1,
  },
}); 