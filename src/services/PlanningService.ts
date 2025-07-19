import { 
  UserProfile, 
  DrinkRecord, 
  FocusSession, 
  CaffeineRecommendation, 
  CaffeinePlan, 
  PlanningPreferences,
  CaffeineCurvePoint,
  PlanningResult,
  DEFAULT_VALUES 
} from '../types';
import { CrashRiskService } from './CrashRiskService';
import { CaffScoreService } from './CaffScoreService';
import { ValidationService } from './ValidationService';
import { StorageService } from './StorageService';

export class PlanningService {
  /**
   * Default planning preferences for new users
   */
  static readonly DEFAULT_PREFERENCES: Omit<PlanningPreferences, 'userId' | 'createdAt' | 'updatedAt'> = {
    maxSessionsPerDay: 2,
    preferredDoseMgMin: 80,
    preferredDoseMgMax: 200,
    sleepBufferHours: 6,
    enableSmartAdjustments: true,
    notificationsEnabled: true,
    targetBedtime: '10:00 PM'
  };

  /**
   * Calculate optimal caffeine timing for a focus session
   * Uses ~45 minute absorption ramp to align peak effect with session start
   */
  static calculateOptimalCaffeineTime(sessionStart: Date, doseMg: number): Date {
    // Peak caffeine effect occurs ~45-60 minutes after consumption
    // Adjust timing based on dose size (larger doses peak slightly later)
    let absorptionMinutes = 45;
    
    if (doseMg >= 150) {
      absorptionMinutes = 55; // Larger doses take longer to peak
    } else if (doseMg <= 100) {
      absorptionMinutes = 40; // Smaller doses peak faster
    }
    
    const optimalTime = new Date(sessionStart);
    optimalTime.setMinutes(optimalTime.getMinutes() - absorptionMinutes);
    
    return optimalTime;
  }

  /**
   * Calculate recommended dose based on session importance, spacing, and user tolerance
   */
  static calculateRecommendedDose(
    session: FocusSession,
    userProfile: UserProfile,
    preferences: PlanningPreferences,
    currentCaffeineLevel: number,
    existingRecommendations: CaffeineRecommendation[]
  ): number {
    const toleranceThreshold = userProfile.meanDailyCaffeineMg || 200;
    
    // Base dose by importance
    let baseDose = 120; // Normal session
    if (session.importance === 3) baseDose = 180; // Critical
    if (session.importance === 1) baseDose = 100; // Low priority
    
    // Adjust for current caffeine level
    const caffeineAdjustment = Math.max(0, currentCaffeineLevel * 0.8);
    baseDose = Math.max(baseDose - caffeineAdjustment, 50);
    
    // Factor in user tolerance
    const toleranceFactor = Math.min(toleranceThreshold / 200, 1.5);
    baseDose *= toleranceFactor;
    
    // Calculate total planned caffeine so far today
    const totalPlannedToday = existingRecommendations.reduce((sum, rec) => sum + rec.doseMg, 0);
    
    // Respect daily limits (400mg max, user preference max)
    const maxDailyIntake = Math.min(400, userProfile.meanDailyCaffeineMg * 1.2);
    const remainingCapacity = maxDailyIntake - totalPlannedToday;
    
    // Apply preferences bounds
    baseDose = Math.max(baseDose, preferences.preferredDoseMgMin);
    baseDose = Math.min(baseDose, preferences.preferredDoseMgMax);
    baseDose = Math.min(baseDose, remainingCapacity);
    
    return Math.round(Math.max(baseDose, 0));
  }

  /**
   * Calculate latest safe caffeine time to avoid sleep disruption
   */
  static calculateLatestSafeCaffeineTime(
    bedtime: Date, 
    userProfile: UserProfile,
    sleepBufferHours: number
  ): Date {
    const personalizedHalfLife = CrashRiskService.calculatePersonalizedHalfLife(userProfile);
    
    // Calculate how many half-lives needed to reach 25mg (safe sleep level)
    const targetLevel = 25; // mg
    const maxSafeDose = 150; // Assume this as a reasonable evening dose
    const halfLivesNeeded = Math.log2(maxSafeDose / targetLevel);
    
    // Time needed for caffeine to decay to safe levels
    const decayHours = halfLivesNeeded * personalizedHalfLife;
    
    // Add user's preferred buffer
    const totalBufferHours = Math.max(decayHours, sleepBufferHours);
    
    const latestTime = new Date(bedtime);
    latestTime.setHours(latestTime.getHours() - totalBufferHours);
    
    return latestTime;
  }

