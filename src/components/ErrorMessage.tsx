import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

export interface ErrorMessageProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  retryText?: string;
  variant?: 'inline' | 'card' | 'banner';
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  title,
  onRetry,
  retryText = 'Try Again',
  variant = 'card',
  icon = 'alert-circle',
  style,
}) => {
  const containerStyles = [
    styles.container,
    styles[variant],
    style,
  ];

  return (
    <View style={containerStyles}>
      <View style={styles.content}>
        <Ionicons
          name={icon}
          size={variant === 'inline' ? 20 : 24}
          color="#FF4444"
          style={styles.icon}
        />
        
        <View style={styles.textContainer}>
          {title && (
            <Text style={[styles.title, styles[`${variant}Title`]]}>
              {title}
            </Text>
          )}
          <Text style={[styles.message, styles[`${variant}Message`]]}>
            {message}
          </Text>
        </View>
      </View>
      
      {onRetry && (
        <TouchableOpacity
          style={[styles.retryButton, styles[`${variant}RetryButton`]]}
          onPress={onRetry}
        >
          <Text style={[styles.retryText, styles[`${variant}RetryText`]]}>
            {retryText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  icon: {
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
    color: '#FF4444',
    marginBottom: theme.spacing.xs,
  },
  message: {
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  retryButton: {
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontWeight: '600',
  },
  
  // Inline variant
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: theme.borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#FF4444',
  },
  inlineTitle: {
    fontSize: 14,
  },
  inlineMessage: {
    fontSize: 13,
  },
  inlineRetryButton: {
    marginLeft: theme.spacing.sm,
    backgroundColor: '#FF4444',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  inlineRetryText: {
    color: theme.colors.surface,
    fontSize: 12,
  },
  
  // Card variant
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
  },
  cardMessage: {
    fontSize: 14,
  },
  cardRetryButton: {
    marginTop: theme.spacing.md,
    backgroundColor: '#FF4444',
    width: '100%',
  },
  cardRetryText: {
    color: theme.colors.surface,
    fontSize: 14,
  },
  
  // Banner variant
  banner: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  bannerTitle: {
    fontSize: 15,
  },
  bannerMessage: {
    fontSize: 13,
  },
  bannerRetryButton: {
    marginTop: theme.spacing.sm,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  bannerRetryText: {
    color: '#FF4444',
    fontSize: 13,
  },
}); 