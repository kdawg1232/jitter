# Crash Risk Score Implementation Plan

## Overview
The Crash Risk Score predicts the likelihood of a caffeine crash in the **next 60-90 minutes** (approximately one half-life after current time). This is the core feature of the Jitter app and must be implemented with high accuracy and real-time updates.

## 1. Scientific Foundation

### Core Principle
Caffeine elimination follows first-order kinetics with exponential decay. The crash occurs due to adenosine rebound when caffeine concentration drops significantly from peak levels.

### Formula
```
CrashRisk = 100 × (δ^0.6) × (S^0.4) × ((1-T)^0.3) × M
```

Where:
- **δ (Delta)**: Relative drop in caffeine concentration from recent peak (0-1)
- **S (Sleep Debt)**: Sleep deficit factor (0-1) 
- **T (Tolerance)**: Caffeine tolerance factor (0-1)
- **M (Metabolic)**: Personal metabolism modifier (0.9-1.1)

### Detailed Component Calculations

#### 1. Personalized Half-Life
```javascript
function calculateHalfLife(profile) {
  let t_half = 5.0; // 5 hours base
  
  if (profile.smoker) t_half *= 0.6;           // Faster clearance
  if (profile.pregnant) t_half *= 2.5;         // Much slower clearance  
  if (profile.sex === 'female' && profile.oralContraceptives) t_half *= 1.4;

  
  return Math.max(2, Math.min(15, t_half)); // Clamp to realistic range
}
```

#### 2. Current Caffeine Concentration
```javascript
function calculateCaffeineLevel(drinks, halfLife, currentTime) {
  return drinks
    .filter(drink => new Date(drink.timestamp) <= currentTime)
    .reduce((total, drink) => {
      const hoursElapsed = (currentTime - new Date(drink.timestamp)) / (1000 * 60 * 60);
      const concentration = drink.mg * Math.pow(2, -hoursElapsed / halfLife);
      return total + concentration;
    }, 0);
}
```

#### 3. Peak Delta Calculation
```javascript
function calculateDelta(drinks, halfLife, currentTime) {
  // Find peak in last 6 hours (with 5-minute resolution)
  const peaks = [];
  for (let i = 0; i <= 72; i++) { // 6 hours * 12 (5-min intervals)
    const timePoint = new Date(currentTime.getTime() - (i * 5 * 60 * 1000));
    peaks.push(calculateCaffeineLevel(drinks, halfLife, timePoint));
  }
  
  const peakLevel = Math.max(...peaks, 1e-6); // Avoid division by zero
  const currentLevel = calculateCaffeineLevel(drinks, halfLife, currentTime);
  
  return Math.max((peakLevel - currentLevel) / peakLevel, 0);
}
```

#### 4. Sleep Debt Factor
```javascript
function calculateSleepDebt(lastNightSleep) {
  const baseline = 7.5; // Optimal sleep hours
  const maxDebt = 3;    // Maximum debt hours to consider
  
  return Math.max(0, Math.min(1, (baseline - lastNightSleep) / maxDebt));
}
```

#### 5. Tolerance Factor
```javascript
function calculateTolerance(meanDailyMg, weightKg) {
  const moderateIntake = 4; // mg/kg/day considered moderate
  return Math.max(0, Math.min(1, meanDailyMg / (moderateIntake * weightKg)));
}
```

## 2. User Data Requirements

### Profile Data (One-time/Infrequent Updates)
```typescript
interface UserProfile {
  userId: string;
  
  // Physical characteristics
  weightKg: number;                    // Required: For mg/kg calculations
  age: number;                         // Required: Affects metabolism
  sex: 'male' | 'female' | 'other';   // Required: Hormonal effects
  
  // Lifestyle factors
  smoker: boolean;                     // Required: Doubles clearance rate
  pregnant: boolean;                   // Required: Halves clearance rate
  oralContraceptives: boolean;         // Required: 40% slower clearance
  
  
  // Calculated fields (auto-updated)
  averageSleep7Days: number;           // Rolling 7-day average
  meanDailyCaffeineMg: number;         // Rolling 30-day average
}
```

### Sleep Data
```typescript
interface SleepRecord {
  userId: string;
  date: string;           // YYYY-MM-DD format
  hoursSlept: number;     // To 1 decimal place (e.g., 6.5)
  quality?: number;       // Optional 0-1 rating from wearables
}
```

### Caffeine Data (Already Partially Implemented)
```typescript
interface DrinkRecord {
  id: string;
  userId: string;
  timestamp: Date;               // When consumption started
  mg: number;                    // Total caffeine content
  completionPercentage: number;  // How much was consumed (0-100)
  actualMgConsumed: number;      // mg * (completionPercentage / 100)
}
```

## 3. Implementation Plan

### Phase 1: Data Models & Storage Enhancement

#### 3.1 Extend AsyncStorage Structure
Current storage only handles daily drinks. We need to expand to handle:

```typescript
// New storage keys
const STORAGE_KEYS = {
  USER_PROFILE: 'jitter_user_profile',
  SLEEP_RECORDS: 'jitter_sleep_records', 
  DRINKS_HISTORY: 'jitter_drinks_history', // 30-day rolling window
  CRASH_RISK_CACHE: 'jitter_crash_risk_cache'
};

// Enhanced storage structure
interface AppStorage {
  userProfile: UserProfile;
  sleepRecords: SleepRecord[];     // Last 30 days
  drinksHistory: DrinkRecord[];    // Last 30 days  
  crashRiskCache: {
    lastCalculated: Date;
    score: number;
    validUntil: Date;
  };
}
```

