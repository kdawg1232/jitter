import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  ViewStyle,
} from 'react-native';
import { theme } from '../constants/theme';

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
  variant?: 'default' | 'overlay' | 'inline';
  style?: ViewStyle;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = theme.colors.primary,
  text,
  variant = 'default',
  style,
}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getSpinnerSize = () => {
    switch (size) {
      case 'small':
        return 'small';
      case 'large':
        return 'large';
      default:
        return 'small';
    }
  };

  const containerStyles = [
    styles.container,
    styles[variant],
    style,
  ];

  if (variant === 'overlay') {
    return (
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
          style,
        ]}
      >
        <Animated.View 
          style={[
            styles.overlayContent,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <ActivityIndicator size={getSpinnerSize()} color={color} />
          {text && <Text style={styles.overlayText}>{text}</Text>}
        </Animated.View>
      </Animated.View>
    );
  }

  return (
    <Animated.View 
      style={[
        containerStyles,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <ActivityIndicator size={getSpinnerSize()} color={color} />
      {text && (
        <Text style={[styles.text, styles[`${size}Text`]]}>{text}</Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  overlayContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  overlayText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  text: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  
  // Variants
  default: {
    padding: theme.spacing.lg,
  },
  inline: {
    flexDirection: 'row',
    padding: theme.spacing.sm,
  },
  
  // Text sizes
  smallText: {
    fontSize: 12,
    marginTop: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  mediumText: {
    fontSize: 14,
    marginTop: theme.spacing.sm,
  },
  largeText: {
    fontSize: 16,
    marginTop: theme.spacing.md,
  },
}); 