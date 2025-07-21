import { StorageService } from './StorageService';

import { CaffScoreService } from './CaffScoreService';
import { UserProfile, DrinkRecord } from '../types';
import JitterWidgetBridge from '../native/JitterWidgetBridge';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WidgetData {
  caffScore: number;
  currentCaffeineLevel: number;
  lastDrinkTime: string | null;
  lastDrinkName: string | null;
  nextOptimalTime: string | null;
  lastUpdated: string;
  userId: string;
}

export class WidgetService {
  private static readonly WIDGET_DATA_KEY = 'jitter_widget_data';
  private static readonly WIDGET_PREFERENCES_KEY = 'jitter_widget_preferences';
  
  /**
   * Set up widgets (similar to NotificationService.setupNotifications)
   */
  static async setupWidgets(): Promise<boolean> {
    try {
      console.log('[WidgetService] 🚀 Setting up widgets...');

      // Check if user profile exists
      const userProfile = await StorageService.getUserProfile();
      if (!userProfile) {
        console.log('[WidgetService] ❌ No user profile found');
        return false;
      }

      // Update widget data to ensure it's current
      await this.updateWidgetData(userProfile.userId);
      
      // Check if widget data is available
      const widgetData = await this.getWidgetData();
      
      if (!widgetData) {
        console.log('[WidgetService] ❌ Unable to prepare widget data');
        return false;
      }

      // Store widget preferences
      await AsyncStorage.setItem(this.WIDGET_PREFERENCES_KEY, JSON.stringify({
        enabled: true,
        setupAt: new Date().toISOString(),
      }));

      console.log('[WidgetService] ✅ Widget setup completed successfully');
      console.log('[WidgetService] 💾 Widget preferences saved:', {
        enabled: true,
        caffScore: widgetData.caffScore,
        currentCaffeineLevel: widgetData.currentCaffeineLevel
      });

      return true;
    } catch (error) {
      console.error('[WidgetService] ❌ Widget setup failed:', error);
      return false;
    }
  }

  /**
   * Check if widgets are enabled (similar to NotificationService.areNotificationsEnabled)
   */
  static async areWidgetsEnabled(): Promise<boolean> {
    try {
      const preferences = await this.getWidgetPreferences();
      return preferences.enabled;
    } catch (error) {
      console.error('[WidgetService] ❌ Error checking widget status:', error);
      return false;
    }
  }

