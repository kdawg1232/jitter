import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { NotificationService } from '../NotificationService';

export class DailyReminderNotification {
  private static readonly DAILY_REMINDER_ID_KEY = 'daily_data_reminder_id';
  private static readonly REMINDER_HOUR = 6; // 6:00 AM
  private static readonly REMINDER_MINUTE = 0;

  /**
   * Schedule a repeating daily reminder at 6:00 AM local time for daily data entry
   */
  static async schedule(): Promise<string | null> {
    try {
      // Avoid scheduling multiple times – check if already scheduled
      const existingId = await AsyncStorage.getItem(this.DAILY_REMINDER_ID_KEY);
      if (existingId) {
        console.log('[DailyReminderNotification] ⏰ Already scheduled:', existingId);
        return existingId;
      }

      // Ensure notification permissions are granted
      const enabled = await NotificationService.areNotificationsEnabled();
      if (!enabled) {
        console.log('[DailyReminderNotification] ⚠️ Notifications not enabled – skipping');
        return null;
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Daily Jitter check-in',
          body: 'Please update your sleep, stress, meal and exercise data for today.',
          data: { type: 'daily_check_in' },
        },
        trigger: {
          hour: this.REMINDER_HOUR,
          minute: this.REMINDER_MINUTE,
          repeats: true,
        } as any,
      });

      await AsyncStorage.setItem(this.DAILY_REMINDER_ID_KEY, identifier);
      console.log('[DailyReminderNotification] ✅ Scheduled:', identifier);
      return identifier;
    } catch (error) {
      console.error('[DailyReminderNotification] ❌ Failed to schedule:', error);
      return null;
    }
  }

  /**
   * Cancel the daily reminder
   */
  static async cancel(): Promise<void> {
    try {
      const existingId = await AsyncStorage.getItem(this.DAILY_REMINDER_ID_KEY);
      if (existingId) {
        await Notifications.cancelScheduledNotificationAsync(existingId);
        await AsyncStorage.removeItem(this.DAILY_REMINDER_ID_KEY);
        console.log('[DailyReminderNotification] ✅ Cancelled:', existingId);
      } else {
        console.log('[DailyReminderNotification] ⚠️ No scheduled reminder to cancel');
      }
    } catch (error) {
      console.error('[DailyReminderNotification] ❌ Failed to cancel:', error);
    }
  }

  /**
   * Send immediate daily reset notification
   */
  static async sendDailyResetNotification(): Promise<boolean> {
    try {
      const enabled = await NotificationService.areNotificationsEnabled();
      if (!enabled) {
        console.log('[DailyReminderNotification] ⚠️ Notifications disabled');
        return false;
      }

      const success = await NotificationService.scheduleLocalNotification(
        'Daily Jitter check-in',
        'Please update your sleep, stress, meal and exercise data for today.',
        { type: 'daily_check_in' }
      );

      if (success) {
        console.log('[DailyReminderNotification] ✅ Daily reset notification sent');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[DailyReminderNotification] ❌ Failed to send daily reset notification:', error);
      return false;
    }
  }

  /**
   * Check if daily reminder is currently scheduled
   */
  static async isScheduled(): Promise<boolean> {
    try {
      const existingId = await AsyncStorage.getItem(this.DAILY_REMINDER_ID_KEY);
      return !!existingId;
    } catch (error) {
      console.error('[DailyReminderNotification] ❌ Error checking schedule status:', error);
      return false;
    }
  }

  /**
   * Get reminder configuration
   */
  static getConfig() {
    return {
      hour: this.REMINDER_HOUR,
      minute: this.REMINDER_MINUTE,
      title: 'Daily Jitter check-in',
      body: 'Please update your sleep, stress, meal and exercise data for today.'
    };
  }
} 