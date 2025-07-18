// Onboarding Flow Types

export interface OnboardingData {
  // Basic Profile (Screen 2)
  weightKg: number | null;
  weightUnit: 'kg' | 'lbs';
  age: number | null;
  sex: 'male' | 'female' | null;
  
  // Health & Lifestyle (Screen 3)
  smoker: boolean | null;
  pregnant: boolean | null;
  oralContraceptives: boolean | null;
  
  // Caffeine Tolerance (Screen 4)
  typicalDailyCaffeine: number | null; // mg per day
  caffeineSource: 'coffee' | 'tea' | 'energy_drinks' | 'soda' | 'mixed' | null;
  
  // Sleep Setup (Screen 5)
  lastNightSleep: number | null;
  trackSleepDaily: boolean;
  
  // Completion tracking
  currentStep: number;
  isComplete: boolean;
}

export interface OnboardingStepProps {
  data: OnboardingData;
  onUpdateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
}

export const initialOnboardingData: OnboardingData = {
  weightKg: null,
  weightUnit: 'kg',
  age: null,
  sex: null,
  smoker: null,
  pregnant: null,
  oralContraceptives: null,
  typicalDailyCaffeine: null,
  caffeineSource: null,
  lastNightSleep: null,
  trackSleepDaily: true,
  currentStep: 1,
  isComplete: false,
};

// Validation functions for each step
export const validateStep = {
  1: (data: OnboardingData): boolean => true, // Welcome screen - no validation needed
  
  2: (data: OnboardingData): boolean => {
    return data.weightKg !== null && 
           data.weightKg > 0 && 
           data.age !== null && 
           data.age > 0 && 
           data.sex !== null;
  },
  
  3: (data: OnboardingData): boolean => {
    const basicHealthComplete = data.smoker !== null;
    
    if (data.sex === 'female') {
      return basicHealthComplete && 
             data.pregnant !== null && 
             (data.pregnant === true || data.oralContraceptives !== null);
    }
    
    return basicHealthComplete;
  },
  
  4: (data: OnboardingData): boolean => {
    return data.typicalDailyCaffeine !== null && 
           data.typicalDailyCaffeine >= 0 && 
           data.typicalDailyCaffeine <= 1000 &&
           data.caffeineSource !== null;
  },
  
  5: (data: OnboardingData): boolean => {
    return data.lastNightSleep !== null && 
           data.lastNightSleep >= 0 && 
           data.lastNightSleep <= 16;
  },
  
  6: (data: OnboardingData): boolean => true, // Completion screen - no validation needed
};

// Weight conversion utilities
export const convertWeight = {
  kgToLbs: (kg: number): number => Math.round(kg * 2.20462 * 10) / 10,
  lbsToKg: (lbs: number): number => Math.round(lbs / 2.20462 * 10) / 10,
};

// Screen titles and descriptions
export const ONBOARDING_CONTENT = {
  1: {
    title: 'welcome to jitter',
    subtitle: "let's predict your caffeine crash risk in real-time",
    description: 'We need a few details to personalize your crash predictions'
  },
  2: {
    title: 'about you',
    subtitle: 'basic information for personalized predictions',
    description: 'This helps us calculate your caffeine metabolism rate'
  },
  3: {
    title: 'health factors',
    subtitle: 'lifestyle factors that affect caffeine processing',
    description: 'These significantly impact how quickly you process caffeine'
  },
  4: {
    title: 'caffeine tolerance',
    subtitle: 'your typical caffeine consumption',
    description: 'This helps us understand your personal tolerance level'
  },
  5: {
    title: 'sleep tracking',
    subtitle: 'sleep affects crash severity',
    description: "We'll ask this each day for better predictions"
  },
  6: {
    title: "you're all set!",
    subtitle: 'your personalized caffeine insights are ready',
    description: 'Start tracking your caffeine to see real-time crash risk and CaffScore'
  }
}; 