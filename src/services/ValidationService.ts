import { UserProfile, DrinkRecord, SleepRecord, ValidationResult, ProfileValidationResult } from '../types';

export class ValidationService {
  // Weight validation (in kg)
  static validateWeight(weight: number): boolean {
    return weight >= 30 && weight <= 300;
  }

  // Age validation
  static validateAge(age: number): boolean {
    return age >= 13 && age <= 120;
  }

  // Sleep hours validation
  static validateSleepHours(hours: number): boolean {
    return hours >= 0 && hours <= 16;
  }

  // Caffeine amount validation (single serving)
  static validateCaffeineAmount(mg: number): boolean {
    return mg >= 0 && mg <= 1000;
  }

  // Completion percentage validation
  static validateCompletionPercentage(percentage: number): boolean {
    return percentage >= 0 && percentage <= 100;
  }

  // Validate user profile completeness
  static validateUserProfile(profile: Partial<UserProfile>): ProfileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingRequiredFields: string[] = [];

    // Required fields for crash risk calculation
    if (!profile.weightKg || !this.validateWeight(profile.weightKg)) {
      errors.push('Valid weight is required (30-300 kg)');
      missingRequiredFields.push('weight');
    }

    if (!profile.age || !this.validateAge(profile.age)) {
      errors.push('Valid age is required (13-120 years)');
      missingRequiredFields.push('age');
    }

    if (!profile.sex || !['male', 'female'].includes(profile.sex)) {
      errors.push('Sex selection is required');
      missingRequiredFields.push('sex');
    }

    if (profile.smoker === null || profile.smoker === undefined) {
      errors.push('Smoking status is required');
      missingRequiredFields.push('smoker');
    }

    // Female-specific validations
    if (profile.sex === 'female') {
      if (profile.pregnant === null || profile.pregnant === undefined) {
        errors.push('Pregnancy status is required for females');
        missingRequiredFields.push('pregnant');
      }

      if (profile.pregnant === false && (profile.oralContraceptives === null || profile.oralContraceptives === undefined)) {
        errors.push('Oral contraceptive status is required for non-pregnant females');
        missingRequiredFields.push('oralContraceptives');
      }
    }

    // Optional field warnings
    if (!profile.averageSleep7Days || profile.averageSleep7Days === 0) {
      warnings.push('Sleep data will improve prediction accuracy');
    }

    const canCalculateRisk = missingRequiredFields.length === 0;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missingRequiredFields,
      canCalculateRisk
    };
  }

  // Validate drink record
  static validateDrinkRecord(drink: Partial<DrinkRecord>): ValidationResult {
    const errors: string[] = [];

    if (!drink.name || drink.name.trim().length === 0) {
      errors.push('Drink name is required');
    }

    if (!drink.caffeineAmount || !this.validateCaffeineAmount(drink.caffeineAmount)) {
      errors.push('Valid caffeine amount is required (0-1000 mg)');
    }

    if (drink.completionPercentage === null || drink.completionPercentage === undefined || 
        !this.validateCompletionPercentage(drink.completionPercentage)) {
      errors.push('Valid completion percentage is required (0-100)');
    }

    if (!drink.timestamp || !(drink.timestamp instanceof Date)) {
      errors.push('Valid timestamp is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate sleep record
  static validateSleepRecord(sleep: Partial<SleepRecord>): ValidationResult {
    const errors: string[] = [];

    if (!sleep.date || !this.isValidDateString(sleep.date)) {
      errors.push('Valid date is required (YYYY-MM-DD format)');
    }

    if (sleep.hoursSlept === null || sleep.hoursSlept === undefined || 
        !this.validateSleepHours(sleep.hoursSlept)) {
      errors.push('Valid sleep hours required (0-16 hours)');
    }

    if (sleep.quality !== undefined && (sleep.quality < 0 || sleep.quality > 1)) {
      errors.push('Sleep quality must be between 0 and 1');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Helper function to validate date string format
  private static isValidDateString(dateString: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  // Validate data ranges for calculations
  static validateCalculationInputs(
    userProfile: UserProfile,
    drinks: DrinkRecord[],
    lastNightSleep: number
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Profile validation
    const profileValidation = this.validateUserProfile(userProfile);
    if (!profileValidation.canCalculateRisk) {
      errors.push(...profileValidation.errors);
    }

    // Drinks validation
    drinks.forEach((drink, index) => {
      const drinkValidation = this.validateDrinkRecord(drink);
      if (!drinkValidation.isValid) {
        errors.push(`Drink ${index + 1}: ${drinkValidation.errors.join(', ')}`);
      }
    });

    // Sleep validation
    if (!this.validateSleepHours(lastNightSleep)) {
      errors.push('Invalid sleep hours for calculation');
    }

    // Data freshness warnings
    const now = new Date();
    const oldDrinks = drinks.filter(drink => {
      const hoursSince = (now.getTime() - drink.timestamp.getTime()) / (1000 * 60 * 60);
      return hoursSince > 24;
    });

    if (oldDrinks.length > 0) {
      warnings.push(`${oldDrinks.length} drinks are older than 24 hours and may not affect current risk`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Clamp values to safe ranges
  static clampValue(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  // Safe division with fallback
  static safeDivide(numerator: number, denominator: number, fallback: number = 0): number {
    if (denominator === 0 || !isFinite(denominator)) return fallback;
    const result = numerator / denominator;
    return isFinite(result) ? result : fallback;
  }
} 