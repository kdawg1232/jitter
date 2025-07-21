// User Profile Types
export interface UserProfile {
  userId: string;
  
  // Physical characteristics (Required)
  weightKg: number;                    // For mg/kg calculations
  age: number;                         // Affects metabolism
  sex: 'male' | 'female';   // Hormonal effects on caffeine metabolism
  
  // Lifestyle factors (Required)
  smoker: boolean;                     // Doubles clearance rate
  pregnant: boolean;                   // Halves clearance rate
  oralContraceptives: boolean;         // 40% slower clearance (female only)
  
  // Optional genetic data
  cyp1a2Genotype?: 'fast' | 'slow' | 'unknown'; // From genetic testing
  
  // Calculated fields (auto-updated)
  averageSleep7Days: number;           // Rolling 7-day average
  meanDailyCaffeineMg: number;         // Rolling 30-day average
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Sleep Tracking Types
export interface SleepRecord {
  userId: string;
  date: string;           // YYYY-MM-DD format
  hoursSlept: number;     // To 1 decimal place (e.g., 6.5)
  quality?: number;       // Optional 0-1 rating from wearables
  source: 'manual' | 'wearable' | 'health_app';
  createdAt: Date;
}

// Enhanced Drink Record (extends existing)
export interface DrinkRecord {
  id: string;
  userId: string;
  name: string;
  
  // Caffeine content
  caffeineAmount: number;              // Total mg in the drink
  completionPercentage: number;        // How much was consumed (0-100)
  actualCaffeineConsumed: number;      // calculated: caffeineAmount * (completionPercentage / 100)
  
