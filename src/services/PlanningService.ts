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
import { StorageService } from './StorageService';
import { CaffScoreService } from './CaffScoreService';

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
   * Calculate latest safe caffeine time to avoid sleep disruption
   */
  static async calculateLatestSafeCaffeineTime(
    bedtime: Date, 
    userProfile: UserProfile,
    sleepBufferHours: number
  ): Promise<Date> {
    const personalizedHalfLife = await CaffScoreService.calculatePersonalizedHalfLife(userProfile, null, new Date());
    
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
   * Calculate optimal caffeine timing for a focus session
   * Peak caffeine effect occurs ~45 minutes after consumption
   */
  static calculateOptimalCaffeineTime(sessionStart: Date): Date {
    const optimalTime = new Date(sessionStart);
    optimalTime.setMinutes(optimalTime.getMinutes() - 45); // 45 minutes before session
    return optimalTime;
  }

  /**
   * Calculate recommended dose based on session importance
   */
  static calculateRecommendedDose(
    session: FocusSession,
    userProfile: UserProfile,
    preferences: PlanningPreferences
  ): number {
    const toleranceThreshold = userProfile.meanDailyCaffeineMg || 200;
    
    // Base dose by importance
    let baseDose = 120; // Normal session (importance 2)
    if (session.importance === 3) baseDose = 180; // Critical
    if (session.importance === 1) baseDose = 100; // Low priority
    
    // Factor in user tolerance
    const toleranceFactor = Math.min(toleranceThreshold / 200, 1.5);
    baseDose *= toleranceFactor;
    
    // Apply preferences bounds
    baseDose = Math.max(baseDose, preferences.preferredDoseMgMin);
    baseDose = Math.min(baseDose, preferences.preferredDoseMgMax);
    
    return Math.round(baseDose);
  }

  /**
   * Calculate sipping duration based on dose
   */
  static calculateSippingDuration(doseMg: number): number {
    // Aim for ~6mg per minute sipping rate
    const sippingMinutes = Math.max(15, Math.min(30, doseMg / 6));
    return Math.round(sippingMinutes);
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
    console.log('[PlanningService] 🧠 Generating simple caffeine plan for', sessions.length, 'sessions');
    
    const planDate = new Date().toISOString().split('T')[0];
    const recommendations: CaffeineRecommendation[] = [];
    
    // Calculate latest safe caffeine time
    const latestSafeCaffeineTime = await this.calculateLatestSafeCaffeineTime(
      bedtime, 
      userProfile, 
      preferences.sleepBufferHours
    );

    // Sort sessions by start time
    const sortedSessions = [...sessions].sort((a, b) => 
      a.startTime.getTime() - b.startTime.getTime()
    );
    
    // Generate recommendations for each session
    sortedSessions.forEach((session, index) => {
      // Calculate optimal caffeine timing
      const recommendedTime = this.calculateOptimalCaffeineTime(session.startTime);
      
      // Skip if too late (after bedtime cutoff)
      if (recommendedTime >= latestSafeCaffeineTime) {
        console.log('[PlanningService] Skipping session', session.name, '- too close to bedtime');
        return;
      }
      
      // Calculate dose
      const doseMg = this.calculateRecommendedDose(session, userProfile, preferences);
      
      // Calculate sipping duration
      const sippingWindowMinutes = this.calculateSippingDuration(doseMg);
      
      // Create recommendation
      const recommendation: CaffeineRecommendation = {
        id: `rec_${session.id}_${Date.now()}`,
        sessionId: session.id,
        recommendedTime,
        doseMg,
        reasoning: `Optimal timing for ${session.name}`,
        sippingWindowMinutes,
        confidence: 0.9,
        status: 'pending'
      };
      
      recommendations.push(recommendation);
    });
    
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
    
    console.log('[PlanningService] ✅ Simple plan generated:', {
      sessionsPlanned: sessions.length,
      recommendations: recommendations.length,
      totalCaffeine: plan.totalPlannedCaffeine,
      latestSafeTime: latestSafeCaffeineTime.toLocaleTimeString()
    });
    
    return {
      plan,
      caffeineCurve: [], // Not needed for simple implementation
      warnings: [],
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

      // Mark matching recommendations as consumed (simple matching by time proximity)
      const updatedRecommendations = todaysPlan.recommendations.map(rec => {
        const timeDiff = Math.abs(newDrink.timestamp.getTime() - rec.recommendedTime.getTime()) / (1000 * 60);
        const doseDiff = Math.abs(newDrink.actualCaffeineConsumed - rec.doseMg);
        
        // Consider it a match if within 90 minutes and 50mg
        if (timeDiff <= 90 && doseDiff <= 50) {
          return {
            ...rec,
            status: 'consumed' as const,
            actualDrinkId: newDrink.id
          };
        }
        return rec;
      });

      // Update and save the plan
      const updatedPlan: CaffeinePlan = {
        ...todaysPlan,
        recommendations: updatedRecommendations,
        lastUpdatedAt: new Date()
      };

      await StorageService.saveCaffeinePlan(updatedPlan);
      console.log('[PlanningService] ✅ Plan updated successfully');

    } catch (error) {
      console.error('[PlanningService] ❌ Error reacting to drink logged:', error);
    }
  }
}
