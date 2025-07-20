import { 
  UserProfile, 
  DrinkRecord, 
  FocusResult,
  FocusFactors,
  DEFAULT_VALUES 
} from '../types';
import { ValidationService } from './ValidationService';

import { StorageService } from './StorageService';

export class CaffScoreService {
  /**
   * Calculate current caffeine level factor for focus
   * Optimal focus zone is around 100-150% of tolerance threshold
   */
  private static calculateFocusLevelFactor(currentLevel: number, toleranceThreshold: number): number {
    const normalized = currentLevel / Math.max(toleranceThreshold, 1);
    
    console.log('[CaffScoreService] 🧮 Level factor calculation:', {
      currentLevel,
      toleranceThreshold,
      normalized: normalized.toFixed(3)
    });
    
    // Optimal focus zone: 100-150% of tolerance
    const optimalRange = 1.25; // 125% of tolerance is optimal caffeine effect
    
    if (normalized <= 0.3) {
      // Very low levels = poor focus
      const result = normalized * 0.3;
      console.log('[CaffScoreService] 📉 Low caffeine level, poor focus:', result.toFixed(3));
      return result;
    } else if (normalized <= optimalRange) {
      // Building to optimal focus zone
      const result = 0.1 + (normalized - 0.3) * 0.9; // Scale from 0.1 to 1.0
      console.log('[CaffScoreService] 📈 Building to optimal focus:', result.toFixed(3));
      return result;
    } else if (normalized <= 2.0) {
      // Above optimal but still productive
      const result = Math.max(1.0 - (normalized - optimalRange) * 0.5, 0.3);
      console.log('[CaffScoreService] ⚖️ Above optimal but productive:', result.toFixed(3));
      return result;
    } else {
      // Too high = overstimulation, poor focus
      console.log('[CaffScoreService] 🔥 Too high, overstimulation: 0.2');
      return 0.2;
    }
  }

  /**
   * Calculate rising rate factor for focus
   * Moderate rise is optimal, too fast = overstimulating
   */
  private static calculateFocusRisingRate(
    drinks: DrinkRecord[], 
    halfLife: number, 
    currentTime: Date
  ): number {
    const now = currentTime.getTime();
    const tenMinutesAgo = now - (10 * 60 * 1000);
    const twentyMinutesAgo = now - (20 * 60 * 1000);
    
    const currentLevel = CaffScoreService.calculateCurrentCaffeineLevel(drinks, halfLife, currentTime);
    const level10MinAgo = CaffScoreService.calculateCurrentCaffeineLevel(drinks, halfLife, new Date(tenMinutesAgo));
    const level20MinAgo = CaffScoreService.calculateCurrentCaffeineLevel(drinks, halfLife, new Date(twentyMinutesAgo));
    
    // Calculate rate of change (mg/min)
    const recentRate = (currentLevel - level10MinAgo) / 10;
    const earlierRate = (level10MinAgo - level20MinAgo) / 10;
    const avgRate = (recentRate + earlierRate) / 2;
    
    console.log('[CaffScoreService] 📊 Rising rate calculation:', {
      currentLevel: currentLevel.toFixed(1),
      level10MinAgo: level10MinAgo.toFixed(1),
      level20MinAgo: level20MinAgo.toFixed(1),
      recentRate: recentRate.toFixed(2),
      earlierRate: earlierRate.toFixed(2),
      avgRate: avgRate.toFixed(2)
    });
    
    // Optimal rise rate for focus: 2-5 mg/min
    const optimalMinRate = 2;
    const optimalMaxRate = 5;
    
    if (avgRate < 0) {
      // Declining = suboptimal for focus
      const result = Math.max(0.2, 0.5 + avgRate * 0.1);
      console.log('[CaffScoreService] 📉 Declining rate, suboptimal:', result.toFixed(3));
      return result;
    } else if (avgRate <= optimalMinRate) {
      // Slow rise = building focus
      const result = 0.3 + (avgRate / optimalMinRate) * 0.4;
      console.log('[CaffScoreService] 🐌 Slow rise, building focus:', result.toFixed(3));
      return result;
    } else if (avgRate <= optimalMaxRate) {
      // Optimal rise rate = best focus
      const result = 0.7 + ((avgRate - optimalMinRate) / (optimalMaxRate - optimalMinRate)) * 0.3;
      console.log('[CaffScoreService] 🎯 Optimal rise rate, best focus:', result.toFixed(3));
      return result;
    } else {
      // Too fast = overstimulating
      const result = Math.max(0.4 - (avgRate - optimalMaxRate) * 0.05, 0.1);
      console.log('[CaffScoreService] 🚀 Too fast, overstimulating:', result.toFixed(3));
      return result;
    }
  }