  /**
   * Get widget preferences from storage
   */
  static async getWidgetPreferences(): Promise<{
    enabled: boolean;
    setupAt?: string;
  }> {
    try {
      const stored = await AsyncStorage.getItem(this.WIDGET_PREFERENCES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[WidgetService] ❌ Error getting widget preferences:', error);
    }
    
    // Return default preferences
    return {
      enabled: false,
    };
  }

  /**
   * Update widget preferences in storage
   */
  static async updateWidgetPreferences(preferences: Partial<{
    enabled: boolean;
  }>): Promise<void> {
    try {
      const current = await this.getWidgetPreferences();
      const updated = {
        ...current,
        ...preferences,
        lastUpdated: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(this.WIDGET_PREFERENCES_KEY, JSON.stringify(updated));
      console.log('[WidgetService] ✅ Widget preferences updated:', updated);
    } catch (error) {
      console.error('[WidgetService] ❌ Error updating widget preferences:', error);
    }
  }

  /**
   * Disable widgets (similar to NotificationService.disableNotifications)
   */
  static async disableWidgets(): Promise<void> {
    console.log('[WidgetService] 🔇 Disabling widgets...');
    
    try {
      await this.updateWidgetPreferences({
        enabled: false,
      });
      
      console.log('[WidgetService] ✅ Widgets disabled successfully');
    } catch (error) {
      console.error('[WidgetService] ❌ Failed to disable widgets:', error);
    }
  }
  
  /**
   * Updates widget data with current app state
   * This should be called whenever key data changes (new drink, sleep update, etc.)
   */
  static async updateWidgetData(userId: string): Promise<void> {
    try {
      console.log('[WidgetService] 🔄 Updating widget data for user:', userId);
      
      // Get user profile and recent drinks
      const userProfile = await StorageService.getUserProfile();
      const last24HoursDrinks = await StorageService.getDrinksLast24Hours(userId);
      const lastNightSleep = await StorageService.getLastNightSleep(userId);
      
      if (!userProfile) {
        console.warn('[WidgetService] ⚠️ No user profile found, creating default widget data');
        
        // Create default widget data even without profile
        const defaultWidgetData: WidgetData = {
          caffScore: 0,
          currentCaffeineLevel: 0,
          lastDrinkTime: null,
          lastDrinkName: null,
          nextOptimalTime: null,
          lastUpdated: new Date().toISOString(),
          
          userId
        };
        
        // Store widget data in AsyncStorage (for React Native side)
        await AsyncStorage.setItem(this.WIDGET_DATA_KEY, JSON.stringify(defaultWidgetData));
        
        console.log('[WidgetService] ✅ Default widget data created for user without profile');
        return;
      }
      
      // Calculate current CaffScore
      const focusResult = await CaffScoreService.calculateFocusScore(
        userProfile,
        last24HoursDrinks
      );
      
      // Get last drink info
      const sortedDrinks = last24HoursDrinks.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const lastDrink = sortedDrinks.length > 0 ? sortedDrinks[0] : null;
      
      // Calculate current caffeine level
      const currentCaffeineLevel = CaffScoreService.calculateCurrentCaffeineLevel(
        last24HoursDrinks,
        CaffScoreService.calculatePersonalizedHalfLife(userProfile),
        new Date()
      );
      
      // Calculate next optimal time (simplified - 2-3 hours after last drink)
      let nextOptimalTime: string | null = null;
      if (lastDrink) {
        const nextTime = new Date(lastDrink.timestamp);
        nextTime.setHours(nextTime.getHours() + 2.5);
        nextOptimalTime = nextTime.toISOString();
      }
      
      const widgetData: WidgetData = {
        caffScore: Math.round(focusResult.score),
        currentCaffeineLevel: Math.round(currentCaffeineLevel),
        lastDrinkTime: lastDrink ? lastDrink.timestamp.toISOString() : null,
        lastDrinkName: lastDrink ? lastDrink.name : null,
        nextOptimalTime,
        lastUpdated: new Date().toISOString(),
        userId
      };
      
      // Store widget data in AsyncStorage (for React Native side)
      await AsyncStorage.setItem(this.WIDGET_DATA_KEY, JSON.stringify(widgetData));
      
      console.log('[WidgetService] ✅ Widget data updated:', {
        focus: widgetData.caffScore,
        caffeine: widgetData.currentCaffeineLevel,
        lastDrink: widgetData.lastDrinkName
      });
      
      // Update native widget via App Groups
      if (JitterWidgetBridge) {
        try {
          await JitterWidgetBridge.updateWidgetData(widgetData);
          console.log('[WidgetService] 📱 Native widget data updated via App Groups');
        } catch (error) {
          console.error('[WidgetService] ❌ Failed to update native widget:', error);
        }
      } else {
        console.warn('[WidgetService] ⚠️ Native bridge not available');
      }
      
    } catch (error) {
      console.error('[WidgetService] ❌ Error updating widget data:', error);
      
      // Create fallback widget data on error
      try {
        const fallbackWidgetData: WidgetData = {
          caffScore: 0,
          currentCaffeineLevel: 0,
          lastDrinkTime: null,
          lastDrinkName: null,
          nextOptimalTime: null,
          lastUpdated: new Date().toISOString(),

          userId
        };
        
        await AsyncStorage.setItem(this.WIDGET_DATA_KEY, JSON.stringify(fallbackWidgetData));
        console.log('[WidgetService] ✅ Fallback widget data created after error');
      } catch (fallbackError) {
        console.error('[WidgetService] ❌ Failed to create fallback widget data:', fallbackError);
      }
    }
  }
  
  /**
   * Gets current widget data
   */
  static async getWidgetData(): Promise<WidgetData | null> {
    try {
      const data = await AsyncStorage.getItem(this.WIDGET_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[WidgetService] ❌ Error getting widget data:', error);
      return null;
    }
  }
  
  /**
   * Checks if widget data needs updating (older than 5 minutes)
   */
  static async shouldUpdateWidget(): Promise<boolean> {
    try {
      const widgetData = await this.getWidgetData();
      if (!widgetData) return true;
      
      const lastUpdated = new Date(widgetData.lastUpdated);
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      return lastUpdated < fiveMinutesAgo;
    } catch (error) {
      console.error('[WidgetService] ❌ Error checking widget update status:', error);
      return true;
    }
  }
  
  /**
   * Formats time for widget display
   */
  static formatTimeForWidget(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return 'Just now';
    }
  }
  

  

} 