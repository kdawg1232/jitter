export class RevenueCatService {
  /**
   * Initialize RevenueCat Purchases SDK
   */
  static async initialize(): Promise<void> {
    try {
      // Try to read the public SDK key from Expo config (app.json -> extra)
      // Fallbacks cover both classic and new runtime manifests
      const apiKey =
        // @ts-ignore - Constants type does not expose manifest when using EAS
        (require('expo-constants').default?.expoConfig?.extra?.REVENUECAT_API_KEY ??
          // @ts-ignore
          require('expo-constants').default?.manifest?.extra?.REVENUECAT_API_KEY);

      if (!apiKey) {
        console.warn('[RevenueCatService] ⚠️ No RevenueCat API key found. Add REVENUECAT_API_KEY to app.json > extra.');
        return;
      }

      const Purchases = require('react-native-purchases').default;

      // Prevent multiple configurations in development reloads
      if (!Purchases.isConfigured) {
        Purchases.configure({ apiKey });
        console.log('[RevenueCatService] ✅ RevenueCat Purchases configured');
      }
    } catch (error) {
      console.error('[RevenueCatService] ❌ Failed to initialize RevenueCat:', error);
    }
  }
} 