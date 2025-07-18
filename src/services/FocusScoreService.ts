import { 
  UserProfile, 
  DrinkRecord, 
  FocusResult,
  FocusFactors,
  DEFAULT_VALUES 
} from '../types';
import { ValidationService } from './ValidationService';
import { CrashRiskService } from './CrashRiskService';
import { StorageService } from './StorageService';

export class FocusScoreService {
  /**
   * Calculate current caffeine level factor for focus
   * Optimal focus zone is around 100-150% of tolerance threshold
   */
  private static calculateFocusLevelFactor(currentLevel: number, toleranceThreshold: number): number {
    const normalized = currentLevel / Math.max(toleranceThreshold, 1);
    
    console.log('[FocusScoreService] 🧮 Level factor calculation:', {
      currentLevel,
      toleranceThreshold,
      normalized: normalized.toFixed(3)
    });
    
    // Optimal focus zone: 100-150% of tolerance
    const optimalRange = 1.25; // 125% of tolerance is peak focus
    
    if (normalized <= 0.3) {
      // Very low levels = poor focus
      const result = normalized * 0.3;
      console.log('[FocusScoreService] 📉 Low caffeine level, poor focus:', result.toFixed(3));
      return result;
    } else if (normalized <= optimalRange) {
      // Building to optimal focus zone
      const result = 0.1 + (normalized - 0.3) * 0.9; // Scale from 0.1 to 1.0
      console.log('[FocusScoreService] 📈 Building to optimal focus:', result.toFixed(3));
      return result;
    } else if (normalized <= 2.0) {
      // Above optimal but still productive
      const result = Math.max(1.0 - (normalized - optimalRange) * 0.5, 0.3);
      console.log('[FocusScoreService] ⚖️ Above optimal but productive:', result.toFixed(3));
      return result;
    } else {
      // Too high = overstimulation, poor focus
      console.log('[FocusScoreService] 🔥 Too high, overstimulation: 0.2');
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
    
    const currentLevel = CrashRiskService.calculateCurrentCaffeineLevel(drinks, halfLife, currentTime);
    const level10MinAgo = CrashRiskService.calculateCurrentCaffeineLevel(drinks, halfLife, new Date(tenMinutesAgo));
    const level20MinAgo = CrashRiskService.calculateCurrentCaffeineLevel(drinks, halfLife, new Date(twentyMinutesAgo));
    
    // Calculate rate of change (mg/min)
    const recentRate = (currentLevel - level10MinAgo) / 10;
    const earlierRate = (level10MinAgo - level20MinAgo) / 10;
    const avgRate = (recentRate + earlierRate) / 2;
    
    console.log('[FocusScoreService] 📊 Rising rate calculation:', {
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
      console.log('[FocusScoreService] 📉 Declining rate, suboptimal:', result.toFixed(3));
      return result;
    } else if (avgRate <= optimalMinRate) {
      // Slow rise = building focus
      const result = 0.3 + (avgRate / optimalMinRate) * 0.4;
      console.log('[FocusScoreService] 🐌 Slow rise, building focus:', result.toFixed(3));
      return result;
    } else if (avgRate <= optimalMaxRate) {
      // Optimal rise rate = best focus
      const result = 0.7 + ((avgRate - optimalMinRate) / (optimalMaxRate - optimalMinRate)) * 0.3;
      console.log('[FocusScoreService] 🎯 Optimal rise rate, best focus:', result.toFixed(3));
      return result;
    } else {
      // Too fast = overstimulating
      const result = Math.max(0.4 - (avgRate - optimalMaxRate) * 0.05, 0.1);
      console.log('[FocusScoreService] 🚀 Too fast, overstimulating:', result.toFixed(3));
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
    
    console.log('[FocusScoreService] 💪 Enhanced tolerance calculation - base:', {
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
      console.log('[FocusScoreService] 👴 Age factor (65+): 0.8x');
    } else if (userProfile.age <= 18) {
      healthMultiplier *= 1.1; // Faster metabolism in youth
      console.log('[FocusScoreService] 👶 Age factor (≤18): 1.1x');
    }
    
    // Sex-based differences in caffeine metabolism
    if (userProfile.sex === 'female') {
      healthMultiplier *= 0.9; // Generally slower caffeine clearance
      console.log('[FocusScoreService] 👩 Sex factor (female): 0.9x');
    }
    
    // Smoking status - significantly affects tolerance
    if (userProfile.smoker) {
      healthMultiplier *= 1.5; // Smokers develop higher tolerance faster
      console.log('[FocusScoreService] 🚬 Smoking factor: 1.5x');
    }
    
    // Pregnancy factor - affects tolerance building
    if (userProfile.pregnant) {
      healthMultiplier *= 0.4; // Pregnancy significantly reduces tolerance
      console.log('[FocusScoreService] 🤱 Pregnancy factor: 0.4x');
    }
    
    // Oral contraceptives factor
    if (userProfile.sex === 'female' && userProfile.oralContraceptives && !userProfile.pregnant) {
      healthMultiplier *= 0.85; // Slower caffeine clearance
      console.log('[FocusScoreService] 💊 Oral contraceptives factor: 0.85x');
    }
    
    // Apply health multiplier to base tolerance
    const adjustedTolerance = baseTolerance * healthMultiplier;
    
    // Experience factor - if someone reports high daily intake, they likely have developed tolerance
    let experienceFactor = 1.0;
    if (meanDailyMg > 400) {
      experienceFactor = 1.2; // Heavy users likely have good tolerance
      console.log('[FocusScoreService] ☕ Heavy user experience factor: 1.2x');
    } else if (meanDailyMg < 50) {
      experienceFactor = 0.7; // Light users have lower tolerance
      console.log('[FocusScoreService] 🫖 Light user experience factor: 0.7x');
    }
    
    const finalTolerance = adjustedTolerance * experienceFactor;
    
    // For focus, higher tolerance is good (up to a point)
    const result = Math.max(0.1, Math.min(1.0, finalTolerance * 0.7 + 0.3));
    
    console.log('[FocusScoreService] 💪 Enhanced tolerance calculation complete:', {
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
    
    console.log('[FocusScoreService] 🧠 Focus capacity calculation:', {
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
   * Calculate absorption factor for focus
   * Active absorption = building toward peak focus
   */
  private static calculateFocusAbsorption(drinks: DrinkRecord[], currentTime: Date): number {
    let totalAbsorbing = 0;
    
    console.log('[FocusScoreService] 🔄 Absorption calculation for', drinks.length, 'drinks');
    
    drinks.forEach((drink, index) => {
      const minutesSinceConsumption = (currentTime.getTime() - drink.timestamp.getTime()) / (1000 * 60);
      
      console.log(`[FocusScoreService] 📋 Drink ${index + 1}:`, {
        name: drink.name,
        minutesSince: minutesSinceConsumption.toFixed(1),
        actualCaffeine: drink.actualCaffeineConsumed
      });
      
      // Peak absorption for focus occurs 30-60 minutes after consumption
      if (minutesSinceConsumption < 120) { // Consider absorption for 2 hours
        let absorptionIntensity = 0;
        
        if (minutesSinceConsumption < 30) {
          // Building up to peak
          absorptionIntensity = minutesSinceConsumption / 30 * 0.8;
        } else if (minutesSinceConsumption < 60) {
          // Peak absorption window
          absorptionIntensity = 1.0;
        } else {
          // Declining absorption
          absorptionIntensity = Math.max(0, 1.0 - (minutesSinceConsumption - 60) / 60);
        }
        
        const contribution = drink.actualCaffeineConsumed * absorptionIntensity;
        totalAbsorbing += contribution;
        
        console.log(`[FocusScoreService] ⚡ Drink ${index + 1} absorption:`, {
          intensity: absorptionIntensity.toFixed(3),
          contribution: contribution.toFixed(1)
        });
      } else {
        console.log(`[FocusScoreService] ⏰ Drink ${index + 1} too old for absorption`);
      }
    });
    
    const result = Math.max(0, Math.min(1, totalAbsorbing / 150)); // Normalize against 150mg
    
    console.log('[FocusScoreService] 🔄 Total absorption:', {
      totalAbsorbing: totalAbsorbing.toFixed(1),
      normalized: result.toFixed(3)
    });
    
    return result;
  }

  /**
   * Calculate Peak Focus Score
   * Formula: FocusScore = 100 × (C^0.8) × (R^0.4) × (T^0.3) × (F^0.5) × (A^0.2)
   */
  static async calculateFocusScore(
    userProfile: UserProfile,
    drinks: DrinkRecord[],
    currentTime: Date = new Date()
  ): Promise<FocusResult> {
    console.log('[FocusScoreService] 🎯 Starting focus score calculation for user:', userProfile.userId);
    
    // Retrieve sleep data from storage
    const lastNightSleep = await StorageService.getLastNightSleep(userProfile.userId);
    const effectiveSleepHours = lastNightSleep || DEFAULT_VALUES.BASELINE_SLEEP_HOURS;
    
    console.log('[FocusScoreService] 📊 Input data:', {
      drinksCount: drinks.length,
      lastNightSleep: effectiveSleepHours,
      userAge: userProfile.age,
      userWeight: userProfile.weightKg,
      meanDailyCaffeine: userProfile.meanDailyCaffeineMg
    });
    
    // Calculate personalized half-life
    const personalizedHalfLife = CrashRiskService.calculatePersonalizedHalfLife(userProfile);
    
    // Calculate current caffeine level
    const currentCaffeineLevel = CrashRiskService.calculateCurrentCaffeineLevel(drinks, personalizedHalfLife, currentTime);
    
    // Calculate peak caffeine level
    const peakCaffeineLevel = CrashRiskService.calculatePeakCaffeineLevel(drinks, personalizedHalfLife, currentTime);
    
    // Calculate tolerance threshold
    const toleranceThreshold = userProfile.meanDailyCaffeineMg || 200;
    
    console.log('[FocusScoreService] ☕ Caffeine levels:', {
      current: currentCaffeineLevel.toFixed(1),
      peak: peakCaffeineLevel.toFixed(1),
      toleranceThreshold,
      halfLife: personalizedHalfLife.toFixed(2)
    });
    
    // Calculate all focus factors
    const currentLevel = this.calculateFocusLevelFactor(currentCaffeineLevel, toleranceThreshold);
    const risingRate = this.calculateFocusRisingRate(drinks, personalizedHalfLife, currentTime);
    const tolerance = this.calculateFocusTolerance(userProfile.meanDailyCaffeineMg, userProfile.weightKg, userProfile);
    
    // Calculate sleep debt and circadian factors
    const sleepDebt = CrashRiskService.calculateSleepDebt(
      effectiveSleepHours, 
      userProfile.averageSleep7Days, 
      CrashRiskService.hasSevenDaysOfSleepData(userProfile.createdAt)
    );
    const circadian = CrashRiskService.calculateCircadianFactor(currentTime);
    
    const focus = this.calculateFocusCapacity(sleepDebt, circadian, userProfile.age);
    const absorption = this.calculateFocusAbsorption(drinks, currentTime);
    
    console.log('[FocusScoreService] 🧠 All focus factors calculated:', {
      currentLevel: currentLevel.toFixed(3),
      risingRate: risingRate.toFixed(3),
      tolerance: tolerance.toFixed(3),
      focus: focus.toFixed(3),
      absorption: absorption.toFixed(3)
    });
    
    // Apply the focus formula
    // FocusScore = 100 × (C^0.8) × (R^0.4) × (T^0.3) × (F^0.5) × (A^0.2)
    const currentLevelComponent = Math.pow(currentLevel, 0.8);
    const risingRateComponent = Math.pow(risingRate, 0.4);
    const toleranceComponent = Math.pow(tolerance, 0.3);
    const focusComponent = Math.pow(focus, 0.5);
    const absorptionComponent = Math.pow(absorption, 0.2);
    
    const rawScore = 100 * currentLevelComponent * risingRateComponent * toleranceComponent * focusComponent * absorptionComponent;
    
    console.log('[FocusScoreService] 🔢 Focus score components:', {
      currentLevelComponent: currentLevelComponent.toFixed(3),
      risingRateComponent: risingRateComponent.toFixed(3),
      toleranceComponent: toleranceComponent.toFixed(3),
      focusComponent: focusComponent.toFixed(3),
      absorptionComponent: absorptionComponent.toFixed(3),
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
      absorption
    };
    
    console.log('[FocusScoreService] ✅ Final focus score calculation complete:', {
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
} 