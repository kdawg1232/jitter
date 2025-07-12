// Navigation types
export type RootTabParamList = {
  Tracker: undefined;
  Stats: undefined;
  CrashoutClock: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  Onboarding: undefined;
};

// User types
export interface User {
  id: string;
  email: string;
  daily_limit_mg: number;
  created_at: string;
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at?: string;
  created_at: string;
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

// Drink types
export interface Drink {
  id: string;
  user_id: string;
  name: string;
  caffeine_mg: number;
  sugar_g: number;
  calories: number;
  price: number;
  brand?: string;
  volume_ml: number;
  created_at: string;
}

// Entry types
export interface Entry {
  id: string;
  user_id: string;
  drink_id: string;
  amount: number;
  timestamp: string;
  created_at: string;
}

// UI Component types
export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
}

export interface ProgressBarProps {
  current: number;
  max: number;
  color?: string;
  height?: number;
}

// Analytics types
export interface DailyStats {
  total_caffeine: number;
  total_sugar: number;
  total_calories: number;
  total_drinks: number;
  total_spent: number;
}

export interface CaffeineMetabolism {
  timestamp: string;
  caffeine_level: number;
} 