import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationService } from '../NotificationService';

export class StatusUpdateNotification {
  private static readonly STATUS_KEY_PREFIX = 'status_';

  /**
   * Send status update notification if status has changed
   */
  static async checkAndSend(
    newStatusText: string,
    userId: string,
    currentStatusText?: string
  ): Promise<boolean> {
    try {
      // Get previous status if not provided
      if (!currentStatusText) {
        currentStatusText = (await AsyncStorage.getItem(`${this.STATUS_KEY_PREFIX}${userId}`)) || '';
      }

      // Check if status has actually changed
      if (!newStatusText || newStatusText === currentStatusText) {
        console.log('[StatusUpdateNotification] ✅ Status unchanged, no notification needed');
        return false;
      }

      // Check if notifications are enabled
      const notificationsEnabled = await NotificationService.areNotificationsEnabled();
      if (!notificationsEnabled) {
        console.log('[StatusUpdateNotification] ⚠️ Notifications disabled');
        return false;
      }

      // Send the status update notification
      console.log('[StatusUpdateNotification] 📨 Sending status update:', newStatusText);
      
      const success = await NotificationService.scheduleLocalNotification(
        newStatusText,
        newStatusText,
        { type: 'status_update' }
      );

      if (success) {
        // Store the new status
        await AsyncStorage.setItem(`${this.STATUS_KEY_PREFIX}${userId}`, newStatusText);
        console.log('[StatusUpdateNotification] ✅ Status update notification sent');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[StatusUpdateNotification] ❌ Error sending status notification:', error);
      return false;
    }
  }

  /**
   * Get the current stored status for a user
   */
  static async getCurrentStatus(userId: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(`${this.STATUS_KEY_PREFIX}${userId}`);
    } catch (error) {
      console.error('[StatusUpdateNotification] ❌ Error getting current status:', error);
      return null;
    }
  }

  /**
   * Update stored status without sending notification
   */
  static async updateStoredStatus(userId: string, statusText: string): Promise<void> {
    try {
      await AsyncStorage.setItem(`${this.STATUS_KEY_PREFIX}${userId}`, statusText);
      console.log('[StatusUpdateNotification] 💾 Status updated in storage:', statusText);
    } catch (error) {
      console.error('[StatusUpdateNotification] ❌ Error updating stored status:', error);
    }
  }

  /**
   * Clear stored status for a user
   */
  static async clearStoredStatus(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.STATUS_KEY_PREFIX}${userId}`);
      console.log('[StatusUpdateNotification] 🗑️ Status cleared for user:', userId);
    } catch (error) {
      console.error('[StatusUpdateNotification] ❌ Error clearing stored status:', error);
    }
  }

  /**
   * Get configuration info
   */
  static getConfig() {
    return {
      type: 'status_update',
      description: 'Notifications sent when caffeine status changes (rising, declining, etc.)'
    };
  }
} 