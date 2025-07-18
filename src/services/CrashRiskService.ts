import { 
  UserProfile, 
  DrinkRecord, 
  CrashRiskResult, 
  CrashRiskFactors, 
  RiskCurvePoint,
  DEFAULT_VALUES 
} from '../types';
import { ValidationService } from './ValidationService';

// Enhanced constants for absorption kinetics
const ABSORPTION_CONSTANTS = {
  // Caffeine absorption kinetics - peak absorption around 30 minutes
  PEAK_ABSORPTION_MINUTES: 30,
  ABSORPTION_WINDOW_MINUTES: 90, // 90% absorbed within 90 minutes
  MICRO_DOSE_INTERVAL_MINUTES: 1, // Break consumption into 1-minute intervals
  
  // Absorption curve parameters (beta distribution approximation)
  ABSORPTION_CURVE_ALPHA: 2, // Shape parameter for early absorption
  ABSORPTION_CURVE_BETA: 3,  // Shape parameter for late absorption
} as const;

export class CrashRiskService {
  /**
   * Parse time duration string (HH:MM:SS) to minutes
   */
  private static parseTimeToMinutes(timeStr: string): number {
    try {
      const parts = timeStr.split(':').map(p => parseInt(p, 10));
      if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        return hours * 60 + minutes + seconds / 60;
      }
      return 0; // Invalid format defaults to instant consumption
    } catch {
      return 0; // Invalid format defaults to instant consumption
    }
  }

  /**
   * Calculate absorption coefficient at a given time during consumption
   * Uses a beta distribution approximation to model realistic absorption kinetics
   * Peak absorption occurs around 30 minutes after consumption starts
   */
  private static getAbsorptionRate(
    minutesFromStart: number, 
    consumptionDurationMinutes: number
  ): number {
    // For very short consumption times, use instant absorption
    if (consumptionDurationMinutes <= 2) {
      return minutesFromStart <= consumptionDurationMinutes ? 1.0 : 0.0;
    }

    // Extend the absorption window beyond consumption time to model gastric emptying
    const absorptionWindow = Math.max(
      consumptionDurationMinutes, 
      ABSORPTION_CONSTANTS.PEAK_ABSORPTION_MINUTES
    );
    
    // If we're past the consumption period, no new absorption
    if (minutesFromStart > absorptionWindow) {
      return 0.0;
    }

    // Normalize time to [0, 1] over the absorption window
    const t = minutesFromStart / absorptionWindow;
    
    // Beta distribution approximation for absorption curve
    // This creates a curve that starts slow, peaks around 0.3-0.4, then tapers off
    const { ABSORPTION_CURVE_ALPHA: a, ABSORPTION_CURVE_BETA: b } = ABSORPTION_CONSTANTS;
    const betaValue = Math.pow(t, a - 1) * Math.pow(1 - t, b - 1);
    
    // Normalize so the curve integrates to approximately 1
    const normalizationFactor = 12; // Empirically determined for our beta parameters
    
    return Math.max(0, betaValue * normalizationFactor);
  }

  /**
   * Calculate caffeine contribution from a single drink at a specific time
   * using distributed absorption and exponential elimination
   */
  private static calculateDrinkContribution(
    drink: DrinkRecord,
    halfLife: number,
    currentTime: Date
  ): number {
    const consumptionStartTime = drink.timestamp.getTime();
    const currentTimeMs = currentTime.getTime();
    
    // If current time is before consumption started, no contribution
    if (currentTimeMs < consumptionStartTime) {
      return 0;
    }

    const consumptionDurationMinutes = this.parseTimeToMinutes(drink.timeToConsume);
    const totalCaffeine = drink.actualCaffeineConsumed;
    
    // For instant consumption (duration <= 1 minute), use old method
    if (consumptionDurationMinutes <= 1) {
      const hoursElapsed = (currentTimeMs - consumptionStartTime) / (1000 * 60 * 60);
      return totalCaffeine * Math.pow(2, -hoursElapsed / halfLife);
    }

    // For distributed consumption, integrate over micro-doses
    let totalContribution = 0;
    const microDoseCaffeine = totalCaffeine / consumptionDurationMinutes;
    
    // Process each minute of consumption
    for (let minute = 0; minute < consumptionDurationMinutes; minute += ABSORPTION_CONSTANTS.MICRO_DOSE_INTERVAL_MINUTES) {
      const doseTime = consumptionStartTime + (minute * 60 * 1000);
      
      // Skip if this micro-dose hasn't occurred yet
      if (currentTimeMs < doseTime) {
        continue;
      }

      // Calculate how much time has passed since this micro-dose
      const timeElapsed = currentTimeMs - doseTime;
      const minutesElapsed = timeElapsed / (1000 * 60);
      
      // Get the absorption rate for this point in the consumption
      const absorptionRate = this.getAbsorptionRate(minute, consumptionDurationMinutes);
      
      // Calculate absorbed amount considering absorption kinetics
      const absorptionDelay = ABSORPTION_CONSTANTS.PEAK_ABSORPTION_MINUTES;
      let absorbedFraction = 0;
      
      if (minutesElapsed > absorptionDelay) {
        // Full absorption after peak time
        absorbedFraction = 1.0;
      } else {
        // Gradual absorption leading up to peak
        absorbedFraction = Math.min(1.0, minutesElapsed / absorptionDelay);
      }
      
      const absorbedCaffeine = microDoseCaffeine * absorptionRate * absorbedFraction;
      
      // Apply elimination (half-life decay) from when it was absorbed
      const effectiveElapsedHours = Math.max(0, (minutesElapsed - absorptionDelay)) / 60;
      const remainingCaffeine = absorbedCaffeine * Math.pow(2, -effectiveElapsedHours / halfLife);
      
      totalContribution += remainingCaffeine;
    }

    return Math.max(0, totalContribution);
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
   * Enhanced caffeine level calculation using distributed absorption
   */
  static calculateCurrentCaffeineLevel(
    drinks: DrinkRecord[], 
    halfLife: number, 
    currentTime: Date = new Date()
  ): number {
    return drinks
      .filter(drink => drink.timestamp <= currentTime)
      .reduce((total, drink) => {
        const contribution = this.calculateDrinkContribution(drink, halfLife, currentTime);
        return total + contribution;
      }, 0);
  }

  /**
   * Calculate peak caffeine level in the last 6 hours with 5-minute resolution
   * Now uses enhanced distributed absorption
   */
  private static calculatePeakCaffeineLevel(
    drinks: DrinkRecord[],
    halfLife: number,
    currentTime: Date = new Date()
  ): number {
    const windowHours = DEFAULT_VALUES.PEAK_DETECTION_WINDOW_HOURS;
    const intervalMinutes = 5;
    const totalIntervals = (windowHours * 60) / intervalMinutes;
    
    let peakLevel = 0;
    
    for (let i = 0; i <= totalIntervals; i++) {
      const timePoint = new Date(currentTime.getTime() - (i * intervalMinutes * 60 * 1000));
      const levelAtTime = this.calculateCurrentCaffeineLevel(drinks, halfLife, timePoint);
      peakLevel = Math.max(peakLevel, levelAtTime);
    }
    
    return peakLevel;
  }

  /**
   * Calculate delta (relative drop from peak)
   */
  static calculateDelta(
    drinks: DrinkRecord[],
    halfLife: number,
    currentTime: Date = new Date()
  ): number {
    const currentLevel = this.calculateCurrentCaffeineLevel(drinks, halfLife, currentTime);
    const peakLevel = this.calculatePeakCaffeineLevel(drinks, halfLife, currentTime);
    
    // Avoid division by zero
    if (peakLevel <= 1e-6) return 0;
    
    const delta = Math.max((peakLevel - currentLevel) / peakLevel, 0);
    return ValidationService.clampValue(delta, 0, 1);
  }

  /**
   * Calculate circadian rhythm factor based on time of day
   * Caffeine sensitivity varies throughout the day due to circadian rhythms
   */
  static calculateCircadianFactor(currentTime: Date = new Date()): number {
    const hour = currentTime.getHours();
    
    // Caffeine sensitivity by time of day (0-1 scale, higher = more sensitive to crash)
    if (hour >= 22 || hour <= 6) {
      return 1.0; // Night: Highest sensitivity (22:00-06:00)
    } else if (hour >= 7 && hour <= 9) {
      return 0.6; // Morning: Moderate sensitivity (07:00-09:00)
    } else if (hour >= 10 && hour <= 16) {
      return 0.4; // Midday: Lowest sensitivity (10:00-16:00)
    } else if (hour >= 17 && hour <= 21) {
      return 0.7; // Evening: High sensitivity (17:00-21:00)
    }
    
    return 0.5; // Default fallback
  }

  /**
   * Enhanced sleep debt calculation using 7-day average when available
   * Falls back to single night if insufficient data
   */
  static calculateSleepDebt(
    lastNightSleep: number,
    averageSleep7Days?: number,
    hasSevenDaysData: boolean = false
  ): number {
    const baseline = DEFAULT_VALUES.BASELINE_SLEEP_HOURS; // 7.5 hours
    const maxDebt = 3; // Maximum debt hours to consider
    
    // Use 7-day average if available and user has 7+ days of data
    const sleepToUse = (hasSevenDaysData && averageSleep7Days) 
      ? averageSleep7Days 
      : lastNightSleep;
    
    const sleepDebt = Math.max(baseline - sleepToUse, 0);
    const normalizedDebt = sleepDebt / maxDebt;
    
    return ValidationService.clampValue(normalizedDebt, 0, 1);
  }

  /**
   * Calculate caffeine tolerance factor
   */
  static calculateTolerance(meanDailyMg: number, weightKg: number): number {
    const moderateIntakeMgPerKg = DEFAULT_VALUES.MODERATE_CAFFEINE_MG_PER_KG; // 4 mg/kg/day
    const moderateIntakeTotal = moderateIntakeMgPerKg * weightKg;
    
    if (moderateIntakeTotal <= 0) return 0;
    
    const tolerance = meanDailyMg / moderateIntakeTotal;
    return ValidationService.clampValue(tolerance, 0, 1);
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
  private static hasSevenDaysOfSleepData(profileCreatedAt: Date): boolean {
    const daysSinceCreation = (new Date().getTime() - profileCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreation >= 7;
  }

  /**
   * Enhanced crash risk calculation with age, circadian rhythm, and 7-day sleep average
   * Formula: CrashRisk = 100 × (δ^0.6) × (S^0.4) × ((1-T)^0.3) × M × (C^0.2)
   */
  static calculateCrashRisk(
    userProfile: UserProfile,
    drinks: DrinkRecord[],
    lastNightSleep: number,
    currentTime: Date = new Date()
  ): CrashRiskResult {
    // Validate inputs
    const validation = ValidationService.validateCalculationInputs(userProfile, drinks, lastNightSleep);
    if (!validation.isValid) {
      throw new Error(`Invalid calculation inputs: ${validation.errors.join(', ')}`);
    }

    // Calculate personalized half-life (now includes age factor)
    const personalizedHalfLife = this.calculatePersonalizedHalfLife(userProfile);

    // Calculate current caffeine level
    const currentCaffeineLevel = this.calculateCurrentCaffeineLevel(drinks, personalizedHalfLife, currentTime);
    
    // Calculate peak caffeine level
    const peakCaffeineLevel = this.calculatePeakCaffeineLevel(drinks, personalizedHalfLife, currentTime);

    // Check if user has 7+ days of sleep data
    const hasSevenDaysData = this.hasSevenDaysOfSleepData(userProfile.createdAt);

    // Calculate all factors
    const delta = this.calculateDelta(drinks, personalizedHalfLife, currentTime);
    const sleepDebt = this.calculateSleepDebt(
      lastNightSleep, 
      userProfile.averageSleep7Days, 
      hasSevenDaysData
    );
    const tolerance = this.calculateTolerance(userProfile.meanDailyCaffeineMg, userProfile.weightKg);
    const metabolic = this.calculateMetabolicFactor(userProfile);
    const circadian = this.calculateCircadianFactor(currentTime);

    // Apply the enhanced formula with circadian rhythm
    // CrashRisk = 100 × (δ^0.6) × (S^0.4) × ((1-T)^0.3) × M × (C^0.2)
    const deltaComponent = Math.pow(delta, 0.6);
    const sleepComponent = Math.pow(sleepDebt, 0.4);
    const toleranceComponent = Math.pow(Math.max(1 - tolerance, 0), 0.3);
    const circadianComponent = Math.pow(circadian, 0.2);
    
    const rawScore = 100 * deltaComponent * sleepComponent * toleranceComponent * metabolic * circadianComponent;
    
    // Ensure final score is within bounds
    const finalScore = ValidationService.clampValue(Math.round(rawScore * 10) / 10, 0, 100);

    // Create cache validity (5 minutes from now)
    const validUntil = new Date(currentTime.getTime() + DEFAULT_VALUES.CACHE_VALIDITY_MINUTES * 60 * 1000);

    const factors: CrashRiskFactors = {
      delta,
      sleepDebt,
      tolerance,
      metabolic,
      circadian
    };

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
  static projectFutureRisk(
    userProfile: UserProfile,
    drinks: DrinkRecord[],
    lastNightSleep: number,
    futureTime: Date
  ): number {
    try {
      const futureResult = this.calculateCrashRisk(userProfile, drinks, lastNightSleep, futureTime);
      return futureResult.score;
    } catch (error) {
      console.error('Error projecting future risk:', error);
      return 0;
    }
  }

  /**
   * Generate risk curve for the next N hours
   */
  static generateRiskCurve(
    userProfile: UserProfile,
    drinks: DrinkRecord[],
    lastNightSleep: number,
    hoursAhead: number = 6,
    intervalMinutes: number = 30
  ): RiskCurvePoint[] {
    const curve: RiskCurvePoint[] = [];
    const now = new Date();
    const totalIntervals = Math.ceil((hoursAhead * 60) / intervalMinutes);
    const halfLife = this.calculatePersonalizedHalfLife(userProfile);

    for (let i = 0; i <= totalIntervals; i++) {
      const timePoint = new Date(now.getTime() + (i * intervalMinutes * 60 * 1000));
      
      try {
        const riskScore = this.projectFutureRisk(userProfile, drinks, lastNightSleep, timePoint);
        const caffeineLevel = this.calculateCurrentCaffeineLevel(drinks, halfLife, timePoint);
        
        curve.push({
          time: timePoint,
          riskScore,
          caffeineLevel
        });
      } catch (error) {
        // If calculation fails, use previous value or zero
        const lastPoint = curve[curve.length - 1];
        curve.push({
          time: timePoint,
          riskScore: lastPoint ? lastPoint.riskScore : 0,
          caffeineLevel: lastPoint ? lastPoint.caffeineLevel : 0
        });
      }
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
  static getNextCaffeineRecommendation(
    userProfile: UserProfile,
    drinks: DrinkRecord[],
    lastNightSleep: number
  ): { hoursFromNow: number; reason: string } | null {
    try {
      const currentRisk = this.calculateCrashRisk(userProfile, drinks, lastNightSleep);
      
      // If current risk is high, recommend immediate caffeine
      if (currentRisk.score > 70) {
        return {
          hoursFromNow: 0,
          reason: 'High crash risk detected'
        };
      }

      // Generate curve to find when risk will be high
      const curve = this.generateRiskCurve(userProfile, drinks, lastNightSleep, 8);
      const highRiskPoint = curve.find(point => point.riskScore > 70);
      
      if (highRiskPoint) {
        const hoursFromNow = (highRiskPoint.time.getTime() - new Date().getTime()) / (1000 * 60 * 60);
        const recommendedTime = Math.max(hoursFromNow - 0.5, 0); // Suggest 30 min before
        
        return {
          hoursFromNow: recommendedTime,
          reason: 'To prevent upcoming crash'
        };
      }

      return null; // No recommendation needed
    } catch (error) {
      console.error('Error getting caffeine recommendation:', error);
      return null;
    }
  }
} 