  // Timing
  timestamp: Date;                     // When consumption started
  timeToConsume: string;               // Duration (HH:MM:SS format)
  recordedAt: Date;                    // When record was created
}



export interface RiskCurvePoint {
  time: Date;
  riskScore: number;
  caffeineLevel: number;
}

// CaffScore Types
export interface FocusFactors {
  currentLevel: number;     // Current caffeine concentration factor (0-1)
  risingRate: number;       // How rapidly caffeine is rising (0-1)
  tolerance: number;        // Caffeine tolerance factor (0-1)
  focus: number;            // Sleep quality and focus capacity (0-1)
  absorption: number;       // How much caffeine is currently active (0-1)
}

export interface FocusResult {
  score: number;                    // 0-100 CaffScore
  factors: FocusFactors;            // Component factors
  personalizedHalfLife: number;     // User's caffeine half-life in hours
  currentCaffeineLevel: number;     // Current mg in system
  peakCaffeineLevel: number;        // Recent peak mg level
  validUntil: Date;                 // When this calculation expires
  calculatedAt: Date;               // When calculation was performed
}

// Storage Types
export interface AppStorage {
  userProfile: UserProfile | null;
  sleepRecords: SleepRecord[];         // Last 30 days
  drinksHistory: DrinkRecord[];        // Last 30 days
}

export const STORAGE_KEYS = {
  USER_PROFILE: 'jitter_user_profile',
  SLEEP_RECORDS: 'jitter_sleep_records',
  DRINKS_HISTORY: 'jitter_drinks_history',
  DAY_SCORES: 'jitter_day_scores',
  STREAK_DATA: 'jitter_streak_data',
  FOCUS_SESSIONS: 'jitter_focus_sessions',
  CAFFEINE_PLANS: 'jitter_caffeine_plans',
  PLANNING_PREFERENCES: 'jitter_planning_preferences',
  PREVIOUS_CAFF_SCORE: 'jitter_previous_caff_score',
  CURRENT_CAFFEINE_STATUS: 'jitter_current_caffeine_status'
} as const;

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ProfileValidationResult extends ValidationResult {
  missingRequiredFields: string[];
  canCalculateRisk: boolean;
}

// UI State Types

// Settings Screen Types
export interface SettingsFormData {
  weightKg: number;
  weightUnit: 'kg' | 'lbs';
  age: number;
  sex: 'male' | 'female';
  smoker: boolean;
  pregnant: boolean;
  oralContraceptives: boolean;
  cyp1a2Genotype: 'fast' | 'slow' | 'unknown';
}

// Sleep Entry Types
export interface SleepEntryData {
  date: string;
  hoursSlept: number;
  quality?: number;
}

// Constants

export const DEFAULT_VALUES = {
  BASELINE_SLEEP_HOURS: 7.5,
  MODERATE_CAFFEINE_MG_PER_KG: 4,
  DEFAULT_HALF_LIFE_HOURS: 5,
  MIN_HALF_LIFE_HOURS: 2,
  MAX_HALF_LIFE_HOURS: 15,
  PEAK_DETECTION_WINDOW_HOURS: 6,
  CACHE_VALIDITY_MINUTES: 5
} as const;

// Weight conversion utilities
export const convertWeight = {
  lbsToKg: (lbs: number): number => lbs * 0.453592,
  kgToLbs: (kg: number): number => kg * 2.20462
};



// Calendar Types
export interface DayScoreRecord {
  userId: string;
  date: string;                // YYYY-MM-DD format
  averagePeakScore: number;    // Average CaffScore for the day
  totalCaffeine: number;       // Total caffeine consumed on this day
  createdAt: Date;
}

export interface CalendarDayData {
  date: string;                // YYYY-MM-DD format
  dayNumber: number;           // Day of the month (1-31)
  totalCaffeine: number;       // Total caffeine for this day
  averagePeakScore?: number;   // Average peak score if day is complete
  isToday: boolean;            // Whether this is the current day
  hasData: boolean;            // Whether there's any data for this day
}

export interface CalendarSummary {
  month: number;               // 0-11 (January = 0)
  year: number;
  totalCaffeine: number;       // Sum of all caffeine for the month
  averageDailyCaffeine: number; // Average daily caffeine for days with data
  worstDay: {                  // Day with highest caffeine
    day: number;
    amount: number;
  } | null;
  under400Streak: number;      // Current consecutive days under 400mg
  daysWithData: number;        // Number of days in month with recorded data
}

export interface StreakData {
  currentStreak: number;       // Current consecutive days under 400mg
  lastCalculatedDate: string;  // YYYY-MM-DD format of last calculation
  streakStartDate: string;     // When current streak started
}

// Re-export onboarding types for convenience
export * from './onboarding'; 

// Planning Types
export interface FocusSession {
  id: string;
  userId: string;
  name: string;                        // e.g., "Morning deep work", "Client meeting"
  startTime: Date;                     // When the session starts
  endTime: Date;                       // When the session ends
  importance: 1 | 2 | 3;              // 1=normal, 2=important, 3=critical
  isRecurring: boolean;               // If this repeats daily
  createdAt: Date;
  updatedAt: Date;
}

export interface CaffeineRecommendation {
  id: string;
  sessionId: string;                   // Which focus session this supports
  recommendedTime: Date;               // When to consume caffeine
  doseMg: number;                      // Recommended dose in mg
  reasoning: string;                   // Why this timing/dose
  sippingWindowMinutes: number;        // How long to spend drinking it
  confidence: number;                  // 0-1 confidence in recommendation
  status: 'pending' | 'consumed' | 'skipped' | 'adjusted';
  actualDrinkId?: string;              // Links to actual DrinkRecord if consumed
}

export interface CaffeinePlan {
  id: string;
  userId: string;
  planDate: string;                    // YYYY-MM-DD
  bedtime: Date;                       // User's intended bedtime
  sessions: FocusSession[];            // Planned focus sessions
  recommendations: CaffeineRecommendation[]; // Generated caffeine recommendations
  latestSafeCaffeineTime: Date;       // Latest time for caffeine to not disrupt sleep
  totalPlannedCaffeine: number;       // Sum of all recommendations
  generatedAt: Date;
  lastUpdatedAt: Date;
}

export interface PlanningPreferences {
  userId: string;
  maxSessionsPerDay: number;           // Limit on focus sessions (1-3)
  preferredDoseMgMin: number;          // User's minimum preferred dose
  preferredDoseMgMax: number;          // User's maximum preferred dose
  caffeineSensitivityOverride?: number; // 0-1 override for sensitivity
  sleepBufferHours: number;            // Hours before bedtime to stop caffeine
  enableSmartAdjustments: boolean;     // Allow system to modify plan based on actual intake
  notificationsEnabled: boolean;       // Send caffeine timing notifications
  targetBedtime: string;               // Target bedtime in "HH:MM AM/PM" format
  createdAt: Date;
  updatedAt: Date;
}

export interface CaffeineCurvePoint {
  time: Date;
  caffeineLevel: number;               // mg in bloodstream
  projectedLevel: number;              // Projected level (for future planning)
  zone: 'low' | 'building' | 'peak' | 'stable' | 'declining' | 'crash';
}

export interface PlanningResult {
  plan: CaffeinePlan;
  caffeineCurve: CaffeineCurvePoint[]; // 24-hour curve with recommendations
  warnings: string[];                  // Issues with the plan
  suggestions: string[];               // Optimization suggestions
  conflictResolutions: string[];       // How conflicts were resolved
} 