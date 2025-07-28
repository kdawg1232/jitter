import { StorageService } from './StorageService';

import { CaffScoreService } from './CaffScoreService';
import { UserProfile, DrinkRecord } from '../types';
import { OnboardingData } from '../types/onboarding';
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
   * @param onboardingData Optional onboarding data to use if user profile doesn't exist yet
   */
  static async setupWidgets(onboardingData?: OnboardingData): Promise<boolean> {
    try {
      console.log('[WidgetService] 🚀 Setting up widgets...');

      // Check if user profile exists, or use onboarding data
      let userProfile = await StorageService.getUserProfile();
      let userId: string;
      
      if (!userProfile && onboardingData) {
        // During onboarding, create a temporary user profile from onboarding data
        console.log('[WidgetService] 📝 Using onboarding data for widget setup');
        userId = 'user_' + new Date().getTime();
        userProfile = {
          userId,
          name: onboardingData.name || 'User',
          age: onboardingData.age || 25,
          weight: onboardingData.weight || 70,
          height: onboardingData.height || 170,
          gender: onboardingData.gender || 'other',
          activityLevel: onboardingData.activityLevel || 'moderate',
          caffeineToleranceLevelSelected: onboardingData.caffeineToleranceLevelSelected || 'medium',
          maxCaffeinePerDay: onboardingData.maxCaffeinePerDay || 400,
          trackSleepDaily: onboardingData.trackSleepDaily || false,
          lastNightSleep: onboardingData.lastNightSleep || 8,
          lastDrinkTime: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      } else if (!userProfile) {
        console.log('[WidgetService] ❌ No user profile found and no onboarding data provided');
        return false;
      } else {
        userId = userProfile.userId;
      }

      // Update widget data to ensure it's current
      await this.updateWidgetData(userId, userProfile);
      
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
   * @param userId User ID
   * @param userProfile Optional user profile to use instead of fetching from storage
   */
  static async updateWidgetData(userId: string, userProfile?: UserProfile): Promise<void> {
    try {
      console.log('[WidgetService] 🔄 Updating widget data for user:', userId);
      
      // Get user profile if not provided
      if (!userProfile) {
        userProfile = await StorageService.getUserProfile();
      }
      
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
      
      // Ensure caffScore is never null/undefined to prevent JSON serialization crash
      let caffScore = focusResult?.score ?? 0;
      if (caffScore === null || caffScore === undefined || isNaN(caffScore) || !Number.isFinite(caffScore)) {
        console.warn('[WidgetService] ⚠️ CaffScore calculation returned null/NaN, using fallback value 0');
        caffScore = 0;
      }
      
      // Get last drink info
      const sortedDrinks = last24HoursDrinks.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const lastDrink = sortedDrinks.length > 0 ? sortedDrinks[0] : null;
      
      // Calculate current caffeine level and ensure it is a finite number (JSON cannot encode NaN / Infinity)
      const personalizedHalfLife = await CaffScoreService.calculatePersonalizedHalfLife(userProfile, null, new Date());
      const currentCaffeineLevelRaw = CaffScoreService.calculateCurrentCaffeineLevel(
        last24HoursDrinks,
        personalizedHalfLife,
        new Date()
      );

      // Round and sanitize – fall back to 0 if the value is not a real finite number
      let currentCaffeineLevel = Math.round(currentCaffeineLevelRaw);
      if (!Number.isFinite(currentCaffeineLevel) || isNaN(currentCaffeineLevel)) {
        console.warn('[WidgetService] ⚠️ currentCaffeineLevel calculation returned NaN/∞, using fallback value 0');
        currentCaffeineLevel = 0;
      }
      
      // Calculate next optimal time (simplified - 2-3 hours after last drink)
      let nextOptimalTime: string | null = null;
      if (lastDrink) {
        const nextTime = new Date(lastDrink.timestamp);
        nextTime.setHours(nextTime.getHours() + 2.5);
        nextOptimalTime = nextTime.toISOString();
      }
      
      const widgetData: WidgetData = {
        caffScore: Math.round(caffScore), // Already sanitized above
        currentCaffeineLevel,
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
          console.log('[WidgetService] 📱 Attempting to update native widget data...');
          console.log('[WidgetService] 📦 Data being sent:', JSON.stringify(widgetData, null, 2));
          
          const result = await JitterWidgetBridge.updateWidgetData(widgetData);
          
          if (result.success) {
            console.log('[WidgetService] ✅ Native widget data updated successfully via App Groups');
          } else {
            console.error('[WidgetService] ❌ Native bridge reported failure:', result);
          }
        } catch (error) {
          console.error('[WidgetService] ❌ Failed to update native widget:', error);
          console.error('[WidgetService] 🔍 Bridge available:', !!JitterWidgetBridge);
          if (error instanceof Error) {
            console.error('[WidgetService] 🔍 Error details:', {
              name: error.name,
              message: error.message,
              stack: error.stack
            });
          }
        }
      } else {
        console.warn('[WidgetService] ⚠️ Native bridge not available');
        console.warn('[WidgetService] 🔍 This is normal in development but should work in EAS builds');
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