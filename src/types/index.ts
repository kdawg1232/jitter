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

// Crash Risk Calculation Types
export interface CrashRiskFactors {
  delta: number;          // Caffeine concentration drop (0-1)
  sleepDebt: number;      // Sleep deficit factor (0-1)
  tolerance: number;      // Caffeine tolerance factor (0-1)
  metabolic: number;      // Personal metabolism modifier (0.8-1.2)
  circadian: number;      // Time-of-day sensitivity factor (0-1)
}

export interface CrashRiskResult {
  score: number;                    // 0-100 crash risk score
  factors: CrashRiskFactors;        // Component factors
  personalizedHalfLife: number;     // User's caffeine half-life in hours
  currentCaffeineLevel: number;     // Current mg in system
  peakCaffeineLevel: number;        // Recent peak mg level
  validUntil: Date;                 // When this calculation expires
  calculatedAt: Date;               // When calculation was performed
}

export interface RiskCurvePoint {
  time: Date;
  riskScore: number;
  caffeineLevel: number;
}

// Peak Focus Score Types
export interface FocusFactors {
  currentLevel: number;     // Current caffeine concentration factor (0-1)
  risingRate: number;       // How rapidly caffeine is rising (0-1)
  tolerance: number;        // Caffeine tolerance factor (0-1)
  focus: number;            // Sleep quality and focus capacity (0-1)
  absorption: number;       // How much caffeine is still being absorbed (0-1)
}

export interface FocusResult {
  score: number;                    // 0-100 peak focus score
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
  crashRiskCache: CrashRiskResult | null;
}

export const STORAGE_KEYS = {
  USER_PROFILE: 'jitter_user_profile',
  SLEEP_RECORDS: 'jitter_sleep_records',
  DRINKS_HISTORY: 'jitter_drinks_history',
  CRASH_RISK_CACHE: 'jitter_crash_risk_cache'
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
export interface CrashRiskDisplayState {
  score: number;
  level: 'low' | 'medium' | 'high';   // Based on score ranges
  color: string;                       // Theme color for display
  message: string;                     // User-friendly interpretation
  recommendation?: string;             // Action recommendation
}

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
export const CRASH_RISK_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 70,
  HIGH: 100
} as const;

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

// Export utility type for the main crash risk service
export type CrashRiskServiceConfig = {
  userProfile: UserProfile;
  drinks: DrinkRecord[];
  lastNightSleep: number;
  currentTime?: Date;
};

// Re-export onboarding types for convenience
export * from './onboarding'; 