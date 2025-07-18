# Jitter - Caffeine Crash Risk Prediction App

## 🎯 Overview

Jitter is a React Native app that predicts caffeine crash risk in real-time using scientific algorithms based on caffeine pharmacokinetics. The app tracks your caffeine consumption, sleep patterns, and personal factors to provide accurate crash risk predictions.

## ⚡ Crash Risk Score System

### What is the Crash Risk Score?

The **Crash Risk Score** is a 0-100 scale that predicts your likelihood of experiencing a caffeine crash in the next 60-90 minutes:

- **0-30**: 🟢 **Low Risk** - Good time for focused work
- **31-70**: 🟡 **Medium Risk** - Consider a small caffeine boost or break
- **71-100**: 🔴 **High Risk** - Take a break or have caffeine soon

### Scientific Formula

Our algorithm uses the enhanced scientific formula:

```
CrashRisk = 100 × (δ^0.6) × (S^0.4) × ((1-T)^0.3) × M × (C^0.2)
```

Where:
- **δ (Delta)**: Caffeine concentration drop from recent peak (0-1)
- **S (Sleep)**: Sleep debt factor (0-1) 
- **T (Tolerance)**: Caffeine tolerance factor (0-1)
- **M (Metabolic)**: Personal metabolism modifier (0.8-1.2)
- **C (Circadian)**: Time-of-day sensitivity factor (0-1)

## 📊 Algorithm Variables & Factors

### 1. Delta Factor (Caffeine Drop) - δ

**What it measures**: How much your caffeine levels have dropped from their recent peak

**Calculation**:
- Tracks caffeine levels using **distributed absorption** model
- Finds peak caffeine level in last 6 hours (5-minute resolution)
- Calculates relative drop: `(peak - current) / peak`

**Enhanced Features**:
- ✅ **Sipping Duration**: Accounts for actual consumption time
- ✅ **Absorption Kinetics**: Peak absorption ~30 minutes after consumption starts
- ✅ **Micro-Dosing**: Breaks consumption into 1-minute intervals for accuracy

### 2. Sleep Debt Factor - S

**What it measures**: How sleep-deprived you are compared to optimal baseline

**Calculation**:
- **Baseline**: 7.5 hours of sleep
- **Maximum Debt**: 3 hours considered
- **Smart Logic**: Uses 7-day average when available (after 7+ days), otherwise single night

**Formula**: `max(7.5 - sleep_hours, 0) / 3`

### 3. Tolerance Factor - T

**What it measures**: Your caffeine tolerance based on daily consumption patterns

**Calculation**:
- **Baseline**: 4 mg/kg/day (moderate intake)
- **Personal Threshold**: Based on your weight
- **Rolling Average**: 30-day mean daily caffeine intake

**Formula**: `daily_average_mg / (4 × weight_kg)`

### 4. Metabolic Factor - M

**What it measures**: Personal caffeine metabolism rate based on biological factors

**Factors Included**:
- **Base Rate**: 1.0 (neutral)
- **Sex Differences**: Males 5% faster (0.95×), Females 5% slower (1.05×)
- **Range**: Clamped to 0.8-1.2

### 5. Circadian Factor - C

**What it measures**: How time of day affects caffeine crash sensitivity

**Time-Based Sensitivity**:
- **Night (22:00-06:00)**: 1.0 (Highest sensitivity)
- **Morning (07:00-09:00)**: 0.6 (Moderate)
- **Midday (10:00-16:00)**: 0.4 (Lowest)
- **Evening (17:00-21:00)**: 0.7 (High)

## 🧬 Personalized Half-Life Calculation

Your personal caffeine half-life determines how fast you clear caffeine:

**Base Half-Life**: 5 hours

**Modifying Factors**:
- **Age**: 2% slower per year after 30 (capped at 80% slower max)
- **Smoking**: 40% faster clearance (×0.6)
- **Pregnancy**: 150% slower clearance (×2.5)
- **Oral Contraceptives**: 40% slower clearance (×1.4)

**Example**: 45-year-old female on oral contraceptives:
```
Base: 5 hours
Age factor: 5 × 1.30 = 6.5 hours (30% slower due to age)
Oral contraceptives: 6.5 × 1.4 = 9.1 hours
Final half-life: 9.1 hours
```

## 📱 Data Collection & Tracking

### Onboarding Data (Required)

**Physical Characteristics**:
- Weight (kg/lbs) - for mg/kg calculations
- Age - affects metabolism rate
- Sex - hormonal effects on caffeine clearance

**Lifestyle Factors**:
- Smoking status - doubles clearance rate
- Pregnancy status (females) - halves clearance rate  
- Oral contraceptive use (non-pregnant females) - slows clearance

**Sleep Setup**:
- Last night's sleep hours
- Daily sleep tracking preference

### Real-Time Tracking

**Caffeine Consumption**:
- Drink name and caffeine content
- Consumption percentage (how much finished)
- **Sipping duration** (timer-based or manual)
- Timestamp of consumption start

**Sleep Data**:
- Daily sleep hours
- 7-day rolling average (used after 7+ days)
- Sleep debt calculation

**Automatic Calculations**:
- 30-day rolling caffeine average for tolerance
- Peak caffeine detection (6-hour window)
- Real-time crash risk updates

## ⏱️ Real-Time Updates

The crash risk score updates automatically:

**Update Frequency**: Every 5 minutes (cached for performance)

**Triggers**:
- New caffeine consumption logged
- Time passage (caffeine levels change)
- Sleep data updates
- Cache expiration

**Prediction Window**: Next 60-90 minutes

## 🔄 Data Storage & Privacy

**Local Storage**: All data stored locally using AsyncStorage
- User profile and preferences
- 30-day drink history
- 30-day sleep records  
- Crash risk cache

**No Cloud Sync**: Complete privacy - data never leaves your device

## 🧪 Algorithm Accuracy

**Scientific Basis**:
- Based on published caffeine pharmacokinetics research
- Distributed absorption model for realistic consumption patterns
- Circadian rhythm integration for time-sensitive predictions

**Continuous Improvement**:
- Algorithm learns from your personal patterns
- 7-day sleep averaging improves over time
- Tolerance calculations refine with more data

**Limitations**:
- Predictions most accurate with consistent usage (7+ days)
- Individual variations may require algorithm refinement
- External factors (stress, medications) not currently modeled

## 🚀 Getting Started

1. **Complete Onboarding**: Provide physical characteristics and lifestyle factors
2. **Log Your First Drink**: Use the timer to track sipping duration
3. **Track Sleep**: Log daily sleep for better predictions
4. **Monitor Score**: Watch real-time crash risk updates
5. **Build History**: Algorithm improves with 7+ days of data

## 📈 Future Enhancements

**Planned Features**:
- Advanced genetic metabolism factors
- Food interaction modeling
- Stress level integration
- Machine learning personalization

---

*Jitter helps you optimize your caffeine intake for sustained energy without the crash. Understanding the science behind your personal caffeine metabolism empowers better daily energy management.* 