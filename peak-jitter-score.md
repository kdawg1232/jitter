# Peak Jitter Score Implementation Plan

## 🎯 Overview

The **Peak Jitter Score** predicts the likelihood of experiencing caffeine-induced jittery effects (anxiety, restlessness, overstimulation) in the **next 30-60 minutes**. This complements the Crash Risk Score by measuring the opposite end of the caffeine spectrum.

## 📊 Core Concept

- **Crash Risk Score**: Measures likelihood of energy crash (when caffeine drops from peak)
- **Peak Jitter Score**: Measures likelihood of jittery/anxious effects (when caffeine is at or near peak)

## 🧮 Proposed Algorithm

### Formula
```
JitterScore = 100 × (C^0.8) × (R^0.6) × (T^-0.4) × (S^0.3) × (A^0.2)
```

Where:
- **C (Current Level)**: Current caffeine concentration relative to personal tolerance
- **R (Rising Rate)**: How rapidly caffeine is currently rising  
- **T (Tolerance)**: Personal caffeine tolerance (higher tolerance = lower jitter)
- **S (Sensitivity)**: Sleep debt and circadian sensitivity factors
- **A (Absorption)**: How much caffeine is still being absorbed

## 🔬 Detailed Components

### 1. Current Caffeine Level Factor (C)
```javascript
function calculateCurrentLevelFactor(currentLevel, toleranceThreshold) {
  // Normalize current level against personal tolerance threshold
  const normalized = currentLevel / toleranceThreshold;
  
  // Jitter risk peaks around 150-200% of tolerance threshold
  const optimalJitterRange = 1.75; // 175% of tolerance
  
  if (normalized <= 0.5) return normalized * 0.4; // Low levels = minimal jitter
  if (normalized <= optimalJitterRange) return 0.2 + (normalized - 0.5) * 0.64; // Rising to peak
  
  // Above optimal range, jitter may plateau or decrease due to tolerance
  return Math.max(0.8 - (normalized - optimalJitterRange) * 0.2, 0.3);
}
```

### 2. Rising Rate Factor (R)
```javascript
function calculateRisingRate(drinks, halfLife, currentTime) {
  const now = currentTime.getTime();
  const tenMinutesAgo = now - (10 * 60 * 1000);
  const twentyMinutesAgo = now - (20 * 60 * 1000);
  
  const currentLevel = calculateCaffeineLevel(drinks, halfLife, currentTime);
  const level10MinAgo = calculateCaffeineLevel(drinks, halfLife, new Date(tenMinutesAgo));
  const level20MinAgo = calculateCaffeineLevel(drinks, halfLife, new Date(twentyMinutesAgo));
  
  // Calculate rate of change (mg/min)
  const recentRate = (currentLevel - level10MinAgo) / 10;
  const earlierRate = (level10MinAgo - level20MinAgo) / 10;
  
  // Average the rates and normalize
  const avgRate = (recentRate + earlierRate) / 2;
  const maxExpectedRate = 10; // mg/min maximum expected rise
  
  return Math.max(0, Math.min(1, avgRate / maxExpectedRate));
}
```

### 3. Tolerance Factor (T) 
```javascript
function calculateJitterTolerance(meanDailyMg, weightKg) {
  const moderateIntake = 4; // mg/kg/day
  const tolerance = meanDailyMg / (moderateIntake * weightKg);
  
  // For jitter, higher tolerance = lower jitter risk
  return Math.max(0, Math.min(1, tolerance));
}
```

### 4. Sensitivity Factor (S)
```javascript
function calculateJitterSensitivity(sleepDebt, circadianFactor, age) {
  // Sleep debt increases jitter sensitivity
  const sleepSensitivity = sleepDebt * 0.6;
  
  // Circadian rhythm affects sensitivity (evening = more sensitive)
  const circadianSensitivity = circadianFactor * 0.3;
  
  // Age factor (younger people more sensitive to jitter)
  const ageFactor = age < 25 ? 0.1 : (age > 50 ? -0.1 : 0);
  
  return Math.max(0, Math.min(1, sleepSensitivity + circadianSensitivity + ageFactor + 0.1));
}
```

### 5. Absorption Factor (A)
```javascript
function calculateAbsorptionFactor(drinks, currentTime) {
  let totalAbsorbing = 0;
  
  drinks.forEach(drink => {
    const minutesSinceConsumption = (currentTime - drink.timestamp) / (1000 * 60);
    const consumptionDuration = parseTimeToMinutes(drink.timeToConsume);
    
    // Peak absorption occurs 30-45 minutes after consumption
    if (minutesSinceConsumption < 90) { // Still absorbing within 90 minutes
      const absorptionProgress = Math.min(1, minutesSinceConsumption / 45);
      const absorptionIntensity = 1 - Math.abs(absorptionProgress - 0.75); // Peak at 75% of 45min
      totalAbsorbing += drink.actualCaffeineConsumed * absorptionIntensity;
    }
  });
  
  return Math.max(0, Math.min(1, totalAbsorbing / 200)); // Normalize against 200mg
}
```

## 🏗️ Implementation Strategy

### Phase 1: Core Algorithm
1. **Add to CrashRiskService**: Create `calculateJitterScore()` method
2. **Extend Types**: Add `JitterScoreResult` interface
3. **Component Calculation**: Implement each factor calculation
4. **Integration**: Add to existing calculation pipeline

### Phase 2: UI Integration  
1. **Dual Display**: Show both Crash Risk and Jitter Score
2. **Visual Design**: Different colors/styling for jitter vs crash
3. **Interpretations**: Add jitter score meanings and recommendations

### Phase 3: Optimization
1. **Caching**: Cache jitter score alongside crash risk
2. **Performance**: Optimize calculations for real-time updates
3. **Validation**: Test against real user data

## 🎨 UI Design Concept

```
┌─ Crash Risk: 23 ────────────────┐
│ ████████░░░░ Low Risk          │
└─────────────────────────────────┘

┌─ Jitter Risk: 67 ───────────────┐  
│ ████████████████░░ High         │
└─────────────────────────────────┘
```

## 🔄 Relationship with Crash Risk

The scores are **complementary but independent**:

- **High Jitter + Low Crash**: Recently consumed caffeine, peak effects
- **Low Jitter + High Crash**: Caffeine wearing off, crash incoming  
- **Low Both**: Optimal caffeine state
- **High Both**: Transition period or multiple doses

## 📈 Advantages of This Approach

1. **Independent Calculation**: Not derived from crash risk, truly separate metric
2. **Real-time Relevance**: Focuses on immediate 30-60 minute window
3. **Actionable**: Users can take specific actions (reduce intake, breathing exercises)
4. **Complementary**: Provides full picture of caffeine state
5. **Scientifically Based**: Uses established caffeine pharmacokinetics

## 🚀 Next Steps

1. **Implement core algorithm** in `CrashRiskService`
2. **Add types and interfaces** for jitter scoring
3. **Create UI components** for dual score display
4. **Add caching and optimization**
5. **Test with real user scenarios**

This approach gives users a complete picture of their caffeine state - both when they might crash AND when they might feel overstimulated. 