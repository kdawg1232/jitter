// Notification classes organized by type
export { DailyReminderNotification } from './DailyReminderNotification';
export { SetupNotification } from './SetupNotification';
export { CaffScoreReminderNotification } from './CaffScoreReminderNotification';

// Type definitions for notification data
export interface NotificationConfig {
  type: string;
  title?: string;
  body?: string;
  data?: any;
}

// Centralized notification type constants
export const NOTIFICATION_TYPES = {
  DAILY_CHECK_IN: 'daily_check_in',
  CAFFEINE_SCORE_REMINDER: 'caffeine_score_reminder',
  SETUP_COMPLETE: 'setup_complete',
  WIDGET_SETUP_COMPLETE: 'widget_setup_complete',
  WELCOME: 'welcome',
  FIRST_HIGH_SCORE: 'first_high_score'
} as const;

// Helper function to get all notification types
export function getAllNotificationTypes() {
  return [
    {
      category: 'CaffScore Tracking',
      notifications: [
        {
          type: NOTIFICATION_TYPES.CAFFEINE_SCORE_REMINDER,
          name: 'CaffScore Reminder',
          description: 'Reminds to check CaffScore and record caffeine at 10 AM and 4 PM'
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