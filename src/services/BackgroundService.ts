import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

import { StorageService, CaffScoreService, NotificationService, calculateStatus } from './index';

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
   * Handle app state changes - trigger calculation when app becomes active
   */
  private static handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      console.log('[BackgroundService] 📱 App became active, triggering calculation');
      await this.calculateAndNotify();
    }
  };

  /**
   * Calculate CaffScore and send notification if status changed
   */
  private static async calculateAndNotify(): Promise<void> {
    try {
      console.log('[BackgroundService] 🔄 Running CaffScore calculation');

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

      // Retrieve previous score & status so we can detect changes
      const previousScore = await StorageService.getPreviousCaffScore(
        userProfile.userId,
      );
      const previousStatusText =
        (await AsyncStorage.getItem(`status_${userProfile.userId}`)) || '';

      // Determine the new status text
      const statusResult = calculateStatus(
        newScore,
        previousScore,
        previousStatusText,
      );

      // Persist the newly calculated score so the next run has the correct baseline
      await StorageService.savePreviousCaffScore(userProfile.userId, newScore);

      // If the text changed we fire a local notification and remember it
      if (statusResult.text && statusResult.text !== previousStatusText) {
        console.log('[BackgroundService] 📨 Status changed – sending notification:', statusResult.text);
        await AsyncStorage.setItem(
          `status_${userProfile.userId}`,
          statusResult.text,
        );

        // Check if notifications are enabled before sending
        const notificationsEnabled = await NotificationService.areNotificationsEnabled();
        if (notificationsEnabled) {
          // Fire an immediate local notification
          await NotificationService.scheduleLocalNotification(
            statusResult.text,
            statusResult.text,
            { type: 'status_update' },
          );
        }
      } else {
        console.log('[BackgroundService] ✅ Status unchanged');
      }

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