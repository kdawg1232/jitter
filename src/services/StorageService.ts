import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, DrinkRecord, SleepRecord, StressRecord, FoodRecord, ExerciseRecord, DayScoreRecord, StreakData, CalendarSummary, CalendarDayData, FocusSession, CaffeinePlan, PlanningPreferences, STORAGE_KEYS } from '../types';

export class StorageService {
  // User Profile Operations
  static async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      console.log('[StorageService] Saving user profile:', {
        userId: profile.userId,
        age: profile.age,
        weightKg: profile.weightKg,
        sex: profile.sex,
        smoker: profile.smoker,
        pregnant: profile.pregnant,
        oralContraceptives: profile.oralContraceptives
      });
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
      console.log('[StorageService] ✅ User profile saved successfully');
    } catch (error) {
      console.error('[StorageService] ❌ Error saving user profile:', error);
      throw new Error('Failed to save user profile');
    }
  }

  static async getUserProfile(): Promise<UserProfile | null> {
    try {
      console.log('[StorageService] Loading user profile...');
      const profileData = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (!profileData) {
        console.log('[StorageService] ⚠️ No user profile found');
        return null;
      }
      
      const profile = JSON.parse(profileData);
      // Convert date strings back to Date objects
      profile.createdAt = new Date(profile.createdAt);
      profile.updatedAt = new Date(profile.updatedAt);
      
      console.log('[StorageService] ✅ User profile loaded:', {
        userId: profile.userId,
        age: profile.age,
        weightKg: profile.weightKg,
        createdAt: profile.createdAt.toISOString()
      });
      
      return profile;
    } catch (error) {
      console.error('[StorageService] ❌ Error loading user profile:', error);
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

  static async clearUserProfile(): Promise<void> {
    try {
      console.log('[StorageService] 🗑️ Clearing user profile for testing...');
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
      console.log('[StorageService] ✅ User profile cleared successfully');
    } catch (error) {
      console.error('[StorageService] ❌ Error clearing user profile:', error);
      throw new Error('Failed to clear user profile');
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
      console.log('[StorageService] Adding sleep record:', {
        userId: record.userId,
        date: record.date,
        hoursSlept: record.hoursSlept,
        source: record.source
      });
      
      const existingRecords = await this.getSleepRecords();
      
      // Remove any existing record for the same date and user
      const filteredRecords = existingRecords.filter(
        existing => !(existing.date === record.date && existing.userId === record.userId)
      );
      
      const wasReplacement = existingRecords.length !== filteredRecords.length;
      if (wasReplacement) {
        console.log('[StorageService] 🔄 Replacing existing sleep record for date:', record.date);
      }
      
      filteredRecords.push(record);
      await this.saveSleepRecords(filteredRecords);
      
      console.log('[StorageService] ✅ Sleep record saved successfully. Total records:', filteredRecords.length);
    } catch (error) {
      console.error('[StorageService] ❌ Error adding sleep record:', error);
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

  // Stress Records Operations
  static async saveStressRecords(records: StressRecord[]): Promise<void> {
    try {
      // Keep only last 30 days of records
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentRecords = records.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= thirtyDaysAgo;
      });

      await AsyncStorage.setItem(STORAGE_KEYS.STRESS_RECORDS, JSON.stringify(recentRecords));
    } catch (error) {
      console.error('Error saving stress records:', error);
      throw new Error('Failed to save stress records');
    }
  }

  static async getStressRecords(): Promise<StressRecord[]> {
    try {
      const recordsData = await AsyncStorage.getItem(STORAGE_KEYS.STRESS_RECORDS);
      if (!recordsData) return [];
      
      const records = JSON.parse(recordsData);
      // Convert date strings back to Date objects
      return records.map((record: any) => ({
        ...record,
        createdAt: new Date(record.createdAt)
      }));
    } catch (error) {
      console.error('Error loading stress records:', error);
      return [];
    }
  }

  static async addStressRecord(record: StressRecord): Promise<void> {
    try {
      console.log('[StorageService] Adding stress record:', {
        userId: record.userId,
        date: record.date,
        stressLevel: record.stressLevel
      });
      
      const existingRecords = await this.getStressRecords();
      
      // Remove any existing record for the same date and user
      const filteredRecords = existingRecords.filter(
        existing => !(existing.date === record.date && existing.userId === record.userId)
      );
      
      const wasReplacement = existingRecords.length !== filteredRecords.length;
      if (wasReplacement) {
        console.log('[StorageService] 🔄 Replacing existing stress record for date:', record.date);
      }
      
      filteredRecords.push(record);
      await this.saveStressRecords(filteredRecords);
      
      console.log('[StorageService] ✅ Stress record saved successfully. Total records:', filteredRecords.length);
    } catch (error) {
      console.error('[StorageService] ❌ Error adding stress record:', error);
      throw error;
    }
  }

  static async getTodayStressLevel(userId: string): Promise<number | null> {
    try {
      const records = await this.getStressRecords();
      const today = new Date().toISOString().split('T')[0];
      
      const todayRecord = records.find(
        record => record.userId === userId && record.date === today
      );
      
      return todayRecord ? todayRecord.stressLevel : null;
    } catch (error) {
      console.error('Error getting today stress level:', error);
      return null;
    }
  }

  // Food Records Operations
  static async saveFoodRecords(records: FoodRecord[]): Promise<void> {
    try {
      // Keep only last 30 days of records
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentRecords = records.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= thirtyDaysAgo;
      });

      await AsyncStorage.setItem(STORAGE_KEYS.FOOD_RECORDS, JSON.stringify(recentRecords));
    } catch (error) {
      console.error('Error saving food records:', error);
      throw new Error('Failed to save food records');
    }
  }

  static async getFoodRecords(): Promise<FoodRecord[]> {
    try {
      const recordsData = await AsyncStorage.getItem(STORAGE_KEYS.FOOD_RECORDS);
      if (!recordsData) return [];
      
      const records = JSON.parse(recordsData);
      // Convert date strings back to Date objects and normalise legacy structure
      return records.map((record: any) => {
        // Legacy records may only have lastMealTime – convert to mealTimes array
        let mealTimes: Date[] = [];
        if (record.mealTimes && Array.isArray(record.mealTimes)) {
          mealTimes = record.mealTimes.map((t: string) => new Date(t));
        }
        if (record.lastMealTime) {
          const lm = new Date(record.lastMealTime);
          if (!mealTimes.find((d: Date) => d.getTime() === lm.getTime())) {
            mealTimes.push(lm);
          }
        }

        // Sort ascending
        mealTimes.sort((a: Date, b: Date) => a.getTime() - b.getTime());
        
        return {
          userId: record.userId,
          date: record.date,
          mealTimes,
          lastMealTime: mealTimes.length > 0 ? mealTimes[mealTimes.length - 1] : undefined,
          createdAt: new Date(record.createdAt),
        } as FoodRecord;
      });
    } catch (error) {
      console.error('Error loading food records:', error);
      return [];
    }
  }

  /**
   * Record a new meal time for today (or the provided date).
   */
  static async addMealTime(userId: string, mealTime: Date = new Date()): Promise<void> {
    try {
      const dateKey = mealTime.toISOString().split('T')[0];

      const existingRecords = await this.getFoodRecords();
      const recordIndex = existingRecords.findIndex(r => r.userId === userId && r.date === dateKey);

      if (recordIndex !== -1) {
        // Update existing record
        const record = existingRecords[recordIndex];
        record.mealTimes.push(mealTime);
        record.mealTimes.sort((a, b) => a.getTime() - b.getTime());
        record.lastMealTime = record.mealTimes[record.mealTimes.length - 1];
        existingRecords[recordIndex] = record;
        console.log('[StorageService] 🍽️ Appended meal time to existing record:', mealTime.toISOString());
      } else {
        // Create new record
        const newRecord: FoodRecord = {
          userId,
          date: dateKey,
          mealTimes: [mealTime],
          lastMealTime: mealTime,
          createdAt: new Date(),
        };
        existingRecords.push(newRecord);
        console.log('[StorageService] 🍽️ Created new food record:', newRecord);
      }

      await this.saveFoodRecords(existingRecords);
    } catch (error) {
      console.error('[StorageService] ❌ Error recording meal time:', error);
      throw error;
    }
  }

  /**
   * Get all meal times for today.
   */
  static async getTodayMealTimes(userId: string): Promise<Date[]> {
    const today = new Date().toISOString().split('T')[0];
    const records = await this.getFoodRecords();
    const todayRecord = records.find(r => r.userId === userId && r.date === today);
    return todayRecord ? todayRecord.mealTimes : [];
  }

  /**
   * Get recent meal times within a specified window in hours.
   */
  static async getRecentMealTimes(userId: string, hoursWindow: number = 6): Promise<Date[]> {
    const allRecords = await this.getFoodRecords();
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hoursWindow);

    const recentTimes: Date[] = [];
    allRecords.forEach(r => {
      if (r.userId !== userId) return;
      r.mealTimes.forEach(t => {
        if (t >= cutoff) {
          recentTimes.push(t);
        }
      });
    });

    // Sort descending (latest first)
    recentTimes.sort((a, b) => b.getTime() - a.getTime());
    return recentTimes;
  }

  /**
   * Get meal times from the last 24 hours specifically.
   */
  static async getLast24HourMealTimes(userId: string): Promise<Date[]> {
    return this.getRecentMealTimes(userId, 24);
  }

  /**
   * Clear all meal times for a specific user and date.
   */
  static async clearMealTimesForDate(userId: string, date: string = new Date().toISOString().split('T')[0]): Promise<void> {
    try {
      const existingRecords = await this.getFoodRecords();
      const filteredRecords = existingRecords.filter(
        r => !(r.userId === userId && r.date === date)
      );
      
      const wasRemoved = existingRecords.length !== filteredRecords.length;
      if (wasRemoved) {
        await this.saveFoodRecords(filteredRecords);
        console.log('[StorageService] 🗑️ Cleared meal times for user:', userId, 'date:', date);
      } else {
        console.log('[StorageService] ℹ️ No meal times found to clear for user:', userId, 'date:', date);
      }
    } catch (error) {
      console.error('[StorageService] ❌ Error clearing meal times:', error);
      throw error;
    }
  }

  // Adjusted legacy method names
  static async addFoodRecord(record: FoodRecord): Promise<void> {
    console.warn('[StorageService] ⚠️ addFoodRecord is deprecated. Use addMealTime instead.');
    await this.addMealTime(record.userId, record.lastMealTime || new Date());
  }

  static async getTodayLastMealTime(userId: string): Promise<Date | null> {
    try {
      const times = await this.getTodayMealTimes(userId);
      return times.length ? times[times.length - 1] : null;
    } catch (error) {
      console.error('Error getting today last meal time:', error);
      return null;
    }
  }

  // Exercise Records Operations
  static async saveExerciseRecords(records: ExerciseRecord[]): Promise<void> {
    try {
      // Keep only last 30 days of records
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentRecords = records.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= thirtyDaysAgo;
      });

      await AsyncStorage.setItem(STORAGE_KEYS.EXERCISE_RECORDS, JSON.stringify(recentRecords));
    } catch (error) {
      console.error('Error saving exercise records:', error);
      throw new Error('Failed to save exercise records');
    }
  }

  static async getExerciseRecords(): Promise<ExerciseRecord[]> {
    try {
      const recordsData = await AsyncStorage.getItem(STORAGE_KEYS.EXERCISE_RECORDS);
      if (!recordsData) return [];
      
      const records = JSON.parse(recordsData);
      // Convert date strings back to Date objects
      return records.map((record: any) => ({
        ...record,
        exerciseTime: new Date(record.exerciseTime),
        createdAt: new Date(record.createdAt)
      }));
    } catch (error) {
      console.error('Error loading exercise records:', error);
      return [];
    }
  }

  static async addExerciseRecord(record: ExerciseRecord): Promise<void> {
    try {
      console.log('[StorageService] Adding exercise record:', {
        userId: record.userId,
        date: record.date,
        exerciseType: record.exerciseType,
        exerciseTime: record.exerciseTime.toISOString(),
        hoursAgo: record.hoursAgo
      });
      
      const existingRecords = await this.getExerciseRecords();
      
      // Remove any existing record for the same date and user
      const filteredRecords = existingRecords.filter(
        existing => !(existing.date === record.date && existing.userId === record.userId)
      );
      
      const wasReplacement = existingRecords.length !== filteredRecords.length;
      if (wasReplacement) {
        console.log('[StorageService] 🔄 Replacing existing exercise record for date:', record.date);
      }
      
      filteredRecords.push(record);
      await this.saveExerciseRecords(filteredRecords);
      
      console.log('[StorageService] ✅ Exercise record saved successfully. Total records:', filteredRecords.length);
    } catch (error) {
      console.error('[StorageService] ❌ Error adding exercise record:', error);
      throw error;
    }
  }

  static async getTodayExerciseData(userId: string): Promise<ExerciseRecord | null> {
    try {
      const records = await this.getExerciseRecords();
      const today = new Date().toISOString().split('T')[0];
      
      const todayRecord = records.find(
        record => record.userId === userId && record.date === today
      );
      
      return todayRecord || null;
    } catch (error) {
      console.error('Error getting today exercise data:', error);
      return null;
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
      
      // Convert date strings back to Date objects and validate/sanitize data
      const validatedDrinks = drinks
        .map((drink: any) => {
          // Sanitize and validate the drink data
          const sanitizedDrink = {
            ...drink,
            timestamp: new Date(drink.timestamp),
            recordedAt: new Date(drink.recordedAt),
            // Ensure numeric fields are valid numbers
            caffeineAmount: Number(drink.caffeineAmount) || 0,
            completionPercentage: Number(drink.completionPercentage) || 0,
            actualCaffeineConsumed: Number(drink.actualCaffeineConsumed) || 0
          };
          
          // Validate bounds
          sanitizedDrink.caffeineAmount = Math.max(0, Math.min(1000, sanitizedDrink.caffeineAmount));
          sanitizedDrink.completionPercentage = Math.max(0, Math.min(100, sanitizedDrink.completionPercentage));
          sanitizedDrink.actualCaffeineConsumed = Math.max(0, Math.min(1000, sanitizedDrink.actualCaffeineConsumed));
          
          return sanitizedDrink;
        })
        .filter((drink: any) => {
          // Filter out drinks with invalid data
          return drink.id && 
                 drink.name && 
                 drink.userId && 
                 !isNaN(drink.caffeineAmount) && 
                 !isNaN(drink.completionPercentage) && 
                 !isNaN(drink.actualCaffeineConsumed) &&
                 drink.timestamp instanceof Date && 
                 !isNaN(drink.timestamp.getTime()) &&
                 drink.recordedAt instanceof Date && 
                 !isNaN(drink.recordedAt.getTime());
        });
      
      console.log('[StorageService] 📊 Drinks data loaded and validated:', {
        totalRecords: drinks.length,
        validRecords: validatedDrinks.length,
        filteredOut: drinks.length - validatedDrinks.length
      });
      
      // If we filtered out invalid records, save the cleaned data back
      if (validatedDrinks.length !== drinks.length) {
        console.log('[StorageService] 🧹 Cleaning up invalid drink records...');
        await this.saveDrinksHistory(validatedDrinks);
      }
      
      return validatedDrinks;
    } catch (error) {
      console.error('Error loading drinks history:', error);
      return [];
    }
  }

  static async addDrinkRecord(drink: DrinkRecord): Promise<void> {
    try {
      console.log('[StorageService] Adding drink record:', {
        id: drink.id,
        userId: drink.userId,
        name: drink.name,
        caffeineAmount: drink.caffeineAmount,
        completionPercentage: drink.completionPercentage,
        actualCaffeineConsumed: drink.actualCaffeineConsumed,
        timeToConsume: drink.timeToConsume,
        timestamp: drink.timestamp.toISOString()
      });
      
      const existingDrinks = await this.getDrinksHistory();
      existingDrinks.push(drink);
      await this.saveDrinksHistory(existingDrinks);
      
      // Invalidate streak cache since adding a drink could change the streak
      const today = new Date().toISOString().split('T')[0];
      const drinkDate = drink.timestamp.toISOString().split('T')[0];
      
      // Only recalculate if the drink is from today (could affect current streak)
      if (drinkDate === today) {
        console.log('[StorageService] 🔄 Recalculating streak due to new drink today');
        await this.calculateUnder400Streak(drink.userId, true); // Force recalculate
      }
      
      // If there was a stored day score for this drink's date, remove it
      // so it can be recalculated with the updated drink data
      console.log('[StorageService] 🗑️ Clearing day score for date:', drinkDate);
      await this.removeDayScore(drink.userId, drinkDate);
      
      console.log('[StorageService] ✅ Drink record saved successfully. Total drinks:', existingDrinks.length);
    } catch (error) {
      console.error('[StorageService] ❌ Error adding drink record:', error);
      throw error;
    }
  }

  static async getDrinksLast24Hours(userId: string): Promise<DrinkRecord[]> {
    try {
      const allDrinks = await this.getDrinksHistory();
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      const last24HoursDrinks = allDrinks.filter(drink => 
        drink.userId === userId && drink.timestamp >= twentyFourHoursAgo
      );
      
      console.log('[StorageService] ⏰ Getting last 24h drinks:', {
        userId,
        cutoffTime: twentyFourHoursAgo.toISOString(),
        totalDrinks: allDrinks.length,
        last24hDrinks: last24HoursDrinks.length,
        drinkNames: last24HoursDrinks.map(d => `${d.name} (${d.timestamp.toLocaleTimeString()})`)
      });
      
      return last24HoursDrinks;
    } catch (error) {
      console.error('[StorageService] ❌ Error getting last 24h drinks:', error);
      return [];
    }
  }

  static async getDrinksToday(userId: string): Promise<DrinkRecord[]> {
    try {
      const allDrinks = await this.getDrinksHistory();
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of current day (midnight)
      
      const todaysDrinks = allDrinks.filter(drink => 
        drink.userId === userId && drink.timestamp >= today
      );
      
      console.log('[StorageService] 📅 Getting today\'s drinks:', {
        userId,
        todayDate: today.toDateString(),
        totalDrinks: allDrinks.length,
        todaysDrinks: todaysDrinks.length,
        drinkNames: todaysDrinks.map(d => d.name)
      });
      
      return todaysDrinks;
    } catch (error) {
      console.error('[StorageService] ❌ Error getting today\'s drinks:', error);
      return [];
    }
  }

  static async deleteDrinkRecord(drinkId: string): Promise<void> {
    try {
      console.log('[StorageService] 🗑️ Deleting drink record:', drinkId);
      
      const existingDrinks = await this.getDrinksHistory();
      const drinkToDelete = existingDrinks.find(drink => drink.id === drinkId);
      
      if (!drinkToDelete) {
        console.warn('[StorageService] ⚠️ Drink not found for deletion:', drinkId);
        return;
      }
      
      const filteredDrinks = existingDrinks.filter(drink => drink.id !== drinkId);
      await this.saveDrinksHistory(filteredDrinks);
      
      console.log('[StorageService] ✅ Drink record deleted successfully:', {
        deletedDrink: drinkToDelete.name,
        remainingDrinks: filteredDrinks.length
      });
      
      // Invalidate streak cache since deleting a drink could change the streak
      // Note: A deleted drink from any day could potentially affect the streak calculation
      // so we should always recalculate when a drink is deleted
      console.log('[StorageService] 🔄 Recalculating streak due to drink deletion');
      await this.calculateUnder400Streak(drinkToDelete.userId, true); // Force recalculate
      
      // If there was a stored day score for the deleted drink's date, remove it
      // so it can be recalculated with the updated drink data
      const drinkDate = drinkToDelete.timestamp.toISOString().split('T')[0];
      console.log('[StorageService] 🗑️ Clearing day score for date:', drinkDate);
      await this.removeDayScore(drinkToDelete.userId, drinkDate);
      
    } catch (error) {
      console.error('[StorageService] ❌ Error deleting drink record:', error);
      throw error;
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



  // Migration and Legacy Data Operations
  static async migrateLegacyDrinkData(): Promise<void> {
    try {
      // Check for old storage format (from existing HomeScreen)
      const legacyData = await AsyncStorage.getItem('jitter_drinks_data');
      if (!legacyData) return;
      
      const parsed = JSON.parse(legacyData);
      if (parsed.drinks && Array.isArray(parsed.drinks)) {
        // Convert legacy format to new format with validation
        const convertedDrinks: DrinkRecord[] = parsed.drinks
          .map((drink: any) => {
            // Sanitize numeric values
            const sanitizedDrink = {
              id: drink.id || Date.now().toString(),
              userId: 'migrated_user', // Will be updated when profile is available
              name: drink.name || 'Unknown Drink',
              caffeineAmount: Number(drink.caffeineAmount) || 0,
              completionPercentage: Number(drink.completionPercentage) || 100,
              actualCaffeineConsumed: Number(drink.actualCaffeineConsumed) || 0,
              timestamp: new Date(drink.recordedAt || drink.timestamp || Date.now()),
              timeToConsume: drink.timeToConsume || '00:05:00',
              recordedAt: new Date(drink.recordedAt || Date.now())
            };
            
            // Validate bounds
            sanitizedDrink.caffeineAmount = Math.max(0, Math.min(1000, sanitizedDrink.caffeineAmount));
            sanitizedDrink.completionPercentage = Math.max(0, Math.min(100, sanitizedDrink.completionPercentage));
            sanitizedDrink.actualCaffeineConsumed = Math.max(0, Math.min(1000, sanitizedDrink.actualCaffeineConsumed));
            
            return sanitizedDrink;
          })
          .filter((drink: any) => {
            // Only include drinks with valid data
            return drink.id && 
                   drink.name && 
                   !isNaN(drink.caffeineAmount) && 
                   !isNaN(drink.completionPercentage) && 
                   !isNaN(drink.actualCaffeineConsumed) &&
                   drink.timestamp instanceof Date && 
                   !isNaN(drink.timestamp.getTime());
          });
        
        await this.saveDrinksHistory(convertedDrinks);
        console.log('[StorageService] ✅ Migrated legacy drink data:', {
          originalCount: parsed.drinks.length,
          migratedCount: convertedDrinks.length
        });
      }
      
      // Remove legacy data
      await AsyncStorage.removeItem('jitter_drinks_data');
    } catch (error) {
      console.error('[StorageService] ❌ Error migrating legacy data:', error);
    }
  }

  // Calendar and Daily Score Operations
  static async saveDayScores(dayScores: DayScoreRecord[]): Promise<void> {
    try {
      // Keep only last 365 days of scores (1 year)
      const oneYearAgo = new Date();
      oneYearAgo.setDate(oneYearAgo.getDate() - 365);
      
      const recentScores = dayScores.filter(score => {
        const scoreDate = new Date(score.date);
        return scoreDate >= oneYearAgo;
      });

      await AsyncStorage.setItem(STORAGE_KEYS.DAY_SCORES, JSON.stringify(recentScores));
    } catch (error) {
      console.error('Error saving day scores:', error);
      throw new Error('Failed to save day scores');
    }
  }

  static async getDayScores(): Promise<DayScoreRecord[]> {
    try {
      const scoresData = await AsyncStorage.getItem(STORAGE_KEYS.DAY_SCORES);
      if (!scoresData) return [];
      
      const scores = JSON.parse(scoresData);
      // Convert date strings back to Date objects
      return scores.map((score: any) => ({
        ...score,
        createdAt: new Date(score.createdAt)
      }));
    } catch (error) {
      console.error('Error loading day scores:', error);
      return [];
    }
  }

  static async addDayScore(score: DayScoreRecord): Promise<void> {
    try {
      console.log('[StorageService] Adding day score:', {
        userId: score.userId,
        date: score.date,
        averagePeakScore: score.averagePeakScore,
        totalCaffeine: score.totalCaffeine
      });
      
      const existingScores = await this.getDayScores();
      
      // Remove any existing score for the same date and user
      const filteredScores = existingScores.filter(
        existing => !(existing.date === score.date && existing.userId === score.userId)
      );
      
      filteredScores.push(score);
      await this.saveDayScores(filteredScores);
      
      // Invalidate streak cache since completing a day could affect the streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = yesterday.toISOString().split('T')[0];
      
      // If recording score for yesterday, recalculate streak
      if (score.date === yesterdayKey) {
        console.log('[StorageService] 🔄 Recalculating streak due to completed day:', score.date);
        await this.calculateUnder400Streak(score.userId, true); // Force recalculate
      }
      
      console.log('[StorageService] ✅ Day score saved successfully');
    } catch (error) {
      console.error('[StorageService] ❌ Error adding day score:', error);
      throw error;
    }
  }

  static async removeDayScore(userId: string, date: string): Promise<void> {
    try {
      const existingScores = await this.getDayScores();
      const filteredScores = existingScores.filter(
        existing => !(existing.date === date && existing.userId === userId)
      );
      
      const wasRemoved = existingScores.length !== filteredScores.length;
      
      if (wasRemoved) {
        await this.saveDayScores(filteredScores);
        console.log('[StorageService] ✅ Day score removed for date:', date);
      } else {
        console.log('[StorageService] ℹ️ No day score found to remove for date:', date);
      }
    } catch (error) {
      console.error('[StorageService] ❌ Error removing day score:', error);
    }
  }

  static async getDayScore(userId: string, date: string): Promise<DayScoreRecord | null> {
    try {
      const scores = await this.getDayScores();
      return scores.find(score => score.userId === userId && score.date === date) || null;
    } catch (error) {
      console.error('Error getting day score:', error);
      return null;
    }
  }

  static async getDrinksForMonth(userId: string, year: number, month: number): Promise<DrinkRecord[]> {
    try {
      const allDrinks = await this.getDrinksHistory();
      
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
      
      const monthDrinks = allDrinks.filter(drink => 
        drink.userId === userId && 
        drink.timestamp >= monthStart && 
        drink.timestamp <= monthEnd
      );
      
      console.log('[StorageService] 📅 Getting drinks for month:', {
        userId,
        year,
        month,
        monthStart: monthStart.toDateString(),
        monthEnd: monthEnd.toDateString(),
        totalDrinks: allDrinks.length,
        monthDrinks: monthDrinks.length
      });
      
      return monthDrinks;
    } catch (error) {
      console.error('[StorageService] ❌ Error getting drinks for month:', error);
      return [];
    }
  }

  static async getDrinksForDate(userId: string, date: string): Promise<DrinkRecord[]> {
    try {
      const allDrinks = await this.getDrinksHistory();
      const targetDate = new Date(date);
      const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
      
      const dayDrinks = allDrinks.filter(drink => 
        drink.userId === userId && 
        drink.timestamp >= dayStart && 
        drink.timestamp <= dayEnd
      );
      
      return dayDrinks;
    } catch (error) {
      console.error('Error getting drinks for date:', error);
      return [];
    }
  }

  // Streak Operations
  static async saveStreakData(streak: StreakData): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.STREAK_DATA, JSON.stringify(streak));
    } catch (error) {
      console.error('Error saving streak data:', error);
      throw new Error('Failed to save streak data');
    }
  }

  static async getStreakData(): Promise<StreakData | null> {
    try {
      const streakData = await AsyncStorage.getItem(STORAGE_KEYS.STREAK_DATA);
      if (!streakData) return null;
      
      return JSON.parse(streakData);
    } catch (error) {
      console.error('Error loading streak data:', error);
      return null;
    }
  }

  static async calculateCalendarSummary(userId: string, year: number, month: number): Promise<CalendarSummary> {
    try {
      const monthDrinks = await this.getDrinksForMonth(userId, year, month);
      
      // Group drinks by day
      const drinksByDay: { [key: string]: DrinkRecord[] } = {};
      monthDrinks.forEach(drink => {
        const dateKey = drink.timestamp.toISOString().split('T')[0];
        if (!drinksByDay[dateKey]) {
          drinksByDay[dateKey] = [];
        }
        drinksByDay[dateKey].push(drink);
      });
      
      // Calculate daily totals
      const dailyTotals: { [key: string]: number } = {};
      Object.keys(drinksByDay).forEach(date => {
        dailyTotals[date] = drinksByDay[date].reduce((sum, drink) => sum + drink.actualCaffeineConsumed, 0);
      });
      
      const totalCaffeine = Object.values(dailyTotals).reduce((sum, daily) => sum + daily, 0);
      const daysWithData = Object.keys(dailyTotals).length;
      const averageDailyCaffeine = daysWithData > 0 ? Math.round(totalCaffeine / daysWithData) : 0;
      
      // Find worst day
      let worstDay = null;
      let maxCaffeine = 0;
      Object.entries(dailyTotals).forEach(([date, caffeine]) => {
        if (caffeine > maxCaffeine) {
          maxCaffeine = caffeine;
          const dayOfMonth = new Date(date).getDate();
          worstDay = { day: dayOfMonth, amount: caffeine };
        }
      });
      
      // Calculate streak (this is complex - let's calculate it properly)
      const under400Streak = await this.calculateUnder400Streak(userId);
      
      return {
        month,
        year,
        totalCaffeine,
        averageDailyCaffeine,
        worstDay,
        under400Streak,
        daysWithData
      };
    } catch (error) {
      console.error('Error calculating calendar summary:', error);
      return {
        month,
        year,
        totalCaffeine: 0,
        averageDailyCaffeine: 0,
        worstDay: null,
        under400Streak: 0,
        daysWithData: 0
      };
    }
  }

  static async calculateUnder400Streak(userId: string, forceRecalculate: boolean = false): Promise<number> {
    try {
      const today = new Date();
      const todayKey = today.toISOString().split('T')[0];
      
      console.log('[StorageService] 🔄 Calculating Under 400mg Streak for user:', userId);
      
      // Always recalculate for now to debug the issue
      // Later we can re-enable caching once it works
      console.log('[StorageService] 🔄 Force recalculating streak (debugging mode)');
      
      // Get ALL drinks history (not just recent)
      const allDrinks = await this.getDrinksHistory();
      const userDrinks = allDrinks.filter(drink => drink.userId === userId);
      
      console.log('[StorageService] 📊 Raw drinks data:', {
        userId,
        totalDrinks: allDrinks.length,
        userDrinks: userDrinks.length,
        todayKey
      });
      
      // If no drinks for this user, streak is 0
      if (userDrinks.length === 0) {
        console.log('[StorageService] ❌ No drinks found for user, streak = 0');
        return 0;
      }
      
      // Group drinks by date and calculate daily totals
      const dailyCaffeineByDate: { [date: string]: number } = {};
      
      userDrinks.forEach(drink => {
        const drinkDate = drink.timestamp.toISOString().split('T')[0];
        if (!dailyCaffeineByDate[drinkDate]) {
          dailyCaffeineByDate[drinkDate] = 0;
        }
        dailyCaffeineByDate[drinkDate] += drink.actualCaffeineConsumed;
        
        console.log(`[StorageService] 📊 Drink on ${drinkDate}: +${drink.actualCaffeineConsumed}mg (total: ${dailyCaffeineByDate[drinkDate]}mg)`);
      });
      
      console.log('[StorageService] 📊 Daily caffeine totals:', dailyCaffeineByDate);
      
      // Calculate streak: start from today and go backwards
      let currentStreak = 0;
      let streakStartDate = todayKey;
      
      // Get all dates that have drinks, sorted from newest to oldest
      const datesWithDrinks = Object.keys(dailyCaffeineByDate).sort().reverse();
      console.log('[StorageService] 📊 Dates with drinks (newest first):', datesWithDrinks);
      
      // Simple logic: go through each day starting from most recent
      for (const dateKey of datesWithDrinks) {
        const dailyTotal = dailyCaffeineByDate[dateKey];
        
        console.log(`[StorageService] 🧮 Checking date ${dateKey}: ${dailyTotal}mg`);
        
        if (dailyTotal < 400) {
          currentStreak++;
          streakStartDate = dateKey;
          console.log(`[StorageService] ✅ Date ${dateKey} counts! Streak now: ${currentStreak}`);
        } else {
          console.log(`[StorageService] ❌ Date ${dateKey} breaks streak (${dailyTotal}mg >= 400mg)`);
          break; // Streak broken
        }
        
        // Special case: if this is the first date we checked and it's not today,
        // then we need to check if there are any days in between
        if (currentStreak === 1 && dateKey !== todayKey) {
          // There's a gap between today and the most recent drink day
          console.log(`[StorageService] ⚠️ Gap detected: most recent drink is ${dateKey}, but today is ${todayKey}`);
          // Reset streak since there's a gap
          currentStreak = 0;
          break;
        }
      }
      
      // Alternative approach: check consecutive days backwards from today
      if (datesWithDrinks.length > 0) {
        console.log('[StorageService] 🔄 Double-checking with consecutive day approach...');
        
        let consecutiveStreak = 0;
        const checkDate = new Date(today);
        
        // Go backwards from today, day by day
        for (let daysBack = 0; daysBack < 365; daysBack++) {
          const checkDateKey = checkDate.toISOString().split('T')[0];
          const dailyTotal = dailyCaffeineByDate[checkDateKey];
          
          console.log(`[StorageService] 🧮 Day ${daysBack} ago (${checkDateKey}): ${dailyTotal || 0}mg`);
          
          if (dailyTotal !== undefined && dailyTotal < 400) {
            consecutiveStreak++;
            console.log(`[StorageService] ✅ Consecutive day ${checkDateKey} counts! Streak: ${consecutiveStreak}`);
          } else if (dailyTotal !== undefined && dailyTotal >= 400) {
            console.log(`[StorageService] ❌ Consecutive streak broken on ${checkDateKey}: ${dailyTotal}mg >= 400mg`);
            break;
          } else {
            // No drinks this day
            if (daysBack === 0) {
              // Today has no drinks, skip it and continue
              console.log(`[StorageService] ⏭️ Today has no drinks yet, checking previous days...`);
            } else {
              // Previous day has no drinks, streak broken
              console.log(`[StorageService] ❌ Consecutive streak broken on ${checkDateKey}: no drinks recorded`);
              break;
            }
          }
          
          // Move to previous day
          checkDate.setDate(checkDate.getDate() - 1);
        }
        
        console.log(`[StorageService] 📊 Consecutive approach result: ${consecutiveStreak} vs original: ${currentStreak}`);
        currentStreak = consecutiveStreak; // Use the consecutive day approach
      }
      
      // Cache the result
      const streakData: StreakData = {
        currentStreak,
        lastCalculatedDate: todayKey,
        streakStartDate
      };
      await this.saveStreakData(streakData);
      
      console.log('[StorageService] ✅ Final streak calculation result:', {
        currentStreak,
        streakStartDate,
        lastCalculatedDate: todayKey,
        userId
      });
      
      return currentStreak;
      
    } catch (error) {
      console.error('[StorageService] ❌ Error calculating under 400 streak:', error);
      return 0;
    }
  }

  static async getCalendarDayData(userId: string, year: number, month: number): Promise<CalendarDayData[]> {
    try {
      const monthDrinks = await this.getDrinksForMonth(userId, year, month);
      const dayScores = await this.getDayScores();
      
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const today = new Date();
      const todayKey = today.toISOString().split('T')[0];
      
      const calendarDays: CalendarDayData[] = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateKey = date.toISOString().split('T')[0];
        
        // Get drinks for this day
        const dayDrinks = monthDrinks.filter(drink => {
          const drinkDateKey = drink.timestamp.toISOString().split('T')[0];
          return drinkDateKey === dateKey;
        });
        
        const totalCaffeine = dayDrinks.reduce((sum, drink) => sum + drink.actualCaffeineConsumed, 0);
        
        // Get scores for this day
        const dayScore = dayScores.find(score => score.userId === userId && score.date === dateKey);
        
        calendarDays.push({
          date: dateKey,
          dayNumber: day,
          totalCaffeine,
          averagePeakScore: dayScore?.averagePeakScore,
          displayColor: dayScore?.displayColor,
          isToday: dateKey === todayKey,
          hasData: dayDrinks.length > 0 || !!dayScore
        });
      }
      
      return calendarDays;
    } catch (error) {
      console.error('Error getting calendar day data:', error);
      return [];
    }
  }

  // Planning Operations
  static async saveFocusSessions(sessions: FocusSession[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FOCUS_SESSIONS, JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving focus sessions:', error);
      throw new Error('Failed to save focus sessions');
    }
  }

  static async getFocusSessions(): Promise<FocusSession[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FOCUS_SESSIONS);
      if (!data) return [];
      
      const sessions = JSON.parse(data);
      return sessions.map((session: any) => ({
        ...session,
        startTime: new Date(session.startTime),
        endTime: new Date(session.endTime),
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt)
      }));
    } catch (error) {
      console.error('Error loading focus sessions:', error);
      return [];
    }
  }

  static async getFocusSessionsForUser(userId: string): Promise<FocusSession[]> {
    try {
      const allSessions = await this.getFocusSessions();
      return allSessions.filter(session => session.userId === userId);
    } catch (error) {
      console.error('Error loading user focus sessions:', error);
      return [];
    }
  }

  static async saveCaffeinePlans(plans: CaffeinePlan[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CAFFEINE_PLANS, JSON.stringify(plans));
    } catch (error) {
      console.error('Error saving caffeine plans:', error);
      throw new Error('Failed to save caffeine plans');
    }
  }

  static async getCaffeinePlans(): Promise<CaffeinePlan[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CAFFEINE_PLANS);
      if (!data) return [];
      
      const plans = JSON.parse(data);
      return plans.map((plan: any) => ({
        ...plan,
        bedtime: new Date(plan.bedtime),
        sessions: plan.sessions.map((session: any) => ({
          ...session,
          startTime: new Date(session.startTime),
          endTime: new Date(session.endTime),
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt)
        })),
        recommendations: plan.recommendations.map((rec: any) => ({
          ...rec,
          recommendedTime: new Date(rec.recommendedTime)
        })),
        latestSafeCaffeineTime: new Date(plan.latestSafeCaffeineTime),
        generatedAt: new Date(plan.generatedAt),
        lastUpdatedAt: new Date(plan.lastUpdatedAt)
      }));
    } catch (error) {
      console.error('Error loading caffeine plans:', error);
      return [];
    }
  }

  static async getTodaysPlan(userId: string): Promise<CaffeinePlan | null> {
    try {
      const allPlans = await this.getCaffeinePlans();
      const today = new Date().toISOString().split('T')[0];
      
      return allPlans.find(plan => 
        plan.userId === userId && plan.planDate === today
      ) || null;
    } catch (error) {
      console.error('Error loading today\'s plan:', error);
      return null;
    }
  }

  static async savePlanningPreferences(preferences: PlanningPreferences): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PLANNING_PREFERENCES, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving planning preferences:', error);
      throw new Error('Failed to save planning preferences');
    }
  }

  static async getPlanningPreferences(): Promise<PlanningPreferences | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PLANNING_PREFERENCES);
      if (!data) return null;
      
      const preferences = JSON.parse(data);
      return {
        ...preferences,
        createdAt: new Date(preferences.createdAt),
        updatedAt: new Date(preferences.updatedAt)
      };
    } catch (error) {
      console.error('Error loading planning preferences:', error);
      return null;
    }
  }

  static async addFocusSession(session: FocusSession): Promise<void> {
    try {
      const sessions = await this.getFocusSessions();
      sessions.push(session);
      await this.saveFocusSessions(sessions);
    } catch (error) {
      console.error('Error adding focus session:', error);
      throw error;
    }
  }

  static async updateFocusSession(sessionId: string, updates: Partial<FocusSession>): Promise<void> {
    try {
      const sessions = await this.getFocusSessions();
      const index = sessions.findIndex(s => s.id === sessionId);
      
      if (index === -1) {
        throw new Error('Focus session not found');
      }
      
      sessions[index] = {
        ...sessions[index],
        ...updates,
        updatedAt: new Date()
      };
      
      await this.saveFocusSessions(sessions);
    } catch (error) {
      console.error('Error updating focus session:', error);
      throw error;
    }
  }

  static async deleteFocusSession(sessionId: string): Promise<void> {
    try {
      const sessions = await this.getFocusSessions();
      const filteredSessions = sessions.filter(s => s.id !== sessionId);
      await this.saveFocusSessions(filteredSessions);
    } catch (error) {
      console.error('Error deleting focus session:', error);
      throw error;
    }
  }

  static async saveCaffeinePlan(plan: CaffeinePlan): Promise<void> {
    try {
      const plans = await this.getCaffeinePlans();
      
      // Remove any existing plan for the same user and date
      const filteredPlans = plans.filter(p => 
        !(p.userId === plan.userId && p.planDate === plan.planDate)
      );
      
      filteredPlans.push(plan);
      await this.saveCaffeinePlans(filteredPlans);
    } catch (error) {
      console.error('Error saving caffeine plan:', error);
      throw error;
    }
  }

  // Previous CaffScore Operations
  static async savePreviousCaffScore(userId: string, score: number): Promise<void> {
    try {
      const data = {
        userId,
        score,
        savedAt: new Date().toISOString()
      };
      await AsyncStorage.setItem(STORAGE_KEYS.PREVIOUS_CAFF_SCORE, JSON.stringify(data));
      console.log('[StorageService] ✅ Previous CaffScore saved:', {
        userId,
        score,
        savedAt: data.savedAt
      });
    } catch (error) {
      console.error('[StorageService] ❌ Error saving previous CaffScore:', error);
      throw error;
    }
  }

  static async getPreviousCaffScore(userId: string): Promise<number> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PREVIOUS_CAFF_SCORE);
      if (!data) {
        console.log('[StorageService] ⚠️ No previous CaffScore found, returning 0');
        return 0;
      }
      
      const parsed = JSON.parse(data);
      if (parsed.userId !== userId) {
        console.log('[StorageService] ⚠️ Previous CaffScore is for different user, returning 0');
        return 0;
      }
      
      console.log('[StorageService] ✅ Previous CaffScore loaded:', {
        userId: parsed.userId,
        score: parsed.score,
        savedAt: parsed.savedAt
      });
      
      return parsed.score || 0;
    } catch (error) {
      console.error('[StorageService] ❌ Error loading previous CaffScore:', error);
      return 0;
    }
  }

  // Current Caffeine Status Operations
  static async saveCurrentCaffeineStatus(userId: string, status: string): Promise<void> {
    try {
      const data = {
        userId,
        status,
        savedAt: new Date().toISOString()
      };
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_CAFFEINE_STATUS, JSON.stringify(data));
      console.log('[StorageService] ✅ Current caffeine status saved:', {
        userId,
        status,
        savedAt: data.savedAt
      });
    } catch (error) {
      console.error('[StorageService] ❌ Error saving current caffeine status:', error);
      throw error;
    }
  }

  static async getCurrentCaffeineStatus(userId: string): Promise<string> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_CAFFEINE_STATUS);
      if (!data) {
        console.log('[StorageService] ⚠️ No current caffeine status found, returning default');
        return "No active caffeine detected";
      }
      
      const parsed = JSON.parse(data);
      if (parsed.userId !== userId) {
        console.log('[StorageService] ⚠️ Current caffeine status is for different user, returning default');
        return "No active caffeine detected";
      }
      
      console.log('[StorageService] ✅ Current caffeine status loaded:', {
        userId: parsed.userId,
        status: parsed.status,
        savedAt: parsed.savedAt
      });
      
      return parsed.status || "No active caffeine detected";
    } catch (error) {
      console.error('[StorageService] ❌ Error loading current caffeine status:', error);
      return "No active caffeine detected";
    }
  }

  static async clearDailyTrackingData(userId: string): Promise<void> {
    try {
      console.log('[StorageService] 🧹 Clearing daily tracking data for user:', userId);

      // Determine date keys
      const today = new Date();
      const todayKey = today.toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = yesterday.toISOString().split('T')[0];

      // --- Sleep (yesterday) ---
      const sleepRecords = await this.getSleepRecords();
      const filteredSleep = sleepRecords.filter(
        r => !(r.userId === userId && r.date === yesterdayKey),
      );
      if (filteredSleep.length !== sleepRecords.length) {
        console.log('[StorageService] 🗑️ Removed last night sleep record');
        await this.saveSleepRecords(filteredSleep);
      }

      // --- Stress (today) ---
      const stressRecords = await this.getStressRecords();
      const filteredStress = stressRecords.filter(
        r => !(r.userId === userId && r.date === todayKey),
      );
      if (filteredStress.length !== stressRecords.length) {
        console.log('[StorageService] 🗑️ Removed today stress record');
        await this.saveStressRecords(filteredStress);
      }

      // --- Food/Meal (today) ---
      const foodRecords = await this.getFoodRecords();
      const filteredFood = foodRecords.filter(
        r => !(r.userId === userId && r.date === todayKey),
      );
      if (filteredFood.length !== foodRecords.length) {
        console.log('[StorageService] 🗑️ Removed today food record');
        await this.saveFoodRecords(filteredFood);
      }

      // --- Exercise (today) ---
      const exerciseRecords = await this.getExerciseRecords();
      const filteredExercise = exerciseRecords.filter(
        r => !(r.userId === userId && r.date === todayKey),
      );
      if (filteredExercise.length !== exerciseRecords.length) {
        console.log('[StorageService] 🗑️ Removed today exercise record');
        await this.saveExerciseRecords(filteredExercise);
      }

      console.log('[StorageService] ✅ Daily tracking data cleared for user:', userId);
    } catch (error) {
      console.error('[StorageService] ❌ Error clearing daily tracking data:', error);
    }
  }

  // Utility Operations
  static async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE),
        AsyncStorage.removeItem(STORAGE_KEYS.SLEEP_RECORDS),
        AsyncStorage.removeItem(STORAGE_KEYS.STRESS_RECORDS),
        AsyncStorage.removeItem(STORAGE_KEYS.FOOD_RECORDS),
        AsyncStorage.removeItem(STORAGE_KEYS.EXERCISE_RECORDS),
        AsyncStorage.removeItem(STORAGE_KEYS.DRINKS_HISTORY),
        AsyncStorage.removeItem(STORAGE_KEYS.DAY_SCORES),
        AsyncStorage.removeItem(STORAGE_KEYS.STREAK_DATA),
        AsyncStorage.removeItem(STORAGE_KEYS.FOCUS_SESSIONS),
        AsyncStorage.removeItem(STORAGE_KEYS.CAFFEINE_PLANS),
        AsyncStorage.removeItem(STORAGE_KEYS.PLANNING_PREFERENCES),
        AsyncStorage.removeItem(STORAGE_KEYS.PREVIOUS_CAFF_SCORE),
        AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_CAFFEINE_STATUS)
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
    dayScoresCount: number;
    streakDataExists: boolean;
  }> {
    try {
      const [profile, sleepRecords, drinks, dayScores, streakData] = await Promise.all([
        this.getUserProfile(),
        this.getSleepRecords(),
        this.getDrinksHistory(),
        this.getDayScores(),
        this.getStreakData()
      ]);

      return {
        profileExists: profile !== null,
        sleepRecordsCount: sleepRecords.length,
        drinksCount: drinks.length,
        dayScoresCount: dayScores.length,
        streakDataExists: streakData !== null
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return {
        profileExists: false,
        sleepRecordsCount: 0,
        drinksCount: 0,
        dayScoresCount: 0,
        streakDataExists: false
      };
    }
  }
} 