#### 3.2 Create Data Service Layer
```
src/
  services/
    CrashRiskService.ts       // Main calculation engine
    StorageService.ts         // Enhanced AsyncStorage wrapper
    ValidationService.ts      // Data validation utilities
```

### Phase 2: Settings Screen Implementation

#### 3.3 User Profile Setup
Transform the current placeholder SettingsScreen into a comprehensive profile setup:

**Required Fields:**
- Weight (kg/lbs with toggle)
- Age 
- Sex
- Smoking status (Yes/No)
- Pregnancy status (if applicable)
- Oral contraceptive use (if applicable)


**Sleep Integration:**
- Manual daily sleep entry
- Future: Apple Health/Google Fit integration

### Phase 3: Core Algorithm Implementation

#### 3.4 CrashRiskService.ts
```typescript
export class CrashRiskService {
  static calculateCrashRisk(
    userProfile: UserProfile,
    drinks: DrinkRecord[],
    lastNightSleep: number,
    currentTime: Date = new Date()
  ): number {
    // Implementation of the full algorithm
  }
  
  static projectFutureRisk(
    userProfile: UserProfile,
    drinks: DrinkRecord[],
    lastNightSleep: number,
    futureTime: Date
  ): number {
    // Project crash risk at future time point
  }
  
  static generateRiskCurve(
    userProfile: UserProfile,
    drinks: DrinkRecord[],
    lastNightSleep: number,
    hoursAhead: number = 6
  ): Array<{time: Date, risk: number}> {
    // Generate curve for next N hours
  }
}
```

### Phase 4: Real-Time Updates

#### 3.5 Update Triggers
1. **New drink logged**: Immediate recalculation
2. **Sleep data updated**: Recalculate once  
3. **Profile changed**: Recalculate and update cached half-life
4. Recalculate the crash risk score every time the user opens the app
5. **App foreground**: Refresh if cache is stale

#### 3.6 HomeScreen Integration
Enhance the existing HomeScreen.tsx:

```typescript
// Add to existing state
const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
const [lastNightSleep, setLastNightSleep] = useState<number>(7.5);
const [riskCurve, setRiskCurve] = useState<Array<{time: Date, risk: number}>>([]);

// Replace placeholder crash risk calculation
useEffect(() => {
  const updateCrashRisk = async () => {
    if (!userProfile) return;
    
    const risk = CrashRiskService.calculateCrashRisk(
      userProfile,
      todaysDrinks,
      lastNightSleep
    );
    
    const curve = CrashRiskService.generateRiskCurve(
      userProfile, 
      todaysDrinks,
      lastNightSleep
    );
    
    setCrashRiskScore(risk);
    setRiskCurve(curve);
  };
  
  updateCrashRisk();
}, [todaysDrinks, userProfile, lastNightSleep]);
```


### Onboarding Screen inputs
**Profile Section:**
- Header: "Personal Information"
- Weight input with kg/lbs toggle
- Age picker
- Sex selection buttons
- Smoking status toggle
- Pregnancy status (conditional)
- Oral contraceptive toggle (conditional)

**Sleep Section:**
- Header: "Sleep Tracking"  
- Last night's sleep hours input
- 7-day average display (read-only)
- Future: Wearable integration toggle
ns

### 4.3 Onboarding Flow
Modify GetStartedScreen to include essential profile setup:
1. Welcome & explanation
2. Required profile fields (weight, age, sex)
3. Lifestyle questions (smoking, pregnancy, etc.)
4. Sleep tracking setup
5. First caffeine entry tutorial

## 5. Data Validation & Edge Cases

### 5.1 Input Validation
```typescript
export class ValidationService {
  static validateWeight(weight: number): boolean {
    return weight >= 30 && weight <= 300; // kg
  }
  
  static validateAge(age: number): boolean {
    return age >= 13 && age <= 120;
  }
  
  static validateSleepHours(hours: number): boolean {
    return hours >= 0 && hours <= 16;
  }
  
  static validateCaffeineAmount(mg: number): boolean {
    return mg >= 0 && mg <= 1000; // Single serving limit
  }
}
```

### 5.2 Edge Cases
1. **No drinks in 24h**: Set δ = 0, score ≈ 0
2. **Missing sleep data**: Use 7.5h default with warning
3. **Incomplete profile**: Require minimum fields before calculation
4. **Extreme values**: Clamp all inputs to reasonable ranges

## 7. Performance Considerations

### 7.1 Optimization Targets
- Crash risk calculation: < 50ms
- Profile update propagation: < 100ms  
- App startup with data load: < 2s

### 7.2 Caching Strategy
- Cache calculated half-life until profile changes
- Cache risk score for every time the user opens the app
- Precompute risk curve during calculation

**Next Steps**: 
1. Review and approve this implementation plan
2. Begin with Phase 1 (data models and storage enhancement)
3. Create UserProfile interface and enhance AsyncStorage structure
4. Implement core CrashRiskService with the provided formulas 