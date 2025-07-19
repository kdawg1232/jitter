import { StorageService } from './StorageService';
import { CrashRiskService } from './CrashRiskService';
import { CaffScoreService } from './CaffScoreService';
import { UserProfile, DrinkRecord } from '../types';
import JitterWidgetBridge from '../native/JitterWidgetBridge';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WidgetData {
  crashRiskScore: number;
  caffScore: number;
  currentCaffeineLevel: number;
  lastDrinkTime: string | null;
  lastDrinkName: string | null;
  nextOptimalTime: string | null;
  lastUpdated: string;
  riskLevel: 'low' | 'medium' | 'high';
  userId: string;
}

export class WidgetService {
  private static readonly WIDGET_DATA_KEY = 'jitter_widget_data';
  
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
          crashRiskScore: 0,
          caffScore: 0,
          currentCaffeineLevel: 0,
          lastDrinkTime: null,
          lastDrinkName: null,
          nextOptimalTime: null,
          lastUpdated: new Date().toISOString(),
          riskLevel: 'low',
          userId
        };
        
        // Store widget data in AsyncStorage (for React Native side)
        await AsyncStorage.setItem(this.WIDGET_DATA_KEY, JSON.stringify(defaultWidgetData));
        
        console.log('[WidgetService] ✅ Default widget data created for user without profile');
        return;
      }
      
      // Calculate current scores with proper parameters
      const crashRiskResult = await CrashRiskService.calculateCrashRisk(
        userProfile,
        last24HoursDrinks
      );
      
      const focusResult = await CaffScoreService.calculateFocusScore(
        userProfile,
        last24HoursDrinks
      );
      
      // Get last drink info
      const sortedDrinks = last24HoursDrinks.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const lastDrink = sortedDrinks.length > 0 ? sortedDrinks[0] : null;
      
      // Calculate current caffeine level with correct method name
      const currentCaffeineLevel = CrashRiskService.calculateCurrentCaffeineLevel(
        last24HoursDrinks,
        CrashRiskService.calculatePersonalizedHalfLife(userProfile),
        new Date()
      );
      
      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (crashRiskResult.score >= 71) riskLevel = 'high';
      else if (crashRiskResult.score >= 31) riskLevel = 'medium';
      
      // Calculate next optimal time (simplified - 2-3 hours after last drink)
      let nextOptimalTime: string | null = null;
      if (lastDrink) {
        const nextTime = new Date(lastDrink.timestamp);
        nextTime.setHours(nextTime.getHours() + 2.5);
        nextOptimalTime = nextTime.toISOString();
      }
      
      const widgetData: WidgetData = {
        crashRiskScore: Math.round(crashRiskResult.score),
        caffScore: Math.round(focusResult.score),
        currentCaffeineLevel: Math.round(currentCaffeineLevel),
        lastDrinkTime: lastDrink ? lastDrink.timestamp.toISOString() : null,
        lastDrinkName: lastDrink ? lastDrink.name : null,
        nextOptimalTime,
        lastUpdated: new Date().toISOString(),
        riskLevel,
        userId
      };
      
      // Store widget data in AsyncStorage (for React Native side)
      await AsyncStorage.setItem(this.WIDGET_DATA_KEY, JSON.stringify(widgetData));
      
      console.log('[WidgetService] ✅ Widget data updated:', {
        crashRisk: widgetData.crashRiskScore,
        focus: widgetData.caffScore,
        caffeine: widgetData.currentCaffeineLevel,
        lastDrink: widgetData.lastDrinkName,
        riskLevel: widgetData.riskLevel
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
          crashRiskScore: 0,
          caffScore: 0,
          currentCaffeineLevel: 0,
          lastDrinkTime: null,
          lastDrinkName: null,
          nextOptimalTime: null,
          lastUpdated: new Date().toISOString(),
          riskLevel: 'low',
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
  
  /**
   * Gets emoji for risk level
   */
  static getRiskEmoji(riskLevel: 'low' | 'medium' | 'high'): string {
    switch (riskLevel) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🔴';
      default: return '⚪';
    }
  }
  
  /**
   * Gets risk text for widget
   */
  static getRiskText(riskLevel: 'low' | 'medium' | 'high'): string {
    switch (riskLevel) {
      case 'low': return 'Low';
      case 'medium': return 'Medium';
      case 'high': return 'High';
      default: return 'Unknown';
    }
  }
} 