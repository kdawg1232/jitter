import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Animated,
} from 'react-native';
import { theme } from '../constants/theme';

export interface ProgressBarProps {
  current: number;
  max: number;
  color?: string;
  backgroundColor?: string;
  height?: number;
  borderRadius?: number;
  showLabel?: boolean;
  showPercentage?: boolean;
  labelStyle?: ViewStyle;
  animated?: boolean;
  animationDuration?: number;
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  max,
  color = theme.colors.primary,
  backgroundColor = theme.colors.border,
  height = 8,
  borderRadius = 4,
  showLabel = false,
  showPercentage = false,
  labelStyle,
  animated = true,
  animationDuration = 1000,
  style,
}) => {
  const animatedWidth = React.useRef(new Animated.Value(0)).current;
  
  const percentage = Math.min((current / max) * 100, 100);
  const targetWidth = percentage;

  useEffect(() => {
    if (animated) {
      Animated.timing(animatedWidth, {
        toValue: targetWidth,
        duration: animationDuration,
        useNativeDriver: false,
      }).start();
    } else {
      animatedWidth.setValue(targetWidth);
    }
  }, [targetWidth, animated, animationDuration]);

  const formatValue = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toString();
  };

  const getProgressColor = () => {
    if (percentage >= 100) {
      return '#FF4444'; // Red when over limit
    } else if (percentage >= 80) {
      return '#FFA500'; // Orange when approaching limit
    }
    return color; // Default color
  };

  return (
    <View style={[styles.container, style]}>
      {(showLabel || showPercentage) && (
        <View style={[styles.labelContainer, labelStyle]}>
          {showLabel && (
            <Text style={styles.label}>
              {formatValue(current)} / {formatValue(max)}
            </Text>
          )}
          {showPercentage && (
            <Text style={styles.percentage}>
              {Math.round(percentage)}%
            </Text>
          )}
        </View>
      )}
      
      <View
        style={[
          styles.progressContainer,
          {
            height,
            borderRadius,
            backgroundColor,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
              height,
              borderRadius,
              backgroundColor: getProgressColor(),
            },
          ]}
        />
        
        {/* Overflow indicator when over 100% */}
        {percentage > 100 && (
          <View
            style={[
              styles.overflowIndicator,
              {
                height,
                borderRadius,
              },
            ]}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  label: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  percentage: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  overflowIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 4,
    backgroundColor: '#FF4444',
    opacity: 0.8,
  },
}); 