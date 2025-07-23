import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationService } from '../NotificationService';

export class CaffeineDeclineNotification {
  private static readonly NOTIFICATION_KEY_PREFIX = 'caffeine_decline_notification_';
  private static readonly DECLINE_THRESHOLD = 25; // Send notification when score drops to this level
  private static readonly MIN_DECLINE_AMOUNT = 5; // Must decline by at least this much
  private static readonly COOLDOWN_HOURS = 2; // Don't send another notification for 2 hours

  /**
   * Check if we should send a caffeine decline notification
   * Suggests user drink more caffeine when score is declining and hits threshold
   */
  static async checkAndSend(
    currentScore: number, 
    previousScore: number, 
    userId: string
  ): Promise<boolean> {
    try {
      // Check if score is declining and at threshold
      const scoreDifference = currentScore - previousScore;
      const isDeclined = scoreDifference < -this.MIN_DECLINE_AMOUNT;
      const atThreshold = currentScore <= this.DECLINE_THRESHOLD && currentScore > 0;
      
      if (!isDeclined || !atThreshold) {
        return false; // Conditions not met
      }
      
      // Check if notifications are enabled
      const notificationsEnabled = await NotificationService.areNotificationsEnabled();
      if (!notificationsEnabled) {
        console.log('[CaffeineDeclineNotification] ⚠️ Notifications disabled');
        return false;
      }
      
      // Check time restrictions (don't suggest caffeine late at night)
      const now = new Date();
      const currentHour = now.getHours();
      const tooLateForCaffeine = currentHour >= 20 || currentHour <= 5; // 8 PM to 5 AM
      
      if (tooLateForCaffeine) {
        console.log('[CaffeineDeclineNotification] 🌙 Too late for caffeine suggestion, skipping');
        return false;
      }
      
      // Check cooldown period to avoid spam
      const lastNotificationKey = `${this.NOTIFICATION_KEY_PREFIX}${userId}`;
      const lastNotificationTime = await AsyncStorage.getItem(lastNotificationKey);
      
      if (lastNotificationTime) {
        const hoursSinceLastNotification = (now.getTime() - new Date(lastNotificationTime).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastNotification < this.COOLDOWN_HOURS) {
          console.log('[CaffeineDeclineNotification] ⏰ Cooldown active, skipping');
          return false;
        }
      }
      
      // Send the decline notification
      console.log('[CaffeineDeclineNotification] ☕ Sending notification:', {
        currentScore,
        previousScore,
        decline: -scoreDifference.toFixed(1)
      });
      
      const success = await NotificationService.scheduleLocalNotification(
        'Time for more caffeine?',
        `Your caffeine levels are declining (${Math.round(currentScore)}). Consider having more caffeine to maintain focus.`,
        { 
          type: 'caffeine_decline',
          currentScore,
          previousScore,
          decline: Math.abs(scoreDifference)
        }
      );
      
      if (success) {
        // Record notification time for cooldown
        await AsyncStorage.setItem(lastNotificationKey, now.toISOString());
        console.log('[CaffeineDeclineNotification] ✅ Notification sent successfully');
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('[CaffeineDeclineNotification] ❌ Error sending notification:', error);
      return false;
    }
  }

  /**
   * Update notification threshold (for testing/customization)
   */
  static updateThreshold(newThreshold: number): void {
    // This is a static class, so we'd need to store this in AsyncStorage if we want it persistent
    console.log('[CaffeineDeclineNotification] 🔧 Threshold update requested:', newThreshold);
    // Could implement persistent storage here if needed
  }

  /**
   * Get current configuration
   */
  static getConfig() {
    return {
      threshold: this.DECLINE_THRESHOLD,
      minDecline: this.MIN_DECLINE_AMOUNT,
      cooldownHours: this.COOLDOWN_HOURS
    };
  }
} 