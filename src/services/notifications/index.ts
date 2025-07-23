// Notification classes organized by type
export { CaffeineDeclineNotification } from './CaffeineDeclineNotification';
export { DailyReminderNotification } from './DailyReminderNotification';
export { StatusUpdateNotification } from './StatusUpdateNotification';
export { SetupNotification } from './SetupNotification';

// Type definitions for notification data
export interface NotificationConfig {
  type: string;
  title?: string;
  body?: string;
  data?: any;
}

// Centralized notification type constants
export const NOTIFICATION_TYPES = {
  CAFFEINE_DECLINE: 'caffeine_decline',
  DAILY_CHECK_IN: 'daily_check_in',
  STATUS_UPDATE: 'status_update',
  SETUP_COMPLETE: 'setup_complete',
  WIDGET_SETUP_COMPLETE: 'widget_setup_complete',
  WELCOME: 'welcome',
  FIRST_HIGH_SCORE: 'first_high_score'
} as const;

// Helper function to get all notification types
export function getAllNotificationTypes() {
  return [
    {
      category: 'Caffeine Tracking',
      notifications: [
        {
          type: NOTIFICATION_TYPES.CAFFEINE_DECLINE,
          name: 'Caffeine Decline',
          description: 'Suggests more caffeine when levels are declining'
        },
        {
          type: NOTIFICATION_TYPES.STATUS_UPDATE,
          name: 'Status Updates',
          description: 'Alerts when caffeine status changes'
        }
      ]
    },
    {
      category: 'Daily Reminders',
      notifications: [
        {
          type: NOTIFICATION_TYPES.DAILY_CHECK_IN,
          name: 'Daily Check-in',
          description: 'Reminder to log daily data (sleep, stress, etc.)'
        }
      ]
    },
    {
      category: 'Setup & Onboarding',
      notifications: [
        {
          type: NOTIFICATION_TYPES.SETUP_COMPLETE,
          name: 'Setup Complete',
          description: 'Confirmation when notifications are set up'
        },
        {
          type: NOTIFICATION_TYPES.WIDGET_SETUP_COMPLETE,
          name: 'Widget Setup',
          description: 'Confirmation when widget is configured'
        },
        {
          type: NOTIFICATION_TYPES.WELCOME,
          name: 'Welcome',
          description: 'Welcome message after onboarding'
        },
        {
          type: NOTIFICATION_TYPES.FIRST_HIGH_SCORE,
          name: 'First High Score',
          description: 'Celebration when reaching 80+ CaffScore'
        }
      ]
    }
  ];
} 