  /**
   * Enhanced tolerance factor calculation using comprehensive user data
   * Higher tolerance = better focus capacity
   */
  private static calculateFocusTolerance(
    meanDailyMg: number, 
    weightKg: number, 
    userProfile: UserProfile
  ): number {
    const moderateIntake = 4; // mg/kg/day baseline
    let baseTolerance = meanDailyMg / (moderateIntake * weightKg);
    
    console.log('[CaffScoreService] 💪 Enhanced tolerance calculation - base:', {
      meanDailyMg,
      weightKg,
      baseModerateIntake: moderateIntake,
      baseTolerance: baseTolerance.toFixed(3)
    });
    
    // Health factor adjustments
    let healthMultiplier = 1.0;
    
    // Age factor - metabolism changes with age
    if (userProfile.age >= 65) {
      healthMultiplier *= 0.8; // Slower metabolism in elderly
      console.log('[CaffScoreService] 👴 Age factor (65+): 0.8x');
    } else if (userProfile.age <= 18) {
      healthMultiplier *= 1.1; // Faster metabolism in youth
      console.log('[CaffScoreService] 👶 Age factor (≤18): 1.1x');
    }
    
    // Sex-based differences in caffeine metabolism
    if (userProfile.sex === 'female') {
      healthMultiplier *= 0.9; // Generally slower caffeine clearance
      console.log('[CaffScoreService] 👩 Sex factor (female): 0.9x');
    }
    
    // Smoking status - significantly affects tolerance
    if (userProfile.smoker) {
      healthMultiplier *= 1.5; // Smokers develop higher tolerance faster
      console.log('[CaffScoreService] 🚬 Smoking factor: 1.5x');
    }
    
    // Pregnancy factor - affects tolerance building
    if (userProfile.pregnant) {
      healthMultiplier *= 0.4; // Pregnancy significantly reduces tolerance
      console.log('[CaffScoreService] 🤱 Pregnancy factor: 0.4x');
    }
    
    // Oral contraceptives factor
    if (userProfile.sex === 'female' && userProfile.oralContraceptives && !userProfile.pregnant) {
      healthMultiplier *= 0.85; // Slower caffeine clearance
      console.log('[CaffScoreService] 💊 Oral contraceptives factor: 0.85x');
    }
    
    // Apply health multiplier to base tolerance
    const adjustedTolerance = baseTolerance * healthMultiplier;
    
    // Experience factor - if someone reports high daily intake, they likely have developed tolerance
    let experienceFactor = 1.0;
    if (meanDailyMg > 400) {
      experienceFactor = 1.2; // Heavy users likely have good tolerance
      console.log('[CaffScoreService] ☕ Heavy user experience factor: 1.2x');
    } else if (meanDailyMg < 50) {
      experienceFactor = 0.7; // Light users have lower tolerance
      console.log('[CaffScoreService] 🫖 Light user experience factor: 0.7x');
    }
    
    const finalTolerance = adjustedTolerance * experienceFactor;
    
    // For focus, higher tolerance is good (up to a point)
    const result = Math.max(0.1, Math.min(1.0, finalTolerance * 0.7 + 0.3));
    
    console.log('[CaffScoreService] 💪 Enhanced tolerance calculation complete:', {
      baseTolerance: baseTolerance.toFixed(3),
      healthMultiplier: healthMultiplier.toFixed(3),
      adjustedTolerance: adjustedTolerance.toFixed(3),
      experienceFactor: experienceFactor.toFixed(3),
      finalTolerance: finalTolerance.toFixed(3),
      result: result.toFixed(3)
    });
    
    return result;
  }

  /**
   * Calculate focus capacity factor based on sleep and circadian rhythms
   * Better sleep = better focus capacity
   */
  private static calculateFocusCapacity(
    sleepDebt: number, 
    circadianFactor: number, 
    age: number
  ): number {
    // Sleep debt hurts focus (inverse of sleep debt)
    const sleepFocus = Math.max(0, 1 - sleepDebt * 0.8);
    
    // Circadian factor affects focus (morning/midday best for focus)
    const circadianFocus = 1 - circadianFactor * 0.4; // Lower sensitivity = better focus
    
    // Age factor for focus
    const ageFocus = age < 25 ? 0.9 : (age > 60 ? 0.8 : 1.0);
    
    const result = Math.max(0.1, Math.min(1.0, sleepFocus * 0.6 + circadianFocus * 0.3 + ageFocus * 0.1));
    
    console.log('[CaffScoreService] 🧠 Focus capacity calculation:', {
      sleepDebt: sleepDebt.toFixed(3),
      circadianFactor: circadianFactor.toFixed(3),
      age,
      sleepFocus: sleepFocus.toFixed(3),
      circadianFocus: circadianFocus.toFixed(3),
      ageFocus,
      result: result.toFixed(3)
    });
    
    return result;
  }

