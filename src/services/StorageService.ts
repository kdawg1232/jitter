import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, DrinkRecord, SleepRecord, CrashRiskResult, DayScoreRecord, StreakData, CalendarSummary, CalendarDayData, STORAGE_KEYS } from '../types';

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
      console.log('[StorageService] 💾 Saving crash risk cache:', {
        score: result.score,
        calculatedAt: result.calculatedAt.toISOString(),
        validUntil: result.validUntil.toISOString(),
        currentCaffeineLevel: result.currentCaffeineLevel,
        peakCaffeineLevel: result.peakCaffeineLevel
      });
      
      await AsyncStorage.setItem(STORAGE_KEYS.CRASH_RISK_CACHE, JSON.stringify(result));
      console.log('[StorageService] ✅ Crash risk cache saved successfully');
    } catch (error) {
      console.error('[StorageService] ❌ Error saving crash risk cache:', error);
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

  // Calendar and Daily Score Operations
  static async saveDayScores(dayScores: DayScoreRecord[]): Promise<void> {
    try {
      // Keep only last 90 days of scores
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const recentScores = dayScores.filter(score => {
        const scoreDate = new Date(score.date);
        return scoreDate >= ninetyDaysAgo;
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
        averageCrashRisk: score.averageCrashRisk,
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
          averageCrashRisk: dayScore?.averageCrashRisk,
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

  // Utility Operations
  static async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE),
        AsyncStorage.removeItem(STORAGE_KEYS.SLEEP_RECORDS),
        AsyncStorage.removeItem(STORAGE_KEYS.DRINKS_HISTORY),
        AsyncStorage.removeItem(STORAGE_KEYS.CRASH_RISK_CACHE),
        AsyncStorage.removeItem(STORAGE_KEYS.DAY_SCORES),
        AsyncStorage.removeItem(STORAGE_KEYS.STREAK_DATA)
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
    dayScoresCount: number;
    streakDataExists: boolean;
  }> {
    try {
      const [profile, sleepRecords, drinks, cache, dayScores, streakData] = await Promise.all([
        this.getUserProfile(),
        this.getSleepRecords(),
        this.getDrinksHistory(),
        this.getCrashRiskCache(),
        this.getDayScores(),
        this.getStreakData()
      ]);

      return {
        profileExists: profile !== null,
        sleepRecordsCount: sleepRecords.length,
        drinksCount: drinks.length,
        cacheExists: cache !== null,
        dayScoresCount: dayScores.length,
        streakDataExists: streakData !== null
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return {
        profileExists: false,
        sleepRecordsCount: 0,
        drinksCount: 0,
        cacheExists: false,
        dayScoresCount: 0,
        streakDataExists: false
      };
    }
  }
} 