  /**
   * Generate caffeine curve projection for the next 24 hours
   */
  static async generateCaffeineCurve(
    userProfile: UserProfile,
    existingDrinks: DrinkRecord[],
    plannedRecommendations: CaffeineRecommendation[],
    startTime: Date = new Date()
  ): Promise<CaffeineCurvePoint[]> {
    const personalizedHalfLife = CrashRiskService.calculatePersonalizedHalfLife(userProfile);
    const curve: CaffeineCurvePoint[] = [];
    
    // Generate points every 30 minutes for 24 hours
    for (let i = 0; i <= 48; i++) {
      const timePoint = new Date(startTime);
      timePoint.setMinutes(timePoint.getMinutes() + (i * 30));
      
      // Calculate current caffeine level from existing drinks
      const currentLevel = CrashRiskService.calculateCurrentCaffeineLevel(
        existingDrinks,
        personalizedHalfLife,
        timePoint
      );
      
      // Add projected caffeine from planned recommendations
      let projectedLevel = currentLevel;
      plannedRecommendations.forEach(rec => {
        if (rec.status === 'pending' && timePoint >= rec.recommendedTime) {
          const hoursElapsed = (timePoint.getTime() - rec.recommendedTime.getTime()) / (1000 * 60 * 60);
          if (hoursElapsed >= 0) {
            // Simulate the drink as if it were consumed at the recommended time
            const concentration = rec.doseMg * Math.pow(2, -hoursElapsed / personalizedHalfLife);
            projectedLevel += concentration;
          }
        }
      });
      
      // Determine zone based on caffeine level
      const toleranceThreshold = userProfile.meanDailyCaffeineMg || 200;
      let zone: CaffeineCurvePoint['zone'] = 'low';
      
      if (projectedLevel < toleranceThreshold * 0.3) zone = 'low';
      else if (projectedLevel < toleranceThreshold * 0.8) zone = 'building';
      else if (projectedLevel < toleranceThreshold * 1.2) zone = 'peak';
      else if (projectedLevel < toleranceThreshold * 1.5) zone = 'stable';
      else if (projectedLevel > toleranceThreshold * 1.5) zone = 'declining';
      
      // Check for crash risk (simplified)
      if (i > 0) {
        const previousLevel = curve[i - 1]?.projectedLevel || 0;
        const dropRate = (previousLevel - projectedLevel) / 0.5; // per hour
        if (dropRate > 30) zone = 'crash'; // Rapid decline
      }
      
      curve.push({
        time: timePoint,
        caffeineLevel: currentLevel,
        projectedLevel,
        zone
      });
    }
    
    return curve;
  }

