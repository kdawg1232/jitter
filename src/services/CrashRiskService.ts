import { 
  UserProfile, 
  DrinkRecord, 
  CrashRiskResult,
  CrashRiskFactors,
  RiskCurvePoint,
  DEFAULT_VALUES 
} from '../types';
import { ValidationService } from './ValidationService';
import { StorageService } from './StorageService';

export class CrashRiskService {
  /**
   * Enhanced constants for distributed caffeine absorption
   */
  static readonly ABSORPTION_CONSTANTS = {
    ONSET_MINUTES: 15,        // When absorption begins
    PEAK_MINUTES: 45,         // Peak absorption rate
    DECLINE_MINUTES: 90,      // When absorption rate starts declining
    COMPLETE_MINUTES: 120,    // When absorption is essentially complete
    STOMACH_HALF_LIFE: 30,    // How long caffeine stays in stomach (minutes)
  };

  /**
   * Calculate absorption rate at a given time point
   * Uses a realistic curve that peaks around 45 minutes
   */
  static calculateAbsorptionRate(minutesSinceConsumption: number): number {
    const { ONSET_MINUTES, PEAK_MINUTES, DECLINE_MINUTES, COMPLETE_MINUTES } = this.ABSORPTION_CONSTANTS;
    
    if (minutesSinceConsumption < ONSET_MINUTES) {
      // Early phase: slow absorption
      return (minutesSinceConsumption / ONSET_MINUTES) * 0.3;
    } else if (minutesSinceConsumption <= PEAK_MINUTES) {
      // Rising to peak: rapid increase in absorption
      const progress = (minutesSinceConsumption - ONSET_MINUTES) / (PEAK_MINUTES - ONSET_MINUTES);
      return 0.3 + (progress * 0.7); // Scale from 0.3 to 1.0
    } else if (minutesSinceConsumption <= DECLINE_MINUTES) {
      // Peak plateau: maximum absorption
      return 1.0;
    } else if (minutesSinceConsumption <= COMPLETE_MINUTES) {
      // Decline phase: absorption slows down
      const progress = (minutesSinceConsumption - DECLINE_MINUTES) / (COMPLETE_MINUTES - DECLINE_MINUTES);
      return 1.0 - (progress * 0.8); // Scale from 1.0 to 0.2
    } else {
      // Late phase: minimal absorption
      const extraMinutes = minutesSinceConsumption - COMPLETE_MINUTES;
      return Math.max(0, 0.2 * Math.exp(-extraMinutes / 60)); // Exponential decay
    }
  }

  /**
   * Calculate a single drink's contribution to current blood caffeine level
   * Accounts for distributed absorption over time and elimination
   */
  static calculateDrinkContribution(
    drink: DrinkRecord,
    halfLife: number,
    currentTime: Date
  ): number {
    const consumptionStart = drink.timestamp.getTime();
    const consumptionDurationMs = this.parseTimeToMs(drink.timeToConsume);
    const now = currentTime.getTime();
    
    // If drink hasn't started yet, no contribution
    if (now < consumptionStart) return 0;
    
    let totalContribution = 0;
    const intervalMinutes = 5; // Calculate every 5 minutes for precision
    const totalMinutes = Math.ceil((now - consumptionStart) / (1000 * 60));
    
    for (let minute = 0; minute <= totalMinutes; minute += intervalMinutes) {
      const timePoint = consumptionStart + (minute * 60 * 1000);
      
      // Skip if we're beyond current time
      if (timePoint > now) break;
      
      // Check if caffeine was consumed at this time point
      const minutesFromStart = minute;
      const consumptionProgress = Math.min(minutesFromStart / (consumptionDurationMs / (1000 * 60)), 1);
      
      if (consumptionProgress > 0) {
        // Amount consumed by this time point
        const caffeineConsumedByNow = drink.actualCaffeineConsumed * consumptionProgress;
        const caffeineThisInterval = minute === 0 ? caffeineConsumedByNow : 
          caffeineConsumedByNow - (drink.actualCaffeineConsumed * Math.min((minute - intervalMinutes) / (consumptionDurationMs / (1000 * 60)), 1));
        
        if (caffeineThisInterval > 0) {
          // Calculate absorption rate at this time point
          const minutesSinceThisConsumption = (now - timePoint) / (1000 * 60);
          const absorptionRate = this.calculateAbsorptionRate(minutesSinceThisConsumption);
          
          // Calculate elimination since this time point
          const hoursSinceThisPoint = minutesSinceThisConsumption / 60;
          const eliminationFactor = Math.pow(2, -hoursSinceThisPoint / halfLife);
          
          // Add this interval's contribution
          totalContribution += caffeineThisInterval * absorptionRate * eliminationFactor;
        }
      }
    }
    
    return Math.max(0, totalContribution);
  }

