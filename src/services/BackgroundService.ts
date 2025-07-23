import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

import { StorageService, CaffScoreService, NotificationService, WidgetService, calculateStatus } from './index';
import { DailyReminderNotification, CaffScoreReminderNotification } from './notifications';

export class BackgroundService {
  private static intervalId: NodeJS.Timeout | null = null;
  private static isRunning = false;
  private static appStateSubscription: any = null;

  /**
   * Start the periodic CaffScore calculation service
   */
  static async startPeriodicCalculation(): Promise<void> {
    if (this.isRunning) {
      console.log('[BackgroundService] ✅ Periodic calculation already running');
      return;
    }

    console.log('[BackgroundService] 🚀 Starting periodic CaffScore calculation');
    this.isRunning = true;

    // Run immediately once
    await this.calculateAndNotify();

    // Set up periodic calculation every 10 minutes
    this.intervalId = setInterval(async () => {
      await this.calculateAndNotify();
    }, 10 * 60 * 1000); // 10 minutes

    // Listen for app state changes to handle background/foreground transitions
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    // Schedule CaffScore reminder notifications
    await this.scheduleCaffScoreReminders();

    console.log('[BackgroundService] ✅ Periodic calculation started');
  }

  /**
   * Stop the periodic calculation service
   */
  static stopPeriodicCalculation(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.isRunning = false;
    console.log('[BackgroundService] 🛑 Periodic calculation stopped');
  }

  /**
   * Schedule CaffScore reminder notifications (10 AM and 4 PM daily)
   */
  private static async scheduleCaffScoreReminders(): Promise<void> {
    try {
      const notificationsEnabled = await NotificationService.areNotificationsEnabled();
      if (notificationsEnabled) {
        await CaffScoreReminderNotification.schedule();
        console.log('[BackgroundService] ✅ CaffScore reminder notifications scheduled');
      } else {
        console.log('[BackgroundService] ⚠️ Notifications disabled - skipping CaffScore reminders');
      }
    } catch (error) {
      console.error('[BackgroundService] ❌ Failed to schedule CaffScore reminders:', error);
    }
  }

  /**
   * Handle app state changes - trigger calculation when app becomes active
   */
  private static handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      console.log('[BackgroundService] 📱 App became active, triggering calculation');
      await this.calculateAndNotify();
    }
  };

  /**
   * Perform daily reset of tracking data at 6:00 AM local time and notify the user.
   */
  private static async performDailyReset(): Promise<void> {
    try {
      const userProfile = await StorageService.getUserProfile();
      if (!userProfile) return; // No user yet

      const now = new Date();
      const todayKey = now.toISOString().split('T')[0];

      // Only reset after 6:00 AM local time
      if (now.getHours() < 6) return;

      // Check if reset already ran today
      const lastResetKey = `daily_reset_${userProfile.userId}`;
      const lastResetDate = await AsyncStorage.getItem(lastResetKey);
      if (lastResetDate === todayKey) {
        return; // Already reset today
      }

      console.log('[BackgroundService] 🕙 Performing daily reset for', userProfile.userId);

      // Clear today's tracking data so algorithm falls back to placeholders
      await StorageService.clearDailyTrackingData(userProfile.userId);

      // Send reminder notification
      const notificationsEnabled = await NotificationService.areNotificationsEnabled();
      if (notificationsEnabled) {
        await DailyReminderNotification.sendDailyResetNotification();
      }

      // Mark reset done for today
      await AsyncStorage.setItem(lastResetKey, todayKey);
      console.log('[BackgroundService] ✅ Daily reset completed');
    } catch (error) {
      console.error('[BackgroundService] ❌ Error during daily reset:', error);
    }
  }

  /**
   * Calculate CaffScore and update widget data
   */
  private static async calculateAndNotify(): Promise<void> {
    try {
      console.log('[BackgroundService] 🔄 Running CaffScore calculation');

      // Perform 6AM reset & notification if needed
      await this.performDailyReset();

      const userProfile = await StorageService.getUserProfile();
      if (!userProfile) {
        console.log('[BackgroundService] ⚠️ No user profile found – skipping');
        return;
      }

      // Load drinks that are still relevant for the algorithm
      const last24HoursDrinks = await StorageService.getDrinksLast24Hours(
        userProfile.userId,
      );

      // Calculate the score
      const focusResult = await CaffScoreService.calculateFocusScore(
        userProfile,
        last24HoursDrinks,
      );
      const newScore = focusResult.score;

      // Retrieve previous score so we can detect changes
      const previousScore = await StorageService.getPreviousCaffScore(
        userProfile.userId,
      );

      // Persist the newly calculated score so the next run has the correct baseline
      await StorageService.savePreviousCaffScore(userProfile.userId, newScore);

      console.log('[BackgroundService] ✅ CaffScore calculated:', newScore);

      // Update widget data
      await WidgetService.updateWidgetData(userProfile.userId);

    } catch (error) {
      console.error('[BackgroundService] ❌ Calculation failed:', error);
    }
  }

  /**
   * Legacy method - now just starts the periodic calculation
   * @deprecated Use startPeriodicCalculation instead
   */
  static async registerCaffScoreTask(): Promise<void> {
    console.log('[BackgroundService] 🔄 Starting alternative background service (no TaskManager)');
    await this.startPeriodicCalculation();
  }
} 