  /**
   * Calculate current caffeine activity factor
   * Uses a simplified but reliable absorption model
   */
  private static calculateCurrentCaffeineActivity(
    drinks: DrinkRecord[], 
    halfLife: number, 
    currentTime: Date
  ): number {
    let totalActiveEffect = 0;
    
    console.log('[CaffScoreService] 🔄 Current caffeine activity calculation for', drinks.length, 'drinks');
    
    drinks.forEach((drink, index) => {
      const hoursElapsed = (currentTime.getTime() - drink.timestamp.getTime()) / (1000 * 60 * 60);
      
      if (hoursElapsed >= 0) {
        // Use the same reliable calculation as currentCaffeineLevel
        let contribution = drink.actualCaffeineConsumed * Math.pow(2, -hoursElapsed / halfLife);
        
        // Apply absorption factor based on time elapsed
        if (hoursElapsed < 0.25) {
          // Less than 15 minutes - early absorption phase
          contribution *= 0.3 + (hoursElapsed / 0.25) * 0.4; // 30% to 70%
        } else if (hoursElapsed < 1.0) {
          // 15 minutes to 1 hour - peak absorption phase
          contribution *= 0.7 + (hoursElapsed - 0.25) / 0.75 * 0.3; // 70% to 100%
        } else if (hoursElapsed < 2.0) {
          // 1 to 2 hours - full absorption
          contribution *= 1.0;
        } else {
          // After 2 hours - full absorption but declining levels
          contribution *= 1.0;
        }
        
        totalActiveEffect += contribution;
        
        console.log(`[CaffScoreService] ⚡ Drink ${index + 1} current activity:`, {
          name: drink.name,
          hoursElapsed: hoursElapsed.toFixed(2),
          contribution: contribution.toFixed(1),
          timeToConsume: drink.timeToConsume
        });
      }
    });
    
    // Normalize against typical effective dose (200mg)
    const result = Math.max(0, Math.min(1, totalActiveEffect / 200));
    
    console.log('[CaffScoreService] 🔄 Total current activity:', {
      totalActiveEffect: totalActiveEffect.toFixed(1),
      normalized: result.toFixed(3)
    });
    
    return result;
  }

