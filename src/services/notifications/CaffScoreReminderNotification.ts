import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { NotificationService } from '../NotificationService';

export class CaffScoreReminderNotification {
  private static readonly MORNING_REMINDER_ID_KEY = 'caffeine_score_morning_reminder_id';
  private static readonly AFTERNOON_REMINDER_ID_KEY = 'caffeine_score_afternoon_reminder_id';
  private static readonly MORNING_HOUR = 10; // 10:00 AM
  private static readonly AFTERNOON_HOUR = 16; // 4:00 PM
  private static readonly REMINDER_MINUTE = 0;

  /**
   * Schedule both morning (10 AM) and afternoon (4 PM) CaffScore reminders
   */
  static async schedule(): Promise<{ morning: string | null; afternoon: string | null }> {
    try {
      const morningId = await this.scheduleMorningReminder();
      const afternoonId = await this.scheduleAfternoonReminder();
      
      return { morning: morningId, afternoon: afternoonId };
    } catch (error) {
      console.error('[CaffScoreReminderNotification] ❌ Failed to schedule reminders:', error);
      return { morning: null, afternoon: null };
    }
  }

  /**
   * Schedule morning reminder at 10:00 AM
   */
  private static async scheduleMorningReminder(): Promise<string | null> {
    try {
      // Check if already scheduled
      const existingId = await AsyncStorage.getItem(this.MORNING_REMINDER_ID_KEY);
      if (existingId) {
        console.log('[CaffScoreReminderNotification] ⏰ Morning reminder already scheduled:', existingId);
        return existingId;
      }

      // Ensure notification permissions are granted
      const enabled = await NotificationService.areNotificationsEnabled();
      if (!enabled) {
        console.log('[CaffScoreReminderNotification] ⚠️ Notifications not enabled – skipping morning reminder');
        return null;
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Time to check your CaffScore! ☕',
          body: 'Check your focus levels and record any caffeine you\'ve had to optimize your daily performance.',
          data: { type: 'caffeine_score_reminder', time: 'morning' },
        },
        trigger: {
          hour: this.MORNING_HOUR,
          minute: this.REMINDER_MINUTE,
          repeats: true,
        } as any,
      });