  /**
   * Parse time string to milliseconds
   */
  static parseTimeToMs(timeString: string): number {
    const parts = timeString.split(':').map(Number);
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return (hours * 3600 + minutes * 60 + seconds) * 1000;
    }
    // Fallback for malformed time - assume 15 minutes
    return 15 * 60 * 1000;
  }

  /**
   * Calculate current caffeine level in bloodstream
   * Uses exponential decay based on half-life
   */
  public static calculateCurrentCaffeineLevel(
    drinks: DrinkRecord[],
    halfLife: number,
    currentTime: Date
  ): number {
    let totalCaffeine = 0;
    
    drinks.forEach(drink => {
      const hoursElapsed = (currentTime.getTime() - drink.timestamp.getTime()) / (1000 * 60 * 60);
      
      if (hoursElapsed >= 0) {
        const concentration = drink.actualCaffeineConsumed * Math.pow(2, -hoursElapsed / halfLife);
        totalCaffeine += concentration;
      }
    });
    
    return totalCaffeine;
  }

  /**
   * Calculate peak caffeine level in recent history (6-hour window)
   * Used to determine the delta for crash risk calculation
   */
  public static calculatePeakCaffeineLevel(
    drinks: DrinkRecord[],
    halfLife: number,
    currentTime: Date
  ): number {
    const hoursToLookBack = DEFAULT_VALUES.PEAK_DETECTION_WINDOW_HOURS; // 6 hours
    const intervalMinutes = 5; // Check every 5 minutes for peak
    
    let peakLevel = 0;
    
    // Check caffeine levels at 5-minute intervals over the past 6 hours
    for (let i = 0; i <= (hoursToLookBack * 60); i += intervalMinutes) {
      const checkTime = new Date(currentTime.getTime() - (i * 60 * 1000));
      const level = this.calculateCurrentCaffeineLevel(drinks, halfLife, checkTime);
      
      if (level > peakLevel) {
        peakLevel = level;
      }
    }
    
    return peakLevel;
  }

  /**
   * Calculate delta factor (relative drop from peak)
   * Higher delta = greater drop from peak = higher crash risk
   */
  static calculateDelta(
    drinks: DrinkRecord[],
    halfLife: number,
    currentTime: Date
  ): number {
    const currentLevel = this.calculateCurrentCaffeineLevel(drinks, halfLife, currentTime);
    const peakLevel = this.calculatePeakCaffeineLevel(drinks, halfLife, currentTime);
    
    // Avoid division by zero - if no peak, no crash risk
    if (peakLevel <= 1e-6) return 0;
    
    const delta = Math.max(0, (peakLevel - currentLevel) / peakLevel);
    
    console.log('[CrashRiskService] 📉 Delta calculation:', {
      currentLevel: currentLevel.toFixed(2),
      peakLevel: peakLevel.toFixed(2),
      delta: delta.toFixed(3)
    });
    
    return delta;
  }

  /**
   * Calculate sleep debt factor
   * Uses 7-day average if available, otherwise single night
   */
  static calculateSleepDebt(
    lastNightSleep: number,
    averageSleep7Days: number,
    hasSevenDaysData: boolean
  ): number {
    const idealSleep = DEFAULT_VALUES.BASELINE_SLEEP_HOURS; // 7.5 hours
    const maxDebt = 3; // Maximum debt hours to consider (caps at 100%)
    
    let effectiveSleep = lastNightSleep;
    
    // Use 7-day average if we have sufficient data and it's reasonable
    if (hasSevenDaysData && averageSleep7Days > 0) {
      effectiveSleep = averageSleep7Days;
    }
    
    const debtHours = Math.max(0, idealSleep - effectiveSleep);
    const sleepDebt = Math.min(debtHours / maxDebt, 1); // Cap at 100%
    
    console.log('[CrashRiskService] 😴 Sleep debt calculation:', {
      lastNightSleep,
      averageSleep7Days,
      hasSevenDaysData,
      effectiveSleep,
      idealSleep,
      debtHours: debtHours.toFixed(2),
      sleepDebt: sleepDebt.toFixed(3)
    });
    
    return sleepDebt;
  }

  /**
   * Calculate circadian factor - time of day affects crash susceptibility
   */
  static calculateCircadianFactor(currentTime: Date): number {
    const hour = currentTime.getHours();
    
    // Night: High sensitivity (22:00-06:00)
    if (hour >= 22 || hour < 6) {
      return 1.0;
    }
    // Morning: Moderate sensitivity (06:00-10:00)  
    else if (hour >= 6 && hour < 10) {
      return 0.6;
    }
    // Midday: Low sensitivity (10:00-16:00)
    else if (hour >= 10 && hour < 16) {
      return 0.4;
    }
    // Evening: High sensitivity (16:00-22:00)
    else {
      return 0.7;
    }
  }

  /**
   * Calculate personalized caffeine half-life based on user profile
   */
  static calculatePersonalizedHalfLife(profile: UserProfile): number {
    let halfLife = DEFAULT_VALUES.DEFAULT_HALF_LIFE_HOURS; // 5 hours base
    
    // Age factor - caffeine clearance slows with age (~2% per year after 30)
    if (profile.age > 30) {
      const ageYearsPast30 = profile.age - 30;
      const ageSlowdownFactor = 1 + (ageYearsPast30 * 0.02); // 2% slower per year
      halfLife *= Math.min(ageSlowdownFactor, 1.8); // Cap at 80% slower maximum
    }
    
    // Lifestyle factors that affect caffeine metabolism
    if (profile.smoker) {
      halfLife *= 0.6; // Smokers clear caffeine faster
    }
    
    if (profile.pregnant) {
      halfLife *= 2.5; // Pregnancy significantly slows clearance
    }
    
    if (profile.sex === 'female' && profile.oralContraceptives) {
      halfLife *= 1.4; // Oral contraceptives slow clearance
    }
    
    // Clamp to realistic physiological range
    return ValidationService.clampValue(
      halfLife, 
      DEFAULT_VALUES.MIN_HALF_LIFE_HOURS, 
      DEFAULT_VALUES.MAX_HALF_LIFE_HOURS
    );
  }

  /**
   * Enhanced caffeine tolerance factor calculation using comprehensive user data
   */
  static calculateTolerance(
    meanDailyMg: number, 
    weightKg: number, 
    userProfile: UserProfile
  ): number {
    const moderateIntakeMgPerKg = DEFAULT_VALUES.MODERATE_CAFFEINE_MG_PER_KG; // 4 mg/kg/day baseline
    const moderateIntakeTotal = moderateIntakeMgPerKg * weightKg;
    
    if (moderateIntakeTotal <= 0) return 0;
    
    let baseTolerance = meanDailyMg / moderateIntakeTotal;
    
    console.log('[CrashRiskService] 💪 Enhanced tolerance calculation - base:', {
      meanDailyMg,
      weightKg,
      moderateIntakeTotal,
      baseTolerance: baseTolerance.toFixed(3)
    });
    
    // Health factor adjustments
    let healthMultiplier = 1.0;
    
    // Age factor - tolerance building changes with age
    if (userProfile.age >= 65) {
      healthMultiplier *= 0.85; // Slower tolerance development in elderly
      console.log('[CrashRiskService] 👴 Age factor (65+): 0.85x');
    } else if (userProfile.age <= 18) {
      healthMultiplier *= 1.1; // Faster tolerance development in youth
      console.log('[CrashRiskService] 👶 Age factor (≤18): 1.1x');
    }
    
    // Sex-based differences in tolerance development
    if (userProfile.sex === 'female') {
      healthMultiplier *= 0.9; // Generally develop tolerance more slowly
      console.log('[CrashRiskService] 👩 Sex factor (female): 0.9x');
    }
    
    // Smoking status - significantly affects tolerance
    if (userProfile.smoker) {
      healthMultiplier *= 1.6; // Smokers develop much higher tolerance
      console.log('[CrashRiskService] 🚬 Smoking factor: 1.6x');
    }
    
    // Pregnancy factor - affects tolerance
    if (userProfile.pregnant) {
      healthMultiplier *= 0.3; // Pregnancy significantly reduces effective tolerance
      console.log('[CrashRiskService] 🤱 Pregnancy factor: 0.3x');
    }
    
    // Oral contraceptives factor
    if (userProfile.sex === 'female' && userProfile.oralContraceptives && !userProfile.pregnant) {
      healthMultiplier *= 0.8; // Reduced tolerance building capacity
      console.log('[CrashRiskService] 💊 Oral contraceptives factor: 0.8x');
    }
    
    // Apply health multiplier
    const adjustedTolerance = baseTolerance * healthMultiplier;
    
    // Experience factor based on reported intake patterns
    let experienceFactor = 1.0;
    if (meanDailyMg > 400) {
      experienceFactor = 1.3; // Heavy users have demonstrated tolerance
      console.log('[CrashRiskService] ☕ Heavy user experience factor: 1.3x');
    } else if (meanDailyMg < 50) {
      experienceFactor = 0.6; // Light users have limited tolerance
      console.log('[CrashRiskService] 🫖 Light user experience factor: 0.6x');
    }
    
    const finalTolerance = adjustedTolerance * experienceFactor;
    const result = ValidationService.clampValue(finalTolerance, 0, 1);
    
    console.log('[CrashRiskService] 💪 Enhanced tolerance calculation complete:', {
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
   * Calculate metabolic factor based on user characteristics
   */
  static calculateMetabolicFactor(profile: UserProfile): number {
    // Base metabolic factor
    let metabolicFactor = 1.0;
    
    // Sex-based metabolic differences (independent of hormonal factors)
    if (profile.sex === 'male') {
      metabolicFactor *= 0.95; // Slightly faster baseline metabolism
    } else {
      metabolicFactor *= 1.05; // Slightly slower baseline metabolism
    }
    
    return ValidationService.clampValue(metabolicFactor, 0.8, 1.2);
  }

  /**
   * Check if user has sufficient sleep data for 7-day average
   */
  static hasSevenDaysOfSleepData(profileCreatedAt: Date): boolean {
    const now = new Date();
    const daysSinceCreation = (now.getTime() - profileCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreation >= 7;
  }

  /**
   * Enhanced crash risk calculation with age, circadian rhythm, and 7-day sleep average
   * Formula: CrashRisk = 100 × (δ^0.6) × (S^0.4) × ((1-T)^0.3) × M × (C^0.2)
   */
  static async calculateCrashRisk(
    userProfile: UserProfile,
    drinks: DrinkRecord[],
    currentTime: Date = new Date()
  ): Promise<CrashRiskResult> {
    console.log('[CrashRiskService] 🧮 Starting crash risk calculation for user:', userProfile.userId);
    
    // Retrieve sleep data from storage
    const lastNightSleep = await StorageService.getLastNightSleep(userProfile.userId);
    const effectiveSleepHours = lastNightSleep || DEFAULT_VALUES.BASELINE_SLEEP_HOURS;
    
    // Validate inputs
    const validation = ValidationService.validateCalculationInputs(userProfile, drinks, effectiveSleepHours);
    if (!validation.isValid) {
      console.error('[CrashRiskService] ❌ Validation failed:', validation.errors);
      console.log('[CrashRiskService] 🛡️ Returning safe default crash risk due to validation errors');
      
      // Return a safe default result instead of throwing
      return {
        score: 0,
        factors: {
          delta: 0,
          sleepDebt: 0,
          tolerance: 0.5,
          metabolic: 1.0,
          circadian: 0.5
        },
        personalizedHalfLife: 6.0,
        currentCaffeineLevel: 0,
        peakCaffeineLevel: 0,
        validUntil: new Date(currentTime.getTime() + 1000),
        calculatedAt: currentTime
      };
    }

    // Calculate personalized half-life (now includes age factor)
    const personalizedHalfLife = this.calculatePersonalizedHalfLife(userProfile);
    console.log('[CrashRiskService] ⏱️ Personalized half-life:', personalizedHalfLife, 'hours');

    // Calculate current caffeine level
    const currentCaffeineLevel = this.calculateCurrentCaffeineLevel(drinks, personalizedHalfLife, currentTime);
    
    // Calculate peak caffeine level
    const peakCaffeineLevel = this.calculatePeakCaffeineLevel(drinks, personalizedHalfLife, currentTime);
    
    console.log('[CrashRiskService] ☕ Caffeine levels:', {
      current: currentCaffeineLevel,
      peak: peakCaffeineLevel,
      drinksAnalyzed: drinks.length,
      effectiveSleepHours
    });

    // Check if user has 7+ days of sleep data
    const hasSevenDaysData = this.hasSevenDaysOfSleepData(userProfile.createdAt);

    // Calculate all factors
    const delta = this.calculateDelta(drinks, personalizedHalfLife, currentTime);
    const sleepDebt = this.calculateSleepDebt(
      effectiveSleepHours, 
      userProfile.averageSleep7Days, 
      hasSevenDaysData
    );
    const tolerance = this.calculateTolerance(userProfile.meanDailyCaffeineMg, userProfile.weightKg, userProfile);
    const metabolic = this.calculateMetabolicFactor(userProfile);
    const circadian = this.calculateCircadianFactor(currentTime);

    console.log('[CrashRiskService] 📊 Risk factors calculated:', {
      delta: delta.toFixed(3),
      sleepDebt: sleepDebt.toFixed(3),
      tolerance: tolerance.toFixed(3),
      metabolic: metabolic.toFixed(3),
      circadian: circadian.toFixed(3),
      hasSevenDaysData,
      effectiveSleepHours
    });

    // Apply the enhanced formula with circadian rhythm
    // CrashRisk = 100 × (δ^0.6) × (S^0.4) × ((1-T)^0.3) × M × (C^0.2)
    const deltaComponent = Math.pow(delta, 0.6);
    const sleepComponent = Math.pow(sleepDebt, 0.4);
    const toleranceComponent = Math.pow(Math.max(1 - tolerance, 0), 0.3);
    const circadianComponent = Math.pow(circadian, 0.2);
    
    const rawScore = 100 * deltaComponent * sleepComponent * toleranceComponent * metabolic * circadianComponent;
    
    console.log('[CrashRiskService] 🔢 Score components:', {
      deltaComponent: deltaComponent.toFixed(3),
      sleepComponent: sleepComponent.toFixed(3),
      toleranceComponent: toleranceComponent.toFixed(3),
      circadianComponent: circadianComponent.toFixed(3),
      rawScore: rawScore.toFixed(1)
    });
    
    // Ensure final score is within bounds
    const finalScore = ValidationService.clampValue(Math.round(rawScore * 10) / 10, 0, 100);

    // Create cache validity (expires immediately - recalculate every app open)
    const validUntil = new Date(currentTime.getTime() + 1000); // 1 second validity for same session only

    const factors: CrashRiskFactors = {
      delta,
      sleepDebt,
      tolerance,
      metabolic,
      circadian
    };

    console.log('[CrashRiskService] ✅ Final crash risk score:', finalScore, 'Cache valid until:', validUntil.toISOString());

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

  /**
   * Project crash risk at a future time point
   */
  static async projectFutureRisk(
    userProfile: UserProfile,
    drinks: DrinkRecord[],
    futureTime: Date
  ): Promise<number> {
    try {
      const futureResult = await this.calculateCrashRisk(userProfile, drinks, futureTime);
      return futureResult.score;
    } catch (error) {
      console.error('Error projecting future risk:', error);
      return 0;
    }
  }

  /**
   * Generate risk curve for the next N hours
   */
  static async generateRiskCurve(
    userProfile: UserProfile,
    drinks: DrinkRecord[],
    hoursAhead: number = 6,
    intervalMinutes: number = 30
  ): Promise<RiskCurvePoint[]> {
    const curve: RiskCurvePoint[] = [];
    const now = new Date();
    const totalIntervals = Math.ceil((hoursAhead * 60) / intervalMinutes);
    const halfLife = this.calculatePersonalizedHalfLife(userProfile);

    for (let i = 0; i <= totalIntervals; i++) {
      const futureTime = new Date(now.getTime() + (i * intervalMinutes * 60 * 1000));
      const riskScore = await this.projectFutureRisk(userProfile, drinks, futureTime);
      
      curve.push({
        time: futureTime,
        riskScore: riskScore,
        caffeineLevel: this.calculateCurrentCaffeineLevel(drinks, halfLife, futureTime)
      });
    }

    return curve;
  }

  /**
   * Get crash risk interpretation and recommendations
   */
  static interpretCrashRisk(score: number): {
    level: 'low' | 'medium' | 'high';
    color: string;
    message: string;
    recommendation?: string;
  } {
    if (score <= 30) {
      return {
        level: 'low',
        color: '#2FBD60', // Theme.colors.primaryGreen
        message: 'Low crash risk',
        recommendation: 'Good time for focused work'
      };
    } else if (score <= 70) {
      return {
        level: 'medium',
        color: '#FFD56B', // Theme.colors.accentOrange
        message: 'Moderate crash risk',
        recommendation: 'Consider a small caffeine boost or break'
      };
    } else {
      return {
        level: 'high',
        color: '#FF4B4B', // Theme.colors.accentRed
        message: 'High crash risk',
        recommendation: 'Take a break or have some caffeine soon'
      };
    }
  }

  /**
   * Check if user has sufficient recent caffeine data for accurate predictions
   */
  static hasRecentCaffeineData(drinks: DrinkRecord[], hoursBack: number = 12): boolean {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursBack);
    
    return drinks.some(drink => drink.timestamp >= cutoffTime);
  }

  /**
   * Get next recommended caffeine timing (simplified)
   */
  static async getNextCaffeineRecommendation(
    userProfile: UserProfile,
    drinks: DrinkRecord[]
  ): Promise<{ hoursFromNow: number; reason: string } | null> {
    try {
      const currentRisk = await this.calculateCrashRisk(userProfile, drinks);
      
      // If current risk is high, recommend immediate caffeine
      if (currentRisk.score > 70) {
        return {
          hoursFromNow: 0,
          reason: 'High crash risk detected - caffeine recommended now'
        };
      }

      // Generate curve to find when risk will be high
      const curve = await this.generateRiskCurve(userProfile, drinks, 8);
      const highRiskPoint = curve.find(point => point.riskScore > 70);
      
      if (highRiskPoint) {
        const hoursFromNow = (highRiskPoint.time.getTime() - new Date().getTime()) / (1000 * 60 * 60);
        return {
          hoursFromNow: Math.max(0, hoursFromNow - 1), // Recommend 1 hour before peak risk
          reason: 'Preparing for predicted crash risk'
        };
      }

      return null; // No recommendation needed
    } catch (error) {
      console.error('Error generating caffeine recommendation:', error);
      return null;
    }
  }


} 