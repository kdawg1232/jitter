import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

export interface DrinkCounterProps {
  count: number;
  onIncrement: () => void;
  onDecrement: () => void;
  label?: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'compact' | 'outlined';
  style?: ViewStyle;
}

export const DrinkCounter: React.FC<DrinkCounterProps> = ({
  count,
  onIncrement,
  onDecrement,
  label,
  unit = '',
  minValue = 0,
  maxValue = 99,
  disabled = false,
  size = 'medium',
  variant = 'default',
  style,
}) => {
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleIncrement = () => {
    if (!disabled && count < maxValue) {
      animatePress();
      onIncrement();
    }
  };

  const handleDecrement = () => {
    if (!disabled && count > minValue) {
      animatePress();
      onDecrement();
    }
  };

  const canIncrement = !disabled && count < maxValue;
  const canDecrement = !disabled && count > minValue;

  const containerStyles = [
    styles.container,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    style,
  ];

  const buttonStyles = [
    styles.button,
    styles[`${size}Button`],
  ];

  const countStyles = [
    styles.count,
    styles[`${size}Count`],
  ];

  if (variant === 'compact') {
    return (
      <Animated.View 
        style={[containerStyles, { transform: [{ scale: scaleValue }] }]}
      >
        <TouchableOpacity
          style={[buttonStyles, !canDecrement && styles.buttonDisabled]}
          onPress={handleDecrement}
          disabled={!canDecrement}
        >
          <Ionicons 
            name="remove" 
            size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
            color={canDecrement ? theme.colors.primary : theme.colors.textSecondary}
          />
        </TouchableOpacity>
        
        <View style={styles.countContainer}>
          <Text style={countStyles}>{count}{unit}</Text>
        </View>
        
        <TouchableOpacity
          style={[buttonStyles, !canIncrement && styles.buttonDisabled]}
          onPress={handleIncrement}
          disabled={!canIncrement}
        >
          <Ionicons 
            name="add" 
            size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
            color={canIncrement ? theme.colors.primary : theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <Text style={[styles.label, styles[`${size}Label`]]}>{label}</Text>
      )}
      
      <Animated.View 
        style={[containerStyles, { transform: [{ scale: scaleValue }] }]}
      >
        <TouchableOpacity
          style={[buttonStyles, !canDecrement && styles.buttonDisabled]}
          onPress={handleDecrement}
          disabled={!canDecrement}
        >
          <Ionicons 
            name="remove" 
            size={size === 'small' ? 18 : size === 'large' ? 28 : 24}
            color={canDecrement ? theme.colors.surface : theme.colors.textSecondary}
          />
        </TouchableOpacity>
        
        <View style={styles.countContainer}>
          <Text style={countStyles}>{count}</Text>
          {unit && <Text style={styles.unit}>{unit}</Text>}
        </View>
        
        <TouchableOpacity
          style={[buttonStyles, !canIncrement && styles.buttonDisabled]}
          onPress={handleIncrement}
          disabled={!canIncrement}
        >
          <Ionicons 
            name="add" 
            size={size === 'small' ? 18 : size === 'large' ? 28 : 24}
            color={canIncrement ? theme.colors.surface : theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
  },
  label: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  countContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  count: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
  },
  unit: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  button: {
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.5,
  },
  disabled: {
    opacity: 0.6,
  },
  
  // Variants
  default: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  compact: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  outlined: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
  },
  
  // Sizes
  small: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  medium: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  large: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  
  // Button sizes
  smallButton: {
    width: 28,
    height: 28,
  },
  mediumButton: {
    width: 36,
    height: 36,
  },
  largeButton: {
    width: 44,
    height: 44,
  },
  
  // Count sizes
  smallCount: {
    fontSize: 16,
    lineHeight: 20,
    marginHorizontal: theme.spacing.md,
  },
  mediumCount: {
    fontSize: 20,
    lineHeight: 24,
    marginHorizontal: theme.spacing.lg,
  },
  largeCount: {
    fontSize: 24,
    lineHeight: 28,
    marginHorizontal: theme.spacing.xl,
  },
  
  // Label sizes
  smallLabel: {
    fontSize: 12,
  },
  mediumLabel: {
    fontSize: 14,
  },
  largeLabel: {
    fontSize: 16,
  },
}); 