      await AsyncStorage.setItem(this.MORNING_REMINDER_ID_KEY, identifier);
      console.log('[CaffScoreReminderNotification] ✅ Morning reminder scheduled:', identifier);
      return identifier;
    } catch (error) {
      console.error('[CaffScoreReminderNotification] ❌ Failed to schedule morning reminder:', error);
      return null;
    }
  }

  /**
   * Schedule afternoon reminder at 4:00 PM
   */
  private static async scheduleAfternoonReminder(): Promise<string | null> {
    try {
      // Check if already scheduled
      const existingId = await AsyncStorage.getItem(this.AFTERNOON_REMINDER_ID_KEY);
      if (existingId) {
        console.log('[CaffScoreReminderNotification] ⏰ Afternoon reminder already scheduled:', existingId);
        return existingId;
      }

      // Ensure notification permissions are granted
      const enabled = await NotificationService.areNotificationsEnabled();
      if (!enabled) {
        console.log('[CaffScoreReminderNotification] ⚠️ Notifications not enabled – skipping afternoon reminder');
        return null;
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Afternoon CaffScore check! ⚡',
          body: 'How are your focus levels? Record your caffeine intake to see how it affects your performance.',
          data: { type: 'caffeine_score_reminder', time: 'afternoon' },
        },
        trigger: {
          hour: this.AFTERNOON_HOUR,
          minute: this.REMINDER_MINUTE,
          repeats: true,
        } as any,
      });

      await AsyncStorage.setItem(this.AFTERNOON_REMINDER_ID_KEY, identifier);
      console.log('[CaffScoreReminderNotification] ✅ Afternoon reminder scheduled:', identifier);
      return identifier;
    } catch (error) {
      console.error('[CaffScoreReminderNotification] ❌ Failed to schedule afternoon reminder:', error);
      return null;
    }
  }

  /**
   * Cancel both morning and afternoon reminders
   */
  static async cancel(): Promise<void> {
    try {
      await this.cancelMorningReminder();
      await this.cancelAfternoonReminder();
      console.log('[CaffScoreReminderNotification] ✅ All reminders cancelled');
    } catch (error) {
      console.error('[CaffScoreReminderNotification] ❌ Failed to cancel reminders:', error);
    }
  }

  /**
   * Cancel morning reminder
   */
  private static async cancelMorningReminder(): Promise<void> {
    try {
      const existingId = await AsyncStorage.getItem(this.MORNING_REMINDER_ID_KEY);
      if (existingId) {
        await Notifications.cancelScheduledNotificationAsync(existingId);
        await AsyncStorage.removeItem(this.MORNING_REMINDER_ID_KEY);
        console.log('[CaffScoreReminderNotification] ✅ Morning reminder cancelled:', existingId);
      }
    } catch (error) {
      console.error('[CaffScoreReminderNotification] ❌ Failed to cancel morning reminder:', error);
    }
  }

  /**
   * Cancel afternoon reminder
   */
  private static async cancelAfternoonReminder(): Promise<void> {
    try {
      const existingId = await AsyncStorage.getItem(this.AFTERNOON_REMINDER_ID_KEY);
      if (existingId) {
        await Notifications.cancelScheduledNotificationAsync(existingId);
        await AsyncStorage.removeItem(this.AFTERNOON_REMINDER_ID_KEY);
        console.log('[CaffScoreReminderNotification] ✅ Afternoon reminder cancelled:', existingId);
      }
    } catch (error) {
      console.error('[CaffScoreReminderNotification] ❌ Failed to cancel afternoon reminder:', error);
    }
  }

  /**
   * Send immediate CaffScore reminder notification
   */
  static async sendImmediateReminder(): Promise<boolean> {
    try {
      const enabled = await NotificationService.areNotificationsEnabled();
      if (!enabled) {
        console.log('[CaffScoreReminderNotification] ⚠️ Notifications disabled');
        return false;
      }

      const success = await NotificationService.scheduleLocalNotification(
        'Check your CaffScore! ☕',
        'See how caffeine affects your focus levels and record your intake.',
        { type: 'caffeine_score_reminder', time: 'immediate' }
      );

      if (success) {
        console.log('[CaffScoreReminderNotification] ✅ Immediate reminder sent');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[CaffScoreReminderNotification] ❌ Failed to send immediate reminder:', error);
      return false;
    }
  }

  /**
   * Check if reminders are currently scheduled
   */
  static async isScheduled(): Promise<{ morning: boolean; afternoon: boolean }> {
    try {
      const morningId = await AsyncStorage.getItem(this.MORNING_REMINDER_ID_KEY);
      const afternoonId = await AsyncStorage.getItem(this.AFTERNOON_REMINDER_ID_KEY);
      
      return {
        morning: !!morningId,
        afternoon: !!afternoonId
      };
    } catch (error) {
      console.error('[CaffScoreReminderNotification] ❌ Error checking schedule status:', error);
      return { morning: false, afternoon: false };
    }
  }

  /**
   * Get reminder configuration
   */
  static getConfig() {
    return {
      morning: {
        hour: this.MORNING_HOUR,
        minute: this.REMINDER_MINUTE,
        title: 'Time to check your CaffScore! ☕',
        body: 'Check your focus levels and record any caffeine you\'ve had to optimize your daily performance.'
      },
      afternoon: {
        hour: this.AFTERNOON_HOUR,
        minute: this.REMINDER_MINUTE,
        title: 'Afternoon CaffScore check! ⚡',
        body: 'How are your focus levels? Record your caffeine intake to see how it affects your performance.'
      }
    };
  }
} 