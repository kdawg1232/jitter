// Database Types for Supabase
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          username: string | null;
          daily_limit_mg: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          username?: string | null;
          daily_limit_mg?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          username?: string | null;
          daily_limit_mg?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      drinks: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          caffeine_mg: number;
          sugar_g: number;
          calories: number;
          price: number;
          brand: string | null;
          volume_ml: number;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          caffeine_mg: number;
          sugar_g?: number;
          calories?: number;
          price?: number;
          brand?: string | null;
          volume_ml?: number;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          caffeine_mg?: number;
          sugar_g?: number;
          calories?: number;
          price?: number;
          brand?: string | null;
          volume_ml?: number;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      entries: {
        Row: {
          id: string;
          user_id: string;
          drink_id: string;
          amount: number;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          drink_id: string;
          amount?: number;
          timestamp?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          drink_id?: string;
          amount?: number;
          timestamp?: string;
          created_at?: string;
        };
      };
    };
    Functions: {
      get_daily_caffeine_intake: {
        Args: {
          user_uuid: string;
          target_date?: string;
        };
        Returns: {
          total_caffeine: number;
          total_sugar: number;
          total_calories: number;
          total_spent: number;
          total_drinks: number;
        }[];
      };
      get_caffeine_metabolism: {
        Args: {
          user_uuid: string;
          hours_back?: number;
        };
        Returns: {
          hour_offset: number;
          caffeine_level: number;
        }[];
      };
    };
  };
}

// Convenience types
export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

export type Drink = Database['public']['Tables']['drinks']['Row'];
export type DrinkInsert = Database['public']['Tables']['drinks']['Insert'];
export type DrinkUpdate = Database['public']['Tables']['drinks']['Update'];

export type Entry = Database['public']['Tables']['entries']['Row'];
export type EntryInsert = Database['public']['Tables']['entries']['Insert'];
export type EntryUpdate = Database['public']['Tables']['entries']['Update'];

// Combined types for UI
export type EntryWithDrink = Entry & {
  drink: Drink;
};

export type DailyStats = {
  total_caffeine: number;
  total_sugar: number;
  total_calories: number;
  total_spent: number;
  total_drinks: number;
};

export type CaffeineMetabolism = {
  hour_offset: number;
  caffeine_level: number;
};

// API Response types
export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
};

export type ApiListResponse<T> = {
  data: T[] | null;
  error: string | null;
}; 