  /**
   * Calculate CaffScore - Current Focus Potential from Caffeine
   * Formula: CaffScore = 100 × (C^1.0) × (R^0.2) × (T^0.3) × (F^0.3) × (A^0.6)
   * Emphasizes current caffeine levels and activity over predictive factors
   */
  static async calculateFocusScore(
    userProfile: UserProfile,
    drinks: DrinkRecord[],
    currentTime: Date = new Date()
  ): Promise<FocusResult> {
    console.log('[CaffScoreService] 🎯 Starting CaffScore calculation for user:', userProfile.userId);
    
    // Retrieve sleep data from storage
    const lastNightSleep = await StorageService.getLastNightSleep(userProfile.userId);
    const effectiveSleepHours = lastNightSleep || DEFAULT_VALUES.BASELINE_SLEEP_HOURS;
    
    // Validate inputs and filter out invalid drinks
    const validDrinks = drinks.filter(drink => {
      const isValid = drink.caffeineAmount >= 0 && 
                     drink.caffeineAmount <= 1000 && 
                     drink.actualCaffeineConsumed >= 0 && 
                     drink.actualCaffeineConsumed <= 1000 &&
                     drink.completionPercentage >= 0 && 
                     drink.completionPercentage <= 100 &&
                     drink.timestamp instanceof Date &&
                     !isNaN(drink.timestamp.getTime());
      
      if (!isValid) {
        console.warn('[CaffScoreService] ⚠️ Filtering out invalid drink:', {
          name: drink.name,
          caffeineAmount: drink.caffeineAmount,
          actualCaffeineConsumed: drink.actualCaffeineConsumed,
          completionPercentage: drink.completionPercentage
        });
      }
      
      return isValid;
    });
    
    console.log('[CaffScoreService] 📊 Input data:', {
      totalDrinks: drinks.length,
      validDrinks: validDrinks.length,
      filteredOut: drinks.length - validDrinks.length,
      lastNightSleep: effectiveSleepHours,
      userAge: userProfile.age,
      userWeight: userProfile.weightKg,
      meanDailyCaffeine: userProfile.meanDailyCaffeineMg
    });
    
    // Calculate personalized half-life
    const personalizedHalfLife = CaffScoreService.calculatePersonalizedHalfLife(userProfile);
    
    // Calculate current caffeine level
    const currentCaffeineLevel = CaffScoreService.calculateCurrentCaffeineLevel(validDrinks, personalizedHalfLife, currentTime);
    
    // Calculate peak caffeine level
    const peakCaffeineLevel = CaffScoreService.calculatePeakCaffeineLevel(validDrinks, personalizedHalfLife, currentTime);
    
    // Calculate tolerance threshold
    const toleranceThreshold = userProfile.meanDailyCaffeineMg || 200;
    
    console.log('[CaffScoreService] ☕ Caffeine levels:', {
      current: currentCaffeineLevel.toFixed(1),
      peak: peakCaffeineLevel.toFixed(1),
      toleranceThreshold,
      halfLife: personalizedHalfLife.toFixed(2)
    });
    
    // Calculate all focus factors
    const currentLevel = this.calculateFocusLevelFactor(currentCaffeineLevel, toleranceThreshold);
    const risingRate = this.calculateFocusRisingRate(validDrinks, personalizedHalfLife, currentTime);
    const tolerance = this.calculateFocusTolerance(userProfile.meanDailyCaffeineMg, userProfile.weightKg, userProfile);
    
    // Calculate sleep debt and circadian factors
    const sleepDebt = await CaffScoreService.calculateSleepDebt(
      userProfile, 
      effectiveSleepHours, 
      CaffScoreService.hasSevenDaysOfSleepData(userProfile.createdAt)
    );
    const circadian = CaffScoreService.calculateCircadianFactor(currentTime);
    
    const focus = this.calculateFocusCapacity(sleepDebt, circadian, userProfile.age);
    const currentActivity = this.calculateCurrentCaffeineActivity(validDrinks, personalizedHalfLife, currentTime);
    
    console.log('[CaffScoreService] 🧠 All focus factors calculated:', {
      currentLevel: currentLevel.toFixed(3),
      risingRate: risingRate.toFixed(3),
      tolerance: tolerance.toFixed(3),
      focus: focus.toFixed(3),
      currentActivity: currentActivity.toFixed(3)
    });
    
    // Apply the CaffScore formula - emphasizing current impact
    // CaffScore = 100 × (C^1.0) × (R^0.2) × (T^0.3) × (F^0.3) × (A^0.6)
    const currentLevelComponent = Math.pow(currentLevel, 1.0);  // Increased weight
    const risingRateComponent = Math.pow(risingRate, 0.2);      // Reduced weight 
    const toleranceComponent = Math.pow(tolerance, 0.3);
    const focusComponent = Math.pow(focus, 0.3);                // Reduced weight
    const activityComponent = Math.pow(currentActivity, 0.6);   // Increased weight
    
    const rawScore = 100 * currentLevelComponent * risingRateComponent * toleranceComponent * focusComponent * activityComponent;
    
    console.log('[CaffScoreService] 🔢 CaffScore components:', {
      currentLevelComponent: currentLevelComponent.toFixed(3),
      risingRateComponent: risingRateComponent.toFixed(3),
      toleranceComponent: toleranceComponent.toFixed(3),
      focusComponent: focusComponent.toFixed(3),
      activityComponent: activityComponent.toFixed(3),
      rawScore: rawScore.toFixed(1)
    });
    
    // Ensure final score is within bounds
    const finalScore = ValidationService.clampValue(Math.round(rawScore * 10) / 10, 0, 100);
    
    // Create cache validity (1 second for same session)
    const validUntil = new Date(currentTime.getTime() + 1000);
    
    const factors: FocusFactors = {
      currentLevel,
      risingRate,
      tolerance,
      focus,
      absorption: currentActivity  // Map to existing interface for compatibility
    };
    
    console.log('[CaffScoreService] ✅ Final CaffScore calculation complete:', {
      finalScore,
      validUntil: validUntil.toISOString()
    });
    
    return {
      score: finalScore,
      factors,
      personalizedHalfLife,
      currentCaffeineLevel,
      peakCaffeineLevel,
      validUntil,
      calculatedAt: currentTime
    };
  }

  // ===== CAFFEINE CALCULATION UTILITIES =====
  // Caffeine calculation utilities

  /**
   * Calculate current caffeine level in mg based on drinks and metabolism
   */
  static calculateCurrentCaffeineLevel(drinks: DrinkRecord[], halfLifeHours: number, currentTime: Date): number {
    let totalCaffeine = 0;
    
    for (const drink of drinks) {
      const hoursElapsed = (currentTime.getTime() - drink.timestamp.getTime()) / (1000 * 60 * 60);
      
      if (hoursElapsed >= 0) {
        // Standard exponential decay: C(t) = C0 * (1/2)^(t/halfLife)
        const remaining = drink.actualCaffeineConsumed * Math.pow(0.5, hoursElapsed / halfLifeHours);
        totalCaffeine += remaining;
      }
    }
    
    return totalCaffeine;
  }

  /**
   * Calculate personalized caffeine half-life based on user factors
   */
  static calculatePersonalizedHalfLife(userProfile: UserProfile): number {
    let baseHalfLife = 5.0; // Standard 5 hours
    
    // Age factor (metabolism slows with age)
    if (userProfile.age > 65) {
      baseHalfLife *= 1.3;
    } else if (userProfile.age > 40) {
      baseHalfLife *= 1.1;
    }
    
    // Smoking accelerates metabolism
    if (userProfile.smoker) {
      baseHalfLife *= 0.7;
    }
    
    // Oral contraceptives slow metabolism
    if (userProfile.oralContraceptives) {
      baseHalfLife *= 1.4;
    }
    
    // Pregnancy significantly slows metabolism
    if (userProfile.pregnant) {
      baseHalfLife *= 2.0;
    }
    
    return Math.max(baseHalfLife, 2.0); // Minimum 2 hours
  }

  /**
   * Calculate peak caffeine level that was reached
   */
  static calculatePeakCaffeineLevel(drinks: DrinkRecord[], halfLifeHours: number, currentTime: Date): number {
    let peakLevel = 0;
    
    for (const drink of drinks) {
      const hoursElapsed = (currentTime.getTime() - drink.timestamp.getTime()) / (1000 * 60 * 60);
      
      if (hoursElapsed >= 0) {
        // Peak is reached at consumption time for instant absorption model
        const peakTime = drink.timestamp;
        const levelAtPeak = this.calculateCurrentCaffeineLevel(drinks, halfLifeHours, peakTime);
        peakLevel = Math.max(peakLevel, levelAtPeak);
      }
    }
    
    return peakLevel;
  }

  /**
   * Calculate sleep debt in hours
   */
  static async calculateSleepDebt(
    userProfile: UserProfile,
    effectiveSleepHours: number,
    hasSevenDaysData: boolean
  ): Promise<number> {
    const idealSleep = userProfile.averageSleep7Days || 7.5;
    
    if (hasSevenDaysData) {
      // Use 7-day average for ideal sleep
      const averageSleep7Days = userProfile.averageSleep7Days || 7.5;
      const debtHours = Math.max(0, averageSleep7Days - effectiveSleepHours);
      return debtHours;
    } else {
      // Use default ideal sleep
      const debtHours = Math.max(0, idealSleep - effectiveSleepHours);
      return debtHours;
    }
  }

  /**
   * Check if user has at least 7 days of sleep data
   */
  static hasSevenDaysOfSleepData(createdAt: Date): boolean {
    const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreation >= 7;
  }

  /**
   * Calculate circadian rhythm factor (0-1, where 1 is optimal alertness time)
   */
  static calculateCircadianFactor(currentTime: Date): number {
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const timeDecimal = hour + minute / 60;
    
    // Circadian alertness peaks around 10 AM and 2 PM, lowest around 3 AM
    if (timeDecimal >= 9 && timeDecimal <= 11) {
      // Morning peak (9-11 AM)
      return 1.0;
    } else if (timeDecimal >= 13 && timeDecimal <= 15) {
      // Afternoon peak (1-3 PM)
      return 0.9;
    } else if (timeDecimal >= 6 && timeDecimal <= 9) {
      // Morning ramp up (6-9 AM)
      return 0.7;
    } else if (timeDecimal >= 15 && timeDecimal <= 18) {
      // Afternoon decline (3-6 PM)
      return 0.8;
    } else if (timeDecimal >= 18 && timeDecimal <= 22) {
      // Evening (6-10 PM)
      return 0.6;
    } else if (timeDecimal >= 22 || timeDecimal <= 6) {
      // Night/early morning (10 PM - 6 AM)
      return 0.4;
    } else {
      return 0.7; // Default
    }
  }
} 