import { NotificationService } from '../NotificationService';

export class SetupNotification {
  /**
   * Send notification when notification setup is complete
   */
  static async sendSetupComplete(): Promise<boolean> {
    try {
      const success = await NotificationService.scheduleLocalNotification(
        'Your Jitter notifications are set up!',
        'You will receive alerts based on your caffeine levels.',
        { type: 'setup_complete' }
      );

      if (success) {
        console.log('[SetupNotification] ✅ Setup completion notification sent');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[SetupNotification] ❌ Failed to send setup notification:', error);
      return false;
    }
  }

  /**
   * Send notification when widget setup is complete
   */
  static async sendWidgetSetupComplete(): Promise<boolean> {
    try {
      const success = await NotificationService.scheduleLocalNotification(
        'Widget setup complete!',
        'Your Jitter widget is now active and will show your current CaffScore.',
        { type: 'widget_setup_complete' }
      );

      if (success) {
        console.log('[SetupNotification] ✅ Widget setup notification sent');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[SetupNotification] ❌ Failed to send widget setup notification:', error);
      return false;
    }
  }

  /**
   * Send welcome notification after onboarding
   */
  static async sendWelcome(): Promise<boolean> {
    try {
      const success = await NotificationService.scheduleLocalNotification(
        'Welcome to Jitter!',
        'Start tracking your caffeine to optimize your focus and performance.',
        { type: 'welcome' }
      );

      if (success) {
        console.log('[SetupNotification] ✅ Welcome notification sent');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[SetupNotification] ❌ Failed to send welcome notification:', error);
      return false;
    }
  }


  /**
   * Get all setup notification types
   */
  static getNotificationTypes() {
    return [
      {
        type: 'setup_complete',
        title: 'Your Jitter notifications are set up!',
        description: 'Sent when notification permissions are granted'
      },
      {
        type: 'widget_setup_complete',
        title: 'Widget setup complete!',
        description: 'Sent when widget is successfully configured'
      },
      {
        type: 'welcome',
        title: 'Welcome to Jitter!',
        description: 'Sent after completing onboarding'
      },
    ];
  }
} 