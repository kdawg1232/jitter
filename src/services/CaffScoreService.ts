import { 
  UserProfile, 
  DrinkRecord, 
  FocusResult,
  FocusFactors,
  StressRecord,
  FoodRecord,
  ExerciseRecord,
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
   * Detect if we're in the sustained focus zone (plateau phase)
   */
  private static isInSustainedFocusZone(
    currentLevel: number,
    peakLevel: number, 
    drinks: DrinkRecord[],
    currentTime: Date
  ): boolean {
    if (drinks.length === 0 || peakLevel <= 0) return false;
    
    // Find the most recent significant drink (>30mg) to calculate time elapsed
    const significantDrinks = drinks.filter(d => d.actualCaffeineConsumed >= 30);
    if (significantDrinks.length === 0) return false;
    
    const mostRecentDrink = significantDrinks.reduce((latest, drink) => 
      drink.timestamp > latest.timestamp ? drink : latest
    );
    
    const hoursElapsed = (currentTime.getTime() - mostRecentDrink.timestamp.getTime()) / (1000 * 60 * 60);
    const levelRatio = currentLevel / Math.max(peakLevel, 1);
    
    // Sustained focus zone criteria:
    const timeInRange = hoursElapsed >= 0.5 && hoursElapsed <= 4.0; // 30min - 4hrs after consumption
    const levelInRange = levelRatio >= 0.6; // Still above 60% of peak
    const hasSignificantCaffeine = currentLevel >= 30; // Minimum threshold for effects
    
    return timeInRange && levelInRange && hasSignificantCaffeine;
  }

  /**
   * Calculate rising rate factor for focus
   * Enhanced with plateau detection for sustained focus recognition
   */
  private static calculateFocusRisingRate(
    drinks: DrinkRecord[], 
    halfLife: number, 
    currentTime: Date,
    peakLevel: number
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
    
    // Check if we're in sustained focus zone for enhanced logging
    const inSustainedZone = this.isInSustainedFocusZone(currentLevel, peakLevel, drinks, currentTime);
    
    console.log('[CaffScoreService] 📊 Rising rate calculation:', {
      currentLevel: currentLevel.toFixed(1),
      level10MinAgo: level10MinAgo.toFixed(1),
      level20MinAgo: level20MinAgo.toFixed(1),
      recentRate: recentRate.toFixed(2),
      earlierRate: earlierRate.toFixed(2),
      avgRate: avgRate.toFixed(2),
      peakLevel: peakLevel.toFixed(1),
      sustainedFocusZone: inSustainedZone,
      rateCategory: avgRate > 5 ? 'TOO_FAST_OVERSTIMULATING' : avgRate > 2 ? 'OPTIMAL_RANGE' : avgRate > 0 ? 'SLOW_BUILDING' : 'DECLINING'
    });
    
    // Optimal rise rate for focus: 2-5 mg/min
    const optimalMinRate = 2;
    const optimalMaxRate = 5;
    
    if (avgRate < 0) {
      // Check if we're in sustained focus zone during decline
      const inSustainedZone = this.isInSustainedFocusZone(currentLevel, peakLevel, drinks, currentTime);
      
      if (inSustainedZone) {
        // Slow decline during plateau = sustained excellent focus
        if (avgRate >= -2.0) { // Slow decline (< 2mg/min)
          const result = 0.85;
          console.log('[CaffScoreService] 🎯 Sustained focus zone (slow decline):', result.toFixed(3));
          return result;
        } else if (avgRate >= -5.0) { // Moderate decline  
          const result = 0.70;
          console.log('[CaffScoreService] ⚖️ Sustained focus zone (moderate decline):', result.toFixed(3));
          return result;
        } else {
          // Fast decline = approaching crash even in plateau
          const result = 0.45;
          console.log('[CaffScoreService] 📉 Fast decline, approaching crash:', result.toFixed(3));
          return result;
        }
      } else {
        // Outside plateau zone - use current penalty logic
        const result = Math.max(0.2, 0.5 + avgRate * 0.1);
        console.log('[CaffScoreService] 📉 Declining rate, suboptimal:', result.toFixed(3));
        return result;
      }
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
      const penalty = (avgRate - optimalMaxRate) * 0.05;
      const result = Math.max(0.4 - penalty, 0.1);
      console.log('[CaffScoreService] 🚀 TOO FAST - Overstimulating consumption pattern detected!', {
        avgRateMinute: avgRate.toFixed(2),
        optimalMax: optimalMaxRate,
        excessRate: (avgRate - optimalMaxRate).toFixed(2),
        penalty: penalty.toFixed(3),
        finalResult: result.toFixed(3),
        explanation: 'Consuming caffeine too quickly reduces focus effectiveness'
      });
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
    
    // NEW: Medication factors that affect caffeine metabolism
    if (userProfile.takesFluvoxamine) {
      healthMultiplier *= 0.3; // Dramatic reduction in tolerance building due to very slow clearance
      console.log('[CaffScoreService] 💊 Fluvoxamine factor: 0.3x (potent CYP1A2 inhibitor)');
    } else if (userProfile.takesCiprofloxacin) {
      healthMultiplier *= 0.6; // Moderate reduction due to CYP1A2 inhibition
      console.log('[CaffScoreService] 💊 Ciprofloxacin factor: 0.6x (CYP1A2 inhibitor)');
    } else if (userProfile.takesOtherCYP1A2Inhibitors) {
      healthMultiplier *= 0.75; // Mild reduction for other inhibitors
      console.log('[CaffScoreService] 💊 Other CYP1A2 inhibitors factor: 0.75x');
    }
    
    // NEW: Self-reported metabolism rate factor
    switch (userProfile.metabolismRate) {
      case 'very_slow':
        healthMultiplier *= 0.7;
        console.log('[CaffScoreService] 🐌 Very slow metabolism factor: 0.7x');
        break;
      case 'slow':
        healthMultiplier *= 0.85;
        console.log('[CaffScoreService] 🐌 Slow metabolism factor: 0.85x');
        break;
      case 'medium':
        // No change - baseline
        console.log('[CaffScoreService] ⚖️ Medium metabolism factor: 1.0x');
        break;
      case 'fast':
        healthMultiplier *= 1.15;
        console.log('[CaffScoreService] 🏃 Fast metabolism factor: 1.15x');
        break;
      case 'very_fast':
        healthMultiplier *= 1.3;
        console.log('[CaffScoreService] 🏃‍♂️ Very fast metabolism factor: 1.3x');
        break;
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
   * Calculate stress impact on focus
   * Higher stress = reduced focus capacity
   */
  private static calculateStressFactor(stressLevel: number | null): number {
    if (stressLevel === null) {
      // No stress data available - assume moderate stress
      const result = 0.7;
      console.log('[CaffScoreService] 😟 No stress data available, assuming moderate:', result.toFixed(3));
      return result;
    }
    
    // Stress scale: 1 (low stress) = 1.0, 10 (high stress) = 0.3
    // Non-linear decline - stress has increasing impact at higher levels
    let stressFactor;
    if (stressLevel <= 3) {
      // Low stress (1-3): minimal impact
      stressFactor = 1.0 - (stressLevel - 1) * 0.05; // 1.0 to 0.9
    } else if (stressLevel <= 6) {
      // Moderate stress (4-6): moderate impact
      stressFactor = 0.9 - (stressLevel - 3) * 0.1; // 0.9 to 0.6
    } else {
      // High stress (7-10): significant impact
      stressFactor = 0.6 - (stressLevel - 6) * 0.075; // 0.6 to 0.3
    }
    
    const result = Math.max(0.3, Math.min(1.0, stressFactor));
    
    console.log('[CaffScoreService] 😰 Stress factor calculation:', {
      stressLevel,
      stressFactor: stressFactor.toFixed(3),
      result: result.toFixed(3)
    });
    
    return result;
  }

  /**
   * Calculate food timing impact on caffeine absorption
   * Recent food = slower absorption, empty stomach = faster absorption
   */
  private static calculateFoodTimingFactor(recentMealTimes: Date[], currentTime: Date): number {
    if (recentMealTimes.length === 0) {
      // No meal data - assume moderate impact (empty stomach)
      const result = 1.1;
      console.log('[CaffScoreService] 🍽️ No meal data available, assuming empty stomach:', result.toFixed(3));
      return result;
    }

    // Sort descending so index 0 is most recent
    const sorted = [...recentMealTimes].sort((a, b) => b.getTime() - a.getTime());
    const lastMealTime = sorted[0];
    const hoursElapsed = (currentTime.getTime() - lastMealTime.getTime()) / (1000 * 60 * 60);

    let foodFactor;
    if (hoursElapsed < 0.5) {
      // Very recent meal (< 30 min): significantly slows absorption
      foodFactor = 0.7;
    } else if (hoursElapsed < 1.5) {
      // Recent meal (30 min - 1.5 hrs): moderately slows absorption
      foodFactor = 0.8 + (hoursElapsed - 0.5) * 0.2; // 0.8 to 1.0
    } else if (hoursElapsed < 4.0) {
      // Somewhat recent meal (1.5 - 4 hrs): slight enhancement
      foodFactor = 1.0 + (hoursElapsed - 1.5) * 0.04; // 1.0 to 1.1
    } else {
      // Empty stomach (> 4 hrs): enhanced absorption
      foodFactor = 1.1;
    }

    // If there were two or more meals within last 4 hours, compound slowing effect (multiply by 0.9)
    const mealsWithin4h = sorted.filter(t => (currentTime.getTime() - t.getTime()) / (1000 * 60 * 60) < 4);
    if (mealsWithin4h.length >= 2) {
      foodFactor *= 0.9;
      console.log('[CaffScoreService] 🍽️ Multiple meals within 4h detected – applying additional slowdown (×0.9)');
    }

    const result = Math.max(0.6, Math.min(1.2, foodFactor));

    console.log('[CaffScoreService] 🍽️ Food timing factor calculation:', {
      hoursElapsed: hoursElapsed.toFixed(2),
      mealsIn4h: mealsWithin4h.length,
      foodFactor: foodFactor.toFixed(3),
      result: result.toFixed(3)
    });

    return result;
  }

  /**
   * Calculate exercise impact on caffeine metabolism and focus
   * Recent exercise = enhanced metabolism and focus
   */
  private static calculateExerciseFactor(exerciseData: ExerciseRecord | null, currentTime: Date): number {
    if (!exerciseData) {
      // No exercise data - neutral impact
      const result = 1.0;
      console.log('[CaffScoreService] 🏃‍♂️ No exercise data available, neutral impact:', result.toFixed(3));
      return result;
    }
    
    const hoursElapsed = (currentTime.getTime() - exerciseData.exerciseTime.getTime()) / (1000 * 60 * 60);
    
    let exerciseFactor;
    if (exerciseData.exerciseType === 'starting') {
      // Currently exercising or just started
      if (hoursElapsed < 2.0) {
        // Enhanced focus and metabolism during/after exercise
        exerciseFactor = 1.2 - hoursElapsed * 0.05; // 1.2 to 1.1
      } else {
        // Benefits fade after 2 hours
        exerciseFactor = 1.0 + Math.max(0, (4.0 - hoursElapsed) * 0.025); // 1.1 to 1.0
      }
    } else {
      // Completed exercise session
      if (hoursElapsed < 1.0) {
        // Peak benefit in first hour after exercise
        exerciseFactor = 1.15;
      } else if (hoursElapsed < 4.0) {
        // Gradual decline over 4 hours
        exerciseFactor = 1.15 - (hoursElapsed - 1.0) * 0.05; // 1.15 to 1.0
      } else {
        // Benefits mostly gone after 4 hours
        exerciseFactor = 1.0;
      }
    }
    
    const result = Math.max(1.0, Math.min(1.2, exerciseFactor));
    
    console.log('[CaffScoreService] 🏃‍♂️ Exercise factor calculation:', {
      exerciseType: exerciseData.exerciseType,
      hoursElapsed: hoursElapsed.toFixed(2),
      exerciseFactor: exerciseFactor.toFixed(3),
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
   * Formula: CaffScore = 100 × (C^1.0) × (R^0.2) × (T^0.3) × (F^0.3) × (A^0.6) × (S^0.2) × (M^0.1) × (E^0.1)
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
    
    // Retrieve new daily tracking data from storage
    const todayStressLevel = await StorageService.getTodayStressLevel(userProfile.userId);
    const recentMealTimes = await StorageService.getRecentMealTimes(userProfile.userId, 24); // 24-hour window for meal data
    const todayExerciseData = await StorageService.getTodayExerciseData(userProfile.userId);
    
    console.log('[CaffScoreService] 📊 Daily tracking data:', {
      stressLevel: todayStressLevel,
      recentMealTimes: recentMealTimes.map(t => t.toISOString()),
      exerciseData: todayExerciseData ? {
        type: todayExerciseData.exerciseType,
        time: todayExerciseData.exerciseTime.toISOString(),
        hoursAgo: todayExerciseData.hoursAgo
      } : null
    });
    
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
    const risingRate = this.calculateFocusRisingRate(validDrinks, personalizedHalfLife, currentTime, peakCaffeineLevel);
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
    
    // Calculate new daily tracking factors
    const stressFactor = this.calculateStressFactor(todayStressLevel);
    const foodTimingFactor = this.calculateFoodTimingFactor(recentMealTimes, currentTime);
    const exerciseFactor = this.calculateExerciseFactor(todayExerciseData, currentTime);
    
    console.log('[CaffScoreService] 🧠 All focus factors calculated:', {
      currentLevel: currentLevel.toFixed(3),
      risingRate: risingRate.toFixed(3),
      tolerance: tolerance.toFixed(3),
      focus: focus.toFixed(3),
      currentActivity: currentActivity.toFixed(3),
      stressFactor: stressFactor.toFixed(3),
      foodTimingFactor: foodTimingFactor.toFixed(3),
      exerciseFactor: exerciseFactor.toFixed(3)
    });
    
    // Apply the enhanced CaffScore formula with new factors
    // CaffScore = 100 × (C^1.2) × (R^0.1) × (T^0.25) × (F^0.25) × (A^0.4) × (S^0.15) × (M^0.1) × (E^0.1)
    const currentLevelComponent = Math.pow(currentLevel, 1.2);          // Current level most important
    const risingRateComponent = Math.pow(risingRate, 0.1);              // Reduced impact of rate
    const toleranceComponent = Math.pow(tolerance, 0.25);               // Slightly reduced 
    const focusComponent = Math.pow(focus, 0.25);                       // Slightly reduced
    const activityComponent = Math.pow(currentActivity, 0.4);           // Reduced from 0.5
    const stressComponent = Math.pow(stressFactor, 0.15);               // New stress factor
    const foodTimingComponent = Math.pow(foodTimingFactor, 0.1);        // New food timing factor
    const exerciseComponent = Math.pow(exerciseFactor, 0.1);            // New exercise factor
    
    const rawScore = 100 * currentLevelComponent * risingRateComponent * toleranceComponent * 
                     focusComponent * activityComponent * stressComponent * foodTimingComponent * exerciseComponent;
    
    console.log('[CaffScoreService] 🔢 Enhanced CaffScore components:', {
      currentLevelComponent: currentLevelComponent.toFixed(3),
      risingRateComponent: risingRateComponent.toFixed(3),
      toleranceComponent: toleranceComponent.toFixed(3),
      focusComponent: focusComponent.toFixed(3),
      activityComponent: activityComponent.toFixed(3),
      stressComponent: stressComponent.toFixed(3),
      foodTimingComponent: foodTimingComponent.toFixed(3),
      exerciseComponent: exerciseComponent.toFixed(3),
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
    
    console.log('[CaffScoreService] ✅ Enhanced CaffScore calculation complete:', {
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
    
    // NEW: Medication interactions that inhibit CYP1A2
    if (userProfile.takesFluvoxamine) {
      // Fluvoxamine is a potent CYP1A2 inhibitor - can increase half-life 6-10x
      baseHalfLife *= 8.0; // Conservative multiplier based on research
    } else if (userProfile.takesCiprofloxacin) {
      // Ciprofloxacin moderately inhibits CYP1A2
      baseHalfLife *= 2.5;
    } else if (userProfile.takesOtherCYP1A2Inhibitors) {
      // Other inhibitors like cimetidine, birth control pills (already handled above)
      baseHalfLife *= 1.5;
    }
    
    // NEW: Self-reported metabolism rate
    switch (userProfile.metabolismRate) {
      case 'very_slow':
        baseHalfLife *= 1.6;
        break;
      case 'slow':
        baseHalfLife *= 1.3;
        break;
      case 'medium':
        // No change - this is the baseline
        break;
      case 'fast':
        baseHalfLife *= 0.8;
        break;
      case 'very_fast':
        baseHalfLife *= 0.6;
        break;
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