  /**
   * Generate complete caffeine plan for a day
   */
  static async generateDailyPlan(
    userProfile: UserProfile,
    sessions: FocusSession[],
    bedtime: Date,
    preferences: PlanningPreferences,
    existingDrinks: DrinkRecord[] = []
  ): Promise<PlanningResult> {
    console.log('[PlanningService] 🧠 Generating daily caffeine plan');
    
    const planDate = new Date().toISOString().split('T')[0];
    const recommendations: CaffeineRecommendation[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    const conflictResolutions: string[] = [];
    
    // Calculate latest safe caffeine time
    const latestSafeCaffeineTime = this.calculateLatestSafeCaffeineTime(
      bedtime, 
      userProfile, 
      preferences.sleepBufferHours
    );
    
    // Sort sessions by start time
    const sortedSessions = [...sessions].sort((a, b) => 
      a.startTime.getTime() - b.startTime.getTime()
    );
    
    // Generate recommendations for each session
    for (let i = 0; i < sortedSessions.length; i++) {
      const session = sortedSessions[i];
      
      // Skip if session is too close to bedtime
      if (session.startTime >= latestSafeCaffeineTime) {
        warnings.push(`${session.name} is too close to bedtime for safe caffeine use`);
        continue;
      }
      
      // Calculate current caffeine level at session time
      const currentLevel = CrashRiskService.calculateCurrentCaffeineLevel(
        existingDrinks,
        CrashRiskService.calculatePersonalizedHalfLife(userProfile),
        session.startTime
      );
      
      // Calculate recommended dose
      const doseMg = this.calculateRecommendedDose(
        session,
        userProfile,
        preferences,
        currentLevel,
        recommendations
      );
      
      if (doseMg < preferences.preferredDoseMgMin) {
        warnings.push(`Recommended dose for ${session.name} is below your minimum preference`);
        continue;
      }
      
      // Calculate optimal timing
      const recommendedTime = this.calculateOptimalCaffeineTime(session.startTime, doseMg);
      
      // Check for conflicts with previous recommendations
      const timeSinceLastRec = recommendations.length > 0 ? 
        (recommendedTime.getTime() - recommendations[recommendations.length - 1].recommendedTime.getTime()) / (1000 * 60 * 60) : 24;
      
      if (timeSinceLastRec < 2) {
        conflictResolutions.push(`Adjusted timing for ${session.name} to avoid overlap`);
        recommendedTime.setHours(recommendedTime.getHours() + (2 - timeSinceLastRec));
      }
      
      // Create recommendation
      const recommendation: CaffeineRecommendation = {
        id: `rec_${session.id}_${Date.now()}`,
        sessionId: session.id,
        recommendedTime,
        doseMg,
        reasoning: `Optimized for ${session.importance === 3 ? 'critical' : session.importance === 2 ? 'important' : 'normal'} focus session`,
        sippingWindowMinutes: Math.max(15, Math.min(30, doseMg / 6)), // ~6mg per minute sipping rate
        confidence: 0.85,
        status: 'pending'
      };
      
      recommendations.push(recommendation);
    }
    
    // Create the plan
    const plan: CaffeinePlan = {
      id: `plan_${userProfile.userId}_${planDate}_${Date.now()}`,
      userId: userProfile.userId,
      planDate,
      bedtime,
      sessions: sortedSessions,
      recommendations,
      latestSafeCaffeineTime,
      totalPlannedCaffeine: recommendations.reduce((sum, rec) => sum + rec.doseMg, 0),
      generatedAt: new Date(),
      lastUpdatedAt: new Date()
    };
    
    // Generate caffeine curve
    const caffeineCurve = await this.generateCaffeineCurve(
      userProfile,
      existingDrinks,
      recommendations
    );
    
    // Add suggestions
    if (plan.totalPlannedCaffeine > 400) {
      suggestions.push('Consider reducing doses or removing less important sessions');
    }
    if (recommendations.length === 0) {
      suggestions.push('Add focus sessions to get personalized caffeine recommendations');
    }
    
    console.log('[PlanningService] ✅ Daily plan generated:', {
      sessionsPlanned: sessions.length,
      recommendations: recommendations.length,
      totalCaffeine: plan.totalPlannedCaffeine,
      warnings: warnings.length
    });
    
    return {
      plan,
      caffeineCurve,
      warnings,
      suggestions,
      conflictResolutions
    };
  }

  /**
   * Adjust plan based on actual drink consumption
   */
  static async adjustPlanForActualIntake(
    plan: CaffeinePlan,
    userProfile: UserProfile,
    newDrink: DrinkRecord
  ): Promise<PlanningResult> {
    console.log('[PlanningService] 🔄 Adjusting plan for actual intake');
    
    // Get all drinks for today including the new one
    const todaysDrinks = await StorageService.getDrinksForDate(userProfile.userId, plan.planDate);
    
    // Mark any recommendations as consumed or adjust if needed
    const updatedRecommendations = plan.recommendations.map(rec => {
      // Check if this drink matches a recommendation (within 1 hour window)
      const timeDiff = Math.abs(newDrink.timestamp.getTime() - rec.recommendedTime.getTime()) / (1000 * 60 * 60);
      const doseDiff = Math.abs(newDrink.actualCaffeineConsumed - rec.doseMg);
      
      if (timeDiff <= 1 && doseDiff <= 50) {
        return {
          ...rec,
          status: 'consumed' as const,
          actualDrinkId: newDrink.id
        };
      }
      
      return rec;
    });
    
    // Check if we need to cancel future recommendations due to high caffeine level
    const currentLevel = CrashRiskService.calculateCurrentCaffeineLevel(
      todaysDrinks,
      CrashRiskService.calculatePersonalizedHalfLife(userProfile),
      new Date()
    );
    
    const warnings: string[] = [];
    if (currentLevel > userProfile.meanDailyCaffeineMg * 1.5) {
      warnings.push('High caffeine level detected - consider skipping remaining planned drinks');
    }
    
    // Regenerate curve with actual data
    const caffeineCurve = await this.generateCaffeineCurve(
      userProfile,
      todaysDrinks,
      updatedRecommendations.filter(r => r.status === 'pending')
    );
    
    const updatedPlan: CaffeinePlan = {
      ...plan,
      recommendations: updatedRecommendations,
      lastUpdatedAt: new Date()
    };
    
    return {
      plan: updatedPlan,
      caffeineCurve,
      warnings,
      suggestions: [],
      conflictResolutions: []
    };
  }

  /**
   * React to a new drink being logged - update today's plan if it exists
   */
  static async reactToDrinkLogged(userId: string, newDrink: DrinkRecord): Promise<void> {
    try {
      console.log('[PlanningService] 🔄 Reacting to drink logged:', newDrink.name);
      
      // Get user profile
      const userProfile = await StorageService.getUserProfile();
      if (!userProfile || userProfile.userId !== userId) {
        console.log('[PlanningService] ⚠️ No matching user profile found');
        return;
      }

      // Get today's plan
      const todaysPlan = await StorageService.getTodaysPlan(userId);
      if (!todaysPlan) {
        console.log('[PlanningService] ⚠️ No plan found for today');
        return;
      }

      // Adjust the plan based on the new drink
      const adjustedResult = await this.adjustPlanForActualIntake(
        todaysPlan,
        userProfile,
        newDrink
      );

      // Save the updated plan
      await StorageService.saveCaffeinePlan(adjustedResult.plan);

      console.log('[PlanningService] ✅ Plan updated successfully');

      // If there are warnings, we could store them for display in the planning screen
      if (adjustedResult.warnings.length > 0) {
        console.log('[PlanningService] ⚠️ Plan adjustment warnings:', adjustedResult.warnings);
      }

    } catch (error) {
      console.error('[PlanningService] ❌ Error reacting to drink logged:', error);
    }
  }
}
