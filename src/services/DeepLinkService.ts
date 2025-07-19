import { Linking } from 'react-native';
import { StorageService } from './StorageService';

export interface WidgetDrinkSession {
  sessionId: string;
  startTime: Date;
  elapsedSeconds: number;
}

export class DeepLinkService {
  private static listeners: ((url: string) => void)[] = [];
  
  /**
   * Initialize deep linking service
   */
  static async initialize(): Promise<void> {
    try {
      console.log('[DeepLinkService] 🚀 Initializing deep link service...');
      
      // Handle app launch from deep link
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('[DeepLinkService] 📱 App launched with deep link:', initialUrl);
        await this.handleDeepLink(initialUrl);
      }
      
      // Handle deep links while app is running
      const subscription = Linking.addEventListener('url', (event) => {
        console.log('[DeepLinkService] 📱 Deep link received while app running:', event.url);
        this.handleDeepLink(event.url);
      });
      
      console.log('[DeepLinkService] ✅ Deep link service initialized');
      
      return () => subscription?.remove();
    } catch (error) {
      console.error('[DeepLinkService] ❌ Error initializing deep link service:', error);
    }
  }
  
  /**
   * Handle incoming deep link
   */
  static async handleDeepLink(url: string): Promise<void> {
    try {
      console.log('[DeepLinkService] 🔗 Processing deep link:', url);
      
      const { hostname, searchParams } = new URL(url);
      
      switch (hostname) {
        case 'complete-drink':
          await this.handleCompleteDrink(searchParams);
          break;
        case 'start-drink':
          await this.handleStartDrink(searchParams);
          break;
        default:
          console.log('[DeepLinkService] ⚠️ Unknown deep link hostname:', hostname);
      }
      
      // Notify listeners
      this.listeners.forEach(listener => listener(url));
      
    } catch (error) {
      console.error('[DeepLinkService] ❌ Error handling deep link:', error);
    }
  }
  
  /**
   * Handle complete drink from widget
   */
  private static async handleCompleteDrink(searchParams: URLSearchParams): Promise<void> {
    try {
      const sessionId = searchParams.get('sessionId');
      
      if (!sessionId) {
        console.error('[DeepLinkService] ❌ No session ID provided for complete-drink');
        return;
      }
      
      console.log('[DeepLinkService] ✅ Handling complete drink for session:', sessionId);
      
      // Retrieve widget session data (this would come from App Groups in real implementation)
      const sessionData = await this.getWidgetSession(sessionId);
      
      if (sessionData) {
        // Calculate elapsed time
        const elapsedSeconds = Math.floor((Date.now() - sessionData.startTime.getTime()) / 1000);
        const formattedTime = this.formatElapsedTime(elapsedSeconds);
        
        console.log('[DeepLinkService] ⏱️ Widget session data:', {
          sessionId,
          startTime: sessionData.startTime.toISOString(),
          elapsedSeconds,
          formattedTime
        });
        
        // Store pre-filled drink data for the app to use
        const preFillData = {
          sessionId,
          timeToConsume: formattedTime,
          startTime: sessionData.startTime.toISOString(),
          elapsedSeconds,
          fromWidget: true,
          timestamp: new Date().toISOString()
        };
        
        await StorageService.setItem('widget_prefill_data', JSON.stringify(preFillData));
        
        console.log('[DeepLinkService] ✅ Pre-fill data stored for HomeScreen');
        
        // Clear the widget session
        await this.clearWidgetSession(sessionId);
      }
    } catch (error) {
      console.error('[DeepLinkService] ❌ Error handling complete drink:', error);
    }
  }
  
  /**
   * Handle start drink from widget (for future use)
   */
  private static async handleStartDrink(searchParams: URLSearchParams): Promise<void> {
    console.log('[DeepLinkService] 🚀 Handling start drink from widget');
    // This could trigger the app to go directly to timer mode
  }
  
  /**
   * Get widget session data (mock implementation - in real app this comes from App Groups)
   */
  private static async getWidgetSession(sessionId: string): Promise<WidgetDrinkSession | null> {
    try {
      // In the real implementation, this would read from App Groups UserDefaults
      // For now, we'll mock some data or read from AsyncStorage
      const mockSession: WidgetDrinkSession = {
        sessionId,
        startTime: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        elapsedSeconds: 300 // 5 minutes
      };
      
      console.log('[DeepLinkService] 📱 Retrieved widget session (mock):', mockSession);
      return mockSession;
    } catch (error) {
      console.error('[DeepLinkService] ❌ Error getting widget session:', error);
      return null;
    }
  }
  
  /**
   * Clear widget session after completion
   */
  private static async clearWidgetSession(sessionId: string): Promise<void> {
    try {
      console.log('[DeepLinkService] 🗑️ Clearing widget session:', sessionId);
      // In real implementation, this would clear from App Groups
      // For now, just log
    } catch (error) {
      console.error('[DeepLinkService] ❌ Error clearing widget session:', error);
    }
  }
  
  /**
   * Format elapsed time from seconds to HH:MM:SS
   */
  private static formatElapsedTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  /**
   * Add listener for deep links
   */
  static addListener(listener: (url: string) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Check if there's pre-fill data from widget
   */
  static async getWidgetPreFillData(): Promise<any | null> {
    try {
      const data = await StorageService.getItem('widget_prefill_data');
      if (data) {
        // Clear it after reading
        await StorageService.removeItem('widget_prefill_data');
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('[DeepLinkService] ❌ Error getting pre-fill data:', error);
      return null;
    }
  }
  
  /**
   * Generate deep link URL for testing
   */
  static generateTestUrl(type: 'complete-drink' | 'start-drink', params: Record<string, string>): string {
    const url = new URL(`jitter://${type}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return url.toString();
  }
} 