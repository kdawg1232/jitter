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
   * ENHANCED: Find the best possible caffeine timing with intelligent conflict resolution
   * Tries multiple timing windows to find optimal solution even when conflicts exist
   */
  static findBestCaffeineTimingWindow(
    session: FocusSession,
    doseMg: number,
    existingRecommendations: CaffeineRecommendation[],
    latestSafeCaffeineTime: Date,
    userProfile: UserProfile,
    existingDrinks: DrinkRecord[]
  ): { 
    recommendedTime: Date; 
    effectiveness: number; 
    reasoning: string; 
    isCompromise: boolean;
  } {
    const idealTime = this.calculateOptimalCaffeineTime(session.startTime, doseMg);
    const halfLife = CrashRiskService.calculatePersonalizedHalfLife(userProfile);
    
    // Define timing windows to try (in minutes before session)
    const timingWindows = [45, 30, 60, 75, 90, 20]; // Start with ideal, then alternatives
    
    let bestOption = {
      recommendedTime: idealTime,
      effectiveness: 0,
      reasoning: 'No safe timing found',
      isCompromise: true
    };

    for (const windowMinutes of timingWindows) {
      const candidateTime = new Date(session.startTime);
      candidateTime.setMinutes(candidateTime.getMinutes() - windowMinutes);
      
      // Skip if too late (after bedtime cutoff)
      if (candidateTime >= latestSafeCaffeineTime) continue;
      
      // Skip if too early (more than 2 hours before session)
      const minutesToSession = (session.startTime.getTime() - candidateTime.getTime()) / (1000 * 60);
      if (minutesToSession > 120) continue;
      
      // Check conflicts with existing recommendations
      const hasConflict = existingRecommendations.some(rec => {
        const timeDiff = Math.abs(candidateTime.getTime() - rec.recommendedTime.getTime()) / (1000 * 60);
        return timeDiff < 90; // 1.5 hour minimum spacing
      });
      
      if (hasConflict) continue;
      
      // Calculate effectiveness at session time
      const hoursToSession = (session.startTime.getTime() - candidateTime.getTime()) / (1000 * 60 * 60);
      const caffeineAtSession = doseMg * Math.pow(2, -hoursToSession / halfLife);
      
      // Account for absorption timing (peak around 45-60 minutes)
      const absorptionFactor = this.calculateAbsorptionEffectiveness(minutesToSession);
      const effectiveness = caffeineAtSession * absorptionFactor;
      
      if (effectiveness > bestOption.effectiveness) {
        const isIdeal = windowMinutes === 45;
        bestOption = {
          recommendedTime: candidateTime,
          effectiveness,
          reasoning: isIdeal 
            ? `Perfect timing for peak effect during ${session.name}`
            : `Adjusted timing (${windowMinutes} min before) for ${session.name} - ${Math.round(effectiveness)}% effectiveness`,
          isCompromise: !isIdeal
        };
      }
    }
    
    return bestOption;
  }

  /**
   * Calculate absorption effectiveness based on timing
   */
  private static calculateAbsorptionEffectiveness(minutesBeforeSession: number): number {
    // Peak effectiveness around 45-60 minutes
    if (minutesBeforeSession >= 40 && minutesBeforeSession <= 65) return 1.0;
    if (minutesBeforeSession >= 30 && minutesBeforeSession <= 75) return 0.85;
    if (minutesBeforeSession >= 20 && minutesBeforeSession <= 90) return 0.65;
    return 0.4; // Still some benefit but not optimal
  }

  /**
   * ENHANCED: Smart dose calculation with caffeine level prediction
   */
  static calculateSmartRecommendedDose(
    session: FocusSession,
    userProfile: UserProfile,
    preferences: PlanningPreferences,
    recommendedTime: Date,
    existingRecommendations: CaffeineRecommendation[],
    existingDrinks: DrinkRecord[]
  ): number {
    const toleranceThreshold = userProfile.meanDailyCaffeineMg || 200;
    const halfLife = CrashRiskService.calculatePersonalizedHalfLife(userProfile);
    
    // Calculate caffeine level at recommended time
    const currentLevelAtTime = CrashRiskService.calculateCurrentCaffeineLevel(
      existingDrinks,
      halfLife,
      recommendedTime
    );
    
    // Add caffeine from other planned recommendations
    let plannedLevelAtTime = currentLevelAtTime;
    existingRecommendations.forEach(rec => {
      if (rec.status === 'pending' && rec.recommendedTime < recommendedTime) {
        const hoursElapsed = (recommendedTime.getTime() - rec.recommendedTime.getTime()) / (1000 * 60 * 60);
        plannedLevelAtTime += rec.doseMg * Math.pow(2, -hoursElapsed / halfLife);
      }
    });
    
    // Base dose by importance
    let targetLevel = toleranceThreshold * 0.6; // 60% of tolerance for normal sessions
    if (session.importance === 3) targetLevel = toleranceThreshold * 0.9; // 90% for critical
    if (session.importance === 1) targetLevel = toleranceThreshold * 0.4; // 40% for low priority
    
    // Calculate needed dose to reach target level
    let neededDose = Math.max(targetLevel - plannedLevelAtTime, 0);
    
    // Apply constraints
    neededDose = Math.max(neededDose, preferences.preferredDoseMgMin);
    neededDose = Math.min(neededDose, preferences.preferredDoseMgMax);
    
    // Check daily limits
    const totalPlannedToday = existingRecommendations.reduce((sum, rec) => sum + rec.doseMg, 0);
    const remainingCapacity = Math.min(400, userProfile.meanDailyCaffeineMg * 1.2) - totalPlannedToday;
    neededDose = Math.min(neededDose, remainingCapacity);
    
    return Math.round(Math.max(neededDose, 0));
  }

  /**
   * ENHANCED: Intelligent bedtime conflict resolution
   */
  static resolveBedtimeConflicts(
    sessions: FocusSession[],
    bedtime: Date,
    userProfile: UserProfile,
    preferences: PlanningPreferences
  ): {
    viableSessions: FocusSession[];
    rejectedSessions: { session: FocusSession; reason: string; alternatives: string[] }[];
  } {
    const latestSafeCaffeineTime = this.calculateLatestSafeCaffeineTime(
      bedtime, 
      userProfile, 
      preferences.sleepBufferHours
    );
    
    const viableSessions: FocusSession[] = [];
    const rejectedSessions: { session: FocusSession; reason: string; alternatives: string[] }[] = [];
    
    sessions.forEach(session => {
      // Check if even the latest possible caffeine time could work
      const latestPossibleCaffeineTime = new Date(session.startTime);
      latestPossibleCaffeineTime.setMinutes(latestPossibleCaffeineTime.getMinutes() - 20); // 20 min minimum
      
      if (latestPossibleCaffeineTime <= latestSafeCaffeineTime) {
        viableSessions.push(session);
      } else {
        const hoursConflict = (latestPossibleCaffeineTime.getTime() - latestSafeCaffeineTime.getTime()) / (1000 * 60 * 60);
        const alternatives: string[] = [];
        
        // Suggest moving session earlier
        const suggestedSessionTime = new Date(latestSafeCaffeineTime);
        suggestedSessionTime.setMinutes(suggestedSessionTime.getMinutes() + 45); // 45 min after latest caffeine
        alternatives.push(`Move ${session.name} to ${suggestedSessionTime.toLocaleTimeString()}`);
        
        // Suggest moving bedtime later
        if (hoursConflict < 2) {
          const suggestedBedtime = new Date(bedtime);
          suggestedBedtime.setHours(suggestedBedtime.getHours() + Math.ceil(hoursConflict));
          alternatives.push(`Move bedtime to ${suggestedBedtime.toLocaleTimeString()}`);
        }
        
        // Suggest reducing session importance
        if (session.importance > 1) {
          alternatives.push('Reduce session importance to lower caffeine needs');
        }
        
        rejectedSessions.push({
          session,
          reason: `Conflicts with safe sleep timing by ${hoursConflict.toFixed(1)} hours`,
          alternatives
        });
      }
    });
    
    return { viableSessions, rejectedSessions };
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
    
    // Resolve bedtime conflicts
    const { viableSessions, rejectedSessions } = this.resolveBedtimeConflicts(
      sessions,
      bedtime,
      userProfile,
      preferences
    );

    // Sort sessions by start time
    const sortedSessions = [...viableSessions].sort((a, b) => 
      a.startTime.getTime() - b.startTime.getTime()
    );
    
    // Generate recommendations for each session
    for (let i = 0; i < sortedSessions.length; i++) {
      const session = sortedSessions[i];
      
      // Calculate recommended dose
      const doseMg = this.calculateSmartRecommendedDose(
        session,
        userProfile,
        preferences,
        session.startTime, // Use session.startTime as the recommendedTime for dose calculation
        recommendations,
        existingDrinks
      );
      
      if (doseMg < preferences.preferredDoseMgMin) {
        warnings.push(`Recommended dose for ${session.name} is below your minimum preference - skipping`);
        continue;
      }
      
      // Find the best possible timing window
      const { recommendedTime, effectiveness, reasoning, isCompromise } = this.findBestCaffeineTimingWindow(
        session,
        doseMg,
        recommendations,
        latestSafeCaffeineTime,
        userProfile,
        existingDrinks
      );
      
      // If no viable timing found, add to warnings but still try to provide guidance
      if (effectiveness === 0) {
        warnings.push(`No safe timing found for ${session.name} - consider rescheduling or reducing importance`);
        continue;
      }
      
      // Recalculate dose based on the actual timing found
      const finalDose = this.calculateSmartRecommendedDose(
        session,
        userProfile,
        preferences,
        recommendedTime,
        recommendations,
        existingDrinks
      );
      
      // Add conflict resolution info if it's a compromise
      if (isCompromise) {
        conflictResolutions.push(`${session.name}: ${reasoning}`);
      }
      
      // Calculate confidence based on timing effectiveness and constraints
      let confidence = 0.9;
      if (isCompromise) confidence *= 0.8;
      if (finalDose !== doseMg) confidence *= 0.9;
      
      // Create recommendation
      const recommendation: CaffeineRecommendation = {
        id: `rec_${session.id}_${Date.now()}`,
        sessionId: session.id,
        recommendedTime,
        doseMg: finalDose,
        reasoning,
        sippingWindowMinutes: Math.max(15, Math.min(30, finalDose / 6)), // ~6mg per minute sipping rate
        confidence: Math.round(confidence * 100) / 100,
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
    
    // Add warnings and suggestions for rejected sessions
    rejectedSessions.forEach(({ session, reason, alternatives }) => {
      warnings.push(`⚠️ ${session.name}: ${reason}`);
      if (alternatives.length > 0) {
        suggestions.push(`💡 For ${session.name}: ${alternatives.join(' OR ')}`);
      }
    });

    // ALWAYS ADD CORE SUGGESTIONS (as requested by user)
    // 1. Latest safe caffeine time for sleep
    suggestions.unshift(`💡 Latest safe caffeine time: ${latestSafeCaffeineTime.toLocaleTimeString()} (to protect your sleep)`);
    
    // 2. Recommended dosage per drink
    if (recommendations.length > 0) {
      const avgDose = Math.round(recommendations.reduce((sum, rec) => sum + rec.doseMg, 0) / recommendations.length);
      suggestions.unshift(`💡 Recommended dosage per drink: ${avgDose}mg (based on your sessions)`);
    } else {
      suggestions.unshift(`💡 Recommended dosage per drink: ${preferences.preferredDoseMgMin}-${preferences.preferredDoseMgMax}mg`);
    }
    
    // 3. Caffeine intake times for focus sessions
    if (recommendations.length > 0) {
      const timingList = recommendations.map(rec => {
        const sessionName = sessions.find(s => s.id === rec.sessionId)?.name || 'session';
        return `${rec.recommendedTime.toLocaleTimeString()} for ${sessionName}`;
      }).join(', ');
      suggestions.unshift(`💡 Suggested caffeine times: ${timingList}`);
    }
    
    // 4. Adjusted plans guidance (always show this key information)
    suggestions.push(`💡 If you drink off-schedule: Your plan will automatically adjust to optimize remaining recommendations`);
    suggestions.push(`💡 The app monitors your actual caffeine intake and provides updated timing for best focus and sleep`);

    // Add general suggestions
    if (plan.totalPlannedCaffeine > 400) {
      warnings.push('⚠️ Total planned caffeine exceeds daily safe limit (400mg)');
      suggestions.push('💡 Consider: Reduce session importance, space sessions further apart, or move some to tomorrow');
    }
    
    if (plan.totalPlannedCaffeine > userProfile.meanDailyCaffeineMg * 1.5) {
      warnings.push(`⚠️ Planned caffeine is ${Math.round((plan.totalPlannedCaffeine / userProfile.meanDailyCaffeineMg) * 100)}% of your usual intake`);
      suggestions.push('💡 Consider starting with smaller doses and see how you feel');
    }
    
    if (recommendations.length === 0 && sessions.length > 0) {
      suggestions.push('💡 All sessions conflict with safe sleep timing - try moving sessions earlier or bedtime later');
    } else if (recommendations.length === 0) {
      suggestions.push('💡 Add focus sessions to get personalized caffeine recommendations');
    }
    
    // Add timing-specific suggestions
    const now = new Date();
    const earlyRecommendations = recommendations.filter(rec => rec.recommendedTime < now);
    if (earlyRecommendations.length > 0) {
      suggestions.push(`💡 ${earlyRecommendations.length} recommendation(s) are for times that have passed - consume as soon as possible or skip`);
    }
    
    // Add effectiveness warnings
    const lowConfidenceRecs = recommendations.filter(rec => rec.confidence < 0.7);
    if (lowConfidenceRecs.length > 0) {
      suggestions.push(`💡 ${lowConfidenceRecs.length} recommendation(s) are compromises due to timing conflicts - monitor your focus and adjust if needed`);
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
   * ENHANCED: Smart plan adjustment based on actual drink consumption
   * Intelligently adapts to off-schedule drinking with optimal re-planning
   */
  static async adjustPlanForActualIntake(
    plan: CaffeinePlan,
    userProfile: UserProfile,
    newDrink: DrinkRecord
  ): Promise<PlanningResult> {
    console.log('[PlanningService] 🔄 Intelligently adjusting plan for actual intake');
    
    const warnings: string[] = [];
    const suggestions: string[] = [];
    const conflictResolutions: string[] = [];
    
    // Get all drinks for today including the new one
    const todaysDrinks = await StorageService.getDrinksForDate(userProfile.userId, plan.planDate);
    const halfLife = CrashRiskService.calculatePersonalizedHalfLife(userProfile);
    const now = new Date();
    
    // Analyze the timing of this drink vs plan
    const drinkAnalysis = this.analyzeDrinkTiming(newDrink, plan.recommendations);
    
    // Mark matching recommendations as consumed
    let updatedRecommendations = plan.recommendations.map(rec => {
      if (drinkAnalysis.matchedRecommendation === rec.id) {
        return {
          ...rec,
          status: 'consumed' as const,
          actualDrinkId: newDrink.id
        };
      }
      return rec;
    });

    // If this was an off-schedule drink, we need to intelligently adjust the plan
    if (drinkAnalysis.isOffSchedule) {
      console.log('[PlanningService] 📊 Off-schedule drink detected:', drinkAnalysis);
      
      conflictResolutions.push(`Off-schedule drink: ${newDrink.name} at ${newDrink.timestamp.toLocaleTimeString()}`);
      
      // Calculate current and projected caffeine levels
      const currentLevel = CrashRiskService.calculateCurrentCaffeineLevel(
        todaysDrinks,
        halfLife,
        now
      );
      
      // Get remaining sessions that need optimization
      const remainingSessions = plan.sessions.filter(session => 
        session.startTime > now && 
        !updatedRecommendations.some(rec => rec.sessionId === session.id && rec.status === 'consumed')
      );
      
      if (remainingSessions.length > 0) {
        // Re-optimize remaining recommendations
        const reoptimizedRecommendations = await this.reoptimizeRemainingPlan(
          remainingSessions,
          userProfile,
          plan.bedtime,
          updatedRecommendations.filter(rec => rec.status === 'consumed'),
          todaysDrinks
        );
        
        // Update recommendations
        updatedRecommendations = [
          ...updatedRecommendations.filter(rec => rec.status === 'consumed'),
          ...reoptimizedRecommendations
        ];
        
        conflictResolutions.push(`Re-optimized ${reoptimizedRecommendations.length} remaining recommendations`);
      }
      
      // Add specific guidance based on the situation
      if (drinkAnalysis.effectOnSessions.length > 0) {
        const affectedSessions = drinkAnalysis.effectOnSessions;
        if (currentLevel > userProfile.meanDailyCaffeineMg * 0.8) {
          suggestions.push(`💡 Your caffeine level is elevated - consider lighter doses for ${affectedSessions.join(', ')}`);
        }
      }
      
      // Check if this drink might interfere with sleep
      const hoursToBedtime = (plan.bedtime.getTime() - newDrink.timestamp.getTime()) / (1000 * 60 * 60);
      const caffeineAtBedtime = newDrink.actualCaffeineConsumed * Math.pow(2, -hoursToBedtime / halfLife);
      
      if (caffeineAtBedtime > 25) {
        warnings.push(`⚠️ This drink may interfere with sleep - ${Math.round(caffeineAtBedtime)}mg will still be active at bedtime`);
        suggestions.push(`💡 Consider moving bedtime later or having lighter sessions today`);
      }
    }
    
         // Calculate overall caffeine level and safety
     const currentLevel = CrashRiskService.calculateCurrentCaffeineLevel(
       todaysDrinks,
       halfLife,
       now
     );
     
     const totalPlannedCaffeine = updatedRecommendations.reduce((sum: number, rec: CaffeineRecommendation) => sum + rec.doseMg, 0);
    
    // Safety warnings
    if (currentLevel > userProfile.meanDailyCaffeineMg * 1.5) {
      warnings.push(`⚠️ High caffeine level detected (${Math.round(currentLevel)}mg) - consider skipping or reducing remaining drinks`);
    }
    
    if (totalPlannedCaffeine > 400) {
      warnings.push('⚠️ Total planned caffeine exceeds 400mg daily limit');
      suggestions.push('💡 Consider reducing remaining doses or skipping lower priority sessions');
    }
    
    // Effectiveness analysis
    const pendingRecommendations = updatedRecommendations.filter(rec => rec.status === 'pending');
    if (pendingRecommendations.length > 0) {
      const lowEffectivenessRecs = pendingRecommendations.filter(rec => rec.confidence < 0.7);
      if (lowEffectivenessRecs.length > 0) {
        suggestions.push(`💡 ${lowEffectivenessRecs.length} remaining recommendation(s) have reduced effectiveness due to timing changes`);
      }
    }
    
    // Regenerate curve with actual data
    const caffeineCurve = await this.generateCaffeineCurve(
      userProfile,
      todaysDrinks,
      pendingRecommendations
    );
    
    const updatedPlan: CaffeinePlan = {
      ...plan,
      recommendations: updatedRecommendations,
      totalPlannedCaffeine,
      lastUpdatedAt: new Date()
    };
    
    console.log('[PlanningService] ✅ Smart plan adjustment complete:', {
      drinkWasOffSchedule: drinkAnalysis.isOffSchedule,
      remainingRecommendations: pendingRecommendations.length,
      newTotalCaffeine: totalPlannedCaffeine,
      warnings: warnings.length,
      suggestions: suggestions.length
    });
    
    return {
      plan: updatedPlan,
      caffeineCurve,
      warnings,
      suggestions,
      conflictResolutions
    };
  }

  /**
   * Analyze how an actual drink relates to planned recommendations
   */
  private static analyzeDrinkTiming(
    drink: DrinkRecord, 
    recommendations: CaffeineRecommendation[]
  ): {
    isOffSchedule: boolean;
    matchedRecommendation: string | null;
    timingDeviation: number; // minutes
    effectOnSessions: string[];
  } {
    let closestRec: CaffeineRecommendation | null = null;
    let shortestTimeDiff = Infinity;
    
    // Find the closest recommendation
    recommendations.forEach(rec => {
      const timeDiff = Math.abs(drink.timestamp.getTime() - rec.recommendedTime.getTime()) / (1000 * 60);
      if (timeDiff < shortestTimeDiff) {
        shortestTimeDiff = timeDiff;
        closestRec = rec;
      }
    });
    
    // Consider it a match if within 90 minutes and dose is within 50mg
    const isMatch = closestRec && 
      shortestTimeDiff <= 90 && 
      Math.abs(drink.actualCaffeineConsumed - (closestRec as CaffeineRecommendation).doseMg) <= 50;
    
         return {
       isOffSchedule: !isMatch,
       matchedRecommendation: isMatch ? closestRec!.id : null,
       timingDeviation: shortestTimeDiff,
       effectOnSessions: closestRec ? [(closestRec as CaffeineRecommendation).sessionId] : []
     };
  }

  /**
   * Re-optimize remaining plan after off-schedule consumption
   */
  private static async reoptimizeRemainingPlan(
    remainingSessions: FocusSession[],
    userProfile: UserProfile,
    bedtime: Date,
    consumedRecommendations: CaffeineRecommendation[],
    allDrinks: DrinkRecord[]
  ): Promise<CaffeineRecommendation[]> {
    console.log('[PlanningService] 🔄 Re-optimizing remaining plan for', remainingSessions.length, 'sessions');
    
    const preferences = await StorageService.getPlanningPreferences() || {
      ...this.DEFAULT_PREFERENCES,
      userId: userProfile.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const latestSafeCaffeineTime = this.calculateLatestSafeCaffeineTime(
      bedtime,
      userProfile,
      preferences.sleepBufferHours
    );
    
    const newRecommendations: CaffeineRecommendation[] = [];
    
    for (const session of remainingSessions) {
      // Skip sessions too close to bedtime
      const sessionCutoffTime = new Date(session.startTime);
      sessionCutoffTime.setMinutes(sessionCutoffTime.getMinutes() - 20);
      if (sessionCutoffTime >= latestSafeCaffeineTime) continue;
      
      // Calculate smart dose considering current state
      const smartDose = this.calculateSmartRecommendedDose(
        session,
        userProfile,
        preferences,
        session.startTime,
        [...consumedRecommendations, ...newRecommendations],
        allDrinks
      );
      
      if (smartDose < preferences.preferredDoseMgMin) continue;
      
      // Find best timing window
      const { recommendedTime, effectiveness, reasoning, isCompromise } = this.findBestCaffeineTimingWindow(
        session,
        smartDose,
        [...consumedRecommendations, ...newRecommendations],
        latestSafeCaffeineTime,
        userProfile,
        allDrinks
      );
      
      if (effectiveness === 0) continue;
      
      // Create new recommendation
      newRecommendations.push({
        id: `rec_${session.id}_${Date.now()}_reopt`,
        sessionId: session.id,
        recommendedTime,
        doseMg: smartDose,
        reasoning: `[ADJUSTED] ${reasoning}`,
        sippingWindowMinutes: Math.max(15, Math.min(30, smartDose / 6)),
        confidence: isCompromise ? 0.7 : 0.8,
        status: 'pending'
      });
    }
    
    return newRecommendations;
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
