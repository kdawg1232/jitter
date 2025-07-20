import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior - this is required
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  private static readonly PREFERENCES_KEY = 'jitter_notification_preferences';
  private static readonly PUSH_TOKEN_KEY = 'expo_push_token';

  /**
   * Initialize notification service
   */
  static async initialize(): Promise<void> {
    console.log('[NotificationService] 🚀 Initializing notification service...');
    
    try {
      // Only proceed on iOS and physical devices
      if (Platform.OS !== 'ios' || !Device.isDevice) {
        console.log('[NotificationService] ⚠️ Notifications only supported on iOS physical devices');
        return;
      }
      
      console.log('[NotificationService] ✅ Notification service initialized');
    } catch (error) {
      console.error('[NotificationService] ❌ Failed to initialize:', error);
    }
  }

  /**
   * Register for push notifications and get Expo push token
   */
  static async registerForPushNotifications(): Promise<string | null> {
    console.log('[NotificationService] 📱 Registering for push notifications...');
    
    let token = null;

    if (!Device.isDevice) {
      console.log('[NotificationService] ⚠️ Must use physical device for Push Notifications');
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: false,
            allowSound: true,
            allowDisplayInCarPlay: false,
            allowCriticalAlerts: false,
            provideAppNotificationSettings: false,
            allowProvisional: false,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[NotificationService] ❌ Permission not granted for push notifications');
        return null;
      }

      // Get the Expo push token
      try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        
        if (!projectId) {
          throw new Error('Project ID not found - make sure EAS project is configured');
        }

        const expoPushToken = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        
        token = expoPushToken.data;
        
        // Store the token
        await AsyncStorage.setItem(this.PUSH_TOKEN_KEY, token);
        
        console.log('[NotificationService] ✅ Successfully registered for push notifications');
        console.log('[NotificationService] 🎟️ Expo push token:', token);
        
      } catch (tokenError) {
        console.error('[NotificationService] ❌ Error getting push token:', tokenError);
        throw tokenError;
      }

    } catch (error) {
      console.error('[NotificationService] ❌ Error in registration process:', error);
      throw error;
    }

    return token;
  }

  /**
   * Request notification permissions from the user
   */
  static async requestPermissions(): Promise<boolean> {
    console.log('[NotificationService] 📱 Requesting notification permissions...');
    
    try {
      if (!Device.isDevice) {
        console.log('[NotificationService] ⚠️ Must use physical device for notifications');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Only ask for permissions if we haven't determined the user's intent
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: false,
            allowSound: true,
            allowDisplayInCarPlay: false,
            allowCriticalAlerts: false,
            provideAppNotificationSettings: false,
            allowProvisional: false,
          },
        });
        finalStatus = status;
      }

      // Update preferences with permission result
      await this.updatePermissionResult(finalStatus === 'granted');
      
      console.log('[NotificationService] 📋 Permission result:', {
        granted: finalStatus === 'granted',
        status: finalStatus
      });

      return finalStatus === 'granted';
    } catch (error) {
      console.error('[NotificationService] ❌ Permission request failed:', error);
      return false;
    }
  }

  /**
   * Schedule a local notification (immediate for now)
   */
  static async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<string | null> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
        },
        trigger: null, // Immediate notification
      });

      console.log('[NotificationService] ✅ Scheduled notification:', identifier);
      return identifier;
    } catch (error) {
      console.error('[NotificationService] ❌ Failed to schedule notification:', error);
      return null;
    }
  }

  /**
   * Schedule caffeine rising notification (immediate for testing)
   */
  static async scheduleCaffeineRisingNotification(): Promise<void> {
    try {
      const preferences = await this.getNotificationPreferences();
      
      if (!preferences.enabled || !preferences.caffeineRisingEnabled) {
        console.log('[NotificationService] ⚠️ Caffeine notifications disabled');
        return;
      }

      await this.scheduleLocalNotification(
        'Caffeine Levels Rising! ☕️',
        'Your caffeine is starting to kick in. Perfect timing for focused work!',
        { type: 'caffeine_rising' }
      );

      console.log('[NotificationService] ⏰ Caffeine rising notification sent');
    } catch (error) {
      console.error('[NotificationService] ❌ Failed to schedule caffeine notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('[NotificationService] 🗑️ All notifications cancelled');
    } catch (error) {
      console.error('[NotificationService] ❌ Failed to cancel notifications:', error);
    }
  }

  /**
   * Get stored push token
   */
  static async getStoredPushToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.PUSH_TOKEN_KEY);
    } catch (error) {
      console.error('[NotificationService] ❌ Error getting stored push token:', error);
      return null;
    }
  }

  /**
   * Setup notifications (request permissions and register for push notifications)
   */
  static async setupNotifications(): Promise<boolean> {
    console.log('[NotificationService] 🔧 Setting up notifications...');
    
    try {
      if (!Device.isDevice) {
        console.log('[NotificationService] ⚠️ Must use physical device for notifications');
        return false;
      }

      const permissionGranted = await this.requestPermissions();
      
      if (permissionGranted) {
        // Try to register for push notifications
        const pushToken = await this.registerForPushNotifications();
        
        await this.updateNotificationPreferences({
          enabled: true,
          caffeineRisingEnabled: true,
          pushToken: pushToken,
        });
        
        console.log('[NotificationService] ✅ Notifications setup successfully');
        return true;
      } else {
        console.log('[NotificationService] ❌ Notifications setup failed - permissions denied');
        return false;
      }
    } catch (error) {
      console.error('[NotificationService] ❌ Failed to setup notifications:', error);
      return false;
    }
  }

  /**
   * Update permission result in storage
   */
  private static async updatePermissionResult(granted: boolean): Promise<void> {
    try {
      const preferences = await this.getNotificationPreferences();
      const updatedPreferences = {
        ...preferences,
        permissionGranted: granted,
        lastPermissionCheck: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(this.PREFERENCES_KEY, JSON.stringify(updatedPreferences));
    } catch (error) {
      console.error('[NotificationService] ❌ Error updating permission result:', error);
    }
  }

  /**
   * Get notification preferences from storage
   */
  static async getNotificationPreferences(): Promise<{
    enabled: boolean;
    caffeineRisingEnabled: boolean;
    permissionGranted: boolean;
    lastPermissionCheck?: string;
    pushToken?: string | null;
  }> {
    try {
      const stored = await AsyncStorage.getItem(this.PREFERENCES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[NotificationService] ❌ Error getting notification preferences:', error);
    }
    
    // Return default preferences
    return {
      enabled: false,
      caffeineRisingEnabled: false,
      permissionGranted: false,
    };
  }

  /**
   * Update notification preferences in storage
   */
  static async updateNotificationPreferences(preferences: Partial<{
    enabled: boolean;
    caffeineRisingEnabled: boolean;
    pushToken: string | null;
  }>): Promise<void> {
    try {
      const current = await this.getNotificationPreferences();
      const updated = {
        ...current,
        ...preferences,
        lastUpdated: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(this.PREFERENCES_KEY, JSON.stringify(updated));
      console.log('[NotificationService] ✅ Notification preferences updated:', updated);
    } catch (error) {
      console.error('[NotificationService] ❌ Error updating notification preferences:', error);
    }
  }

  /**
   * Check if notifications are enabled
   */
  static async areNotificationsEnabled(): Promise<boolean> {
    try {
      const preferences = await this.getNotificationPreferences();
      return preferences.enabled && preferences.permissionGranted;
    } catch (error) {
      console.error('[NotificationService] ❌ Error checking notification status:', error);
      return false;
    }
  }

  /**
   * Add notification listeners (call this in your App.tsx)
   */
  static addNotificationListeners(): () => void {
    console.log('[NotificationService] 🎧 Adding notification listeners...');

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('[NotificationService] 📨 Notification received:', notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[NotificationService] 👆 Notification response:', response);
      
      // Handle notification tap here
      const data = response.notification.request.content.data;
      if (data?.type === 'caffeine_rising') {
        // Handle caffeine rising notification tap
        console.log('[NotificationService] ☕️ Caffeine rising notification tapped');
      }
    });

    // Return cleanup function
    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }

  /**
   * Disable notifications
   */
  static async disableNotifications(): Promise<void> {
    console.log('[NotificationService] 🔇 Disabling notifications...');
    
    try {
      await this.updateNotificationPreferences({
        enabled: false,
        caffeineRisingEnabled: false,
      });
      
      // Cancel any pending notifications
      await this.cancelAllNotifications();
      
      console.log('[NotificationService] ✅ Notifications disabled successfully');
    } catch (error) {
      console.error('[NotificationService] ❌ Failed to disable notifications:', error);
    }
  }
} 