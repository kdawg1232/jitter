import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, DrinkRecord, SleepRecord, CrashRiskResult, STORAGE_KEYS } from '../types';

export class StorageService {
  // User Profile Operations
  static async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw new Error('Failed to save user profile');
    }
  }

  static async getUserProfile(): Promise<UserProfile | null> {
    try {
      const profileData = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (!profileData) return null;
      
      const profile = JSON.parse(profileData);
      // Convert date strings back to Date objects
      profile.createdAt = new Date(profile.createdAt);
      profile.updatedAt = new Date(profile.updatedAt);
      
      return profile;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  }

  static async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const existingProfile = await this.getUserProfile();
      if (!existingProfile) {
        throw new Error('No existing profile to update');
      }

      const updatedProfile: UserProfile = {
        ...existingProfile,
        ...updates,
        updatedAt: new Date()
      };

      await this.saveUserProfile(updatedProfile);
      return updatedProfile;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Sleep Records Operations
  static async saveSleepRecords(records: SleepRecord[]): Promise<void> {
    try {
      // Keep only last 30 days of records
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentRecords = records.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= thirtyDaysAgo;
      });

      await AsyncStorage.setItem(STORAGE_KEYS.SLEEP_RECORDS, JSON.stringify(recentRecords));
    } catch (error) {
      console.error('Error saving sleep records:', error);
      throw new Error('Failed to save sleep records');
    }
  }

  static async getSleepRecords(): Promise<SleepRecord[]> {
    try {
      const recordsData = await AsyncStorage.getItem(STORAGE_KEYS.SLEEP_RECORDS);
      if (!recordsData) return [];
      
      const records = JSON.parse(recordsData);
      // Convert date strings back to Date objects
      return records.map((record: any) => ({
        ...record,
        createdAt: new Date(record.createdAt)
      }));
    } catch (error) {
      console.error('Error loading sleep records:', error);
      return [];
    }
  }

  static async addSleepRecord(record: SleepRecord): Promise<void> {
    try {
      const existingRecords = await this.getSleepRecords();
      
      // Remove any existing record for the same date and user
      const filteredRecords = existingRecords.filter(
        existing => !(existing.date === record.date && existing.userId === record.userId)
      );
      
      filteredRecords.push(record);
      await this.saveSleepRecords(filteredRecords);
    } catch (error) {
      console.error('Error adding sleep record:', error);
      throw error;
    }
  }

  static async getLastNightSleep(userId: string): Promise<number | null> {
    try {
      const records = await this.getSleepRecords();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const lastNightRecord = records.find(
        record => record.userId === userId && record.date === yesterdayStr
      );
      
      return lastNightRecord ? lastNightRecord.hoursSlept : null;
    } catch (error) {
      console.error('Error getting last night sleep:', error);
      return null;
    }
  }

  static async calculateAverageSleep(userId: string, days: number = 7): Promise<number> {
    try {
      const records = await this.getSleepRecords();
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);
      
      const recentRecords = records.filter(record => {
        if (record.userId !== userId) return false;
        const recordDate = new Date(record.date);
        return recordDate >= daysAgo;
      });
      
      if (recentRecords.length === 0) return 7.5; // Default baseline
      
      const totalSleep = recentRecords.reduce((sum, record) => sum + record.hoursSlept, 0);
      return totalSleep / recentRecords.length;
    } catch (error) {
      console.error('Error calculating average sleep:', error);
      return 7.5; // Fallback to baseline
    }
  }

  // Drinks History Operations
  static async saveDrinksHistory(drinks: DrinkRecord[]): Promise<void> {
    try {
      // Keep only last 30 days of drinks
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentDrinks = drinks.filter(drink => drink.timestamp >= thirtyDaysAgo);
      
      await AsyncStorage.setItem(STORAGE_KEYS.DRINKS_HISTORY, JSON.stringify(recentDrinks));
    } catch (error) {
      console.error('Error saving drinks history:', error);
      throw new Error('Failed to save drinks history');
    }
  }

  static async getDrinksHistory(): Promise<DrinkRecord[]> {
    try {
      const drinksData = await AsyncStorage.getItem(STORAGE_KEYS.DRINKS_HISTORY);
      if (!drinksData) return [];
      
      const drinks = JSON.parse(drinksData);
      // Convert date strings back to Date objects
      return drinks.map((drink: any) => ({
        ...drink,
        timestamp: new Date(drink.timestamp),
        recordedAt: new Date(drink.recordedAt)
      }));
    } catch (error) {
      console.error('Error loading drinks history:', error);
      return [];
    }
  }

  static async addDrinkRecord(drink: DrinkRecord): Promise<void> {
    try {
      const existingDrinks = await this.getDrinksHistory();
      existingDrinks.push(drink);
      await this.saveDrinksHistory(existingDrinks);
    } catch (error) {
      console.error('Error adding drink record:', error);
      throw error;
    }
  }

  static async getDrinksLast24Hours(userId: string): Promise<DrinkRecord[]> {
    try {
      const allDrinks = await this.getDrinksHistory();
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      return allDrinks.filter(drink => 
        drink.userId === userId && drink.timestamp >= twentyFourHoursAgo
      );
    } catch (error) {
      console.error('Error getting last 24h drinks:', error);
      return [];
    }
  }

  static async calculateMeanDailyCaffeine(userId: string, days: number = 30): Promise<number> {
    try {
      const allDrinks = await this.getDrinksHistory();
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);
      
      const recentDrinks = allDrinks.filter(drink => 
        drink.userId === userId && drink.timestamp >= daysAgo
      );
      
      if (recentDrinks.length === 0) return 0;
      
      const totalCaffeine = recentDrinks.reduce((sum, drink) => sum + drink.actualCaffeineConsumed, 0);
      return totalCaffeine / days; // Average per day
    } catch (error) {
      console.error('Error calculating mean daily caffeine:', error);
      return 0;
    }
  }

  // Crash Risk Cache Operations
  static async saveCrashRiskCache(result: CrashRiskResult): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CRASH_RISK_CACHE, JSON.stringify(result));
    } catch (error) {
      console.error('Error saving crash risk cache:', error);
      // Don't throw - caching is optional
    }
  }

  static async getCrashRiskCache(): Promise<CrashRiskResult | null> {
    try {
      const cacheData = await AsyncStorage.getItem(STORAGE_KEYS.CRASH_RISK_CACHE);
      if (!cacheData) return null;
      
      const result = JSON.parse(cacheData);
      // Convert date strings back to Date objects
      result.validUntil = new Date(result.validUntil);
      result.calculatedAt = new Date(result.calculatedAt);
      
      // Check if cache is still valid
      if (new Date() > result.validUntil) {
        await this.clearCrashRiskCache();
        return null;
      }
      
      return result;
    } catch (error) {
      console.error('Error loading crash risk cache:', error);
      return null;
    }
  }

  static async clearCrashRiskCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CRASH_RISK_CACHE);
    } catch (error) {
      console.error('Error clearing crash risk cache:', error);
    }
  }

  // Migration and Legacy Data Operations
  static async migrateLegacyDrinkData(): Promise<void> {
    try {
      // Check for old storage format (from existing HomeScreen)
      const legacyData = await AsyncStorage.getItem('jitter_drinks_data');
      if (!legacyData) return;
      
      const parsed = JSON.parse(legacyData);
      if (parsed.drinks && Array.isArray(parsed.drinks)) {
        // Convert legacy format to new format
        const convertedDrinks: DrinkRecord[] = parsed.drinks.map((drink: any) => ({
          id: drink.id,
          userId: 'migrated_user', // Will be updated when profile is available
          name: drink.name,
          caffeineAmount: drink.caffeineAmount,
          completionPercentage: drink.completionPercentage,
          actualCaffeineConsumed: drink.actualCaffeineConsumed,
          timestamp: new Date(drink.recordedAt), // Use recordedAt as timestamp
          timeToConsume: drink.timeToConsume,
          recordedAt: new Date(drink.recordedAt)
        }));
        
        await this.saveDrinksHistory(convertedDrinks);
        console.log('Migrated legacy drink data');
      }
      
      // Remove legacy data
      await AsyncStorage.removeItem('jitter_drinks_data');
    } catch (error) {
      console.error('Error migrating legacy data:', error);
    }
  }

  // Utility Operations
  static async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE),
        AsyncStorage.removeItem(STORAGE_KEYS.SLEEP_RECORDS),
        AsyncStorage.removeItem(STORAGE_KEYS.DRINKS_HISTORY),
        AsyncStorage.removeItem(STORAGE_KEYS.CRASH_RISK_CACHE)
      ]);
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }

  static async getStorageInfo(): Promise<{
    profileExists: boolean;
    sleepRecordsCount: number;
    drinksCount: number;
    cacheExists: boolean;
  }> {
    try {
      const [profile, sleepRecords, drinks, cache] = await Promise.all([
        this.getUserProfile(),
        this.getSleepRecords(),
        this.getDrinksHistory(),
        this.getCrashRiskCache()
      ]);

      return {
        profileExists: profile !== null,
        sleepRecordsCount: sleepRecords.length,
        drinksCount: drinks.length,
        cacheExists: cache !== null
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return {
        profileExists: false,
        sleepRecordsCount: 0,
        drinksCount: 0,
        cacheExists: false
      };
    }
  }
} 