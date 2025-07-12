-- Jitter App Database Schema
-- Run these commands in your Supabase SQL editor
-- This script is designed to be run multiple times without errors

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles and preferences
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  username TEXT UNIQUE,
  daily_limit_mg INTEGER DEFAULT 400,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns if they don't exist (for existing databases)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name') THEN
    ALTER TABLE users ADD COLUMN first_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name') THEN
    ALTER TABLE users ADD COLUMN last_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
    ALTER TABLE users ADD COLUMN username TEXT UNIQUE;
  END IF;
END $$;

-- Drink library (reusable drink templates)
CREATE TABLE IF NOT EXISTS drinks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  caffeine_mg INTEGER NOT NULL,
  sugar_g DECIMAL(5,2) DEFAULT 0,
  calories INTEGER DEFAULT 0,
  price DECIMAL(6,2) DEFAULT 0,
  brand TEXT,
  volume_ml INTEGER DEFAULT 250,
  is_public BOOLEAN DEFAULT false, -- Allow sharing common drinks
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual consumption entries
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  drink_id UUID REFERENCES drinks(id) ON DELETE CASCADE,
  amount DECIMAL(3,2) DEFAULT 1.0, -- multiplier (0.5 for half can, 2.0 for double, etc.)
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_drinks_user_id ON drinks(user_id);
CREATE INDEX IF NOT EXISTS idx_drinks_is_public ON drinks(is_public);
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_timestamp ON entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_entries_user_timestamp ON entries(user_id, timestamp);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view own drinks" ON drinks;
DROP POLICY IF EXISTS "Users can view public drinks" ON drinks;
DROP POLICY IF EXISTS "Users can insert own drinks" ON drinks;
DROP POLICY IF EXISTS "Users can update own drinks" ON drinks;
DROP POLICY IF EXISTS "Users can delete own drinks" ON drinks;

-- RLS Policies for drinks table
CREATE POLICY "Users can view own drinks" ON drinks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public drinks" ON drinks
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can insert own drinks" ON drinks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drinks" ON drinks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own drinks" ON drinks
  FOR DELETE USING (auth.uid() = user_id);

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view own entries" ON entries;
DROP POLICY IF EXISTS "Users can insert own entries" ON entries;
DROP POLICY IF EXISTS "Users can update own entries" ON entries;
DROP POLICY IF EXISTS "Users can delete own entries" ON entries;

-- RLS Policies for entries table
CREATE POLICY "Users can view own entries" ON entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries" ON entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries" ON entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries" ON entries
  FOR DELETE USING (auth.uid() = user_id);

-- Create a function to automatically create user profile
-- Updated to not set default daily_limit_mg so we can detect new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Drop existing functions if they exist and recreate them
DROP FUNCTION IF EXISTS get_daily_caffeine_intake(UUID, DATE);
DROP FUNCTION IF EXISTS get_caffeine_metabolism(UUID, INTEGER);

-- Create a function to calculate daily caffeine intake
CREATE OR REPLACE FUNCTION get_daily_caffeine_intake(user_uuid UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  total_caffeine BIGINT,
  total_sugar DECIMAL(5,2),
  total_calories BIGINT,
  total_spent DECIMAL(8,2),
  total_drinks BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM((d.caffeine_mg * e.amount)::INTEGER), 0)::BIGINT as total_caffeine,
    COALESCE(SUM(d.sugar_g * e.amount), 0) as total_sugar,
    COALESCE(SUM((d.calories * e.amount)::INTEGER), 0)::BIGINT as total_calories,
    COALESCE(SUM(d.price * e.amount), 0) as total_spent,
    COALESCE(COUNT(e.id), 0)::BIGINT as total_drinks
  FROM entries e
  JOIN drinks d ON e.drink_id = d.id
  WHERE e.user_id = user_uuid
    AND DATE(e.timestamp) = target_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get caffeine metabolism over time
CREATE OR REPLACE FUNCTION get_caffeine_metabolism(user_uuid UUID, hours_back INTEGER DEFAULT 24)
RETURNS TABLE (
  hour_offset INTEGER,
  caffeine_level DECIMAL(8,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH caffeine_timeline AS (
    -- Get all entries within the specified time window
    SELECT 
      e.timestamp,
      (d.caffeine_mg * e.amount) as caffeine_mg,
      EXTRACT(EPOCH FROM (NOW() - e.timestamp)) / 3600 as hours_ago
    FROM entries e
    JOIN drinks d ON e.drink_id = d.id
    WHERE e.user_id = user_uuid
      AND e.timestamp >= NOW() - INTERVAL '1 hour' * hours_back
  ),
  time_series AS (
    SELECT generate_series(0, hours_back) as hour_offset
  ),
  hourly_decay AS (
    SELECT 
      ts.hour_offset,
      COALESCE(SUM(
        CASE 
          WHEN ct.hours_ago <= ts.hour_offset THEN
            ct.caffeine_mg * POWER(0.5, (ts.hour_offset - ct.hours_ago) / 5.5)
          ELSE 0
        END
      ), 0) as caffeine_level
    FROM time_series ts
    LEFT JOIN caffeine_timeline ct ON true
    GROUP BY ts.hour_offset
  )
  SELECT 
    hd.hour_offset,
    hd.caffeine_level::DECIMAL(8,2)
  FROM hourly_decay hd
  ORDER BY hd.hour_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed data for common energy drinks (only insert if not already exists)
INSERT INTO drinks (id, user_id, name, caffeine_mg, sugar_g, calories, price, brand, volume_ml, is_public)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001'::UUID, NULL, 'Red Bull Original', 80, 27, 110, 2.50, 'Red Bull', 250, true),
  ('550e8400-e29b-41d4-a716-446655440002'::UUID, NULL, 'Red Bull Sugar Free', 80, 0, 10, 2.50, 'Red Bull', 250, true),
  ('550e8400-e29b-41d4-a716-446655440003'::UUID, NULL, 'Monster Energy', 160, 54, 210, 3.00, 'Monster', 473, true),
  ('550e8400-e29b-41d4-a716-446655440004'::UUID, NULL, 'Monster Ultra Zero', 140, 0, 10, 3.00, 'Monster', 473, true),
  ('550e8400-e29b-41d4-a716-446655440005'::UUID, NULL, 'Celsius Original', 200, 0, 10, 2.25, 'Celsius', 355, true),
  ('550e8400-e29b-41d4-a716-446655440006'::UUID, NULL, 'Celsius HEAT', 300, 0, 10, 2.50, 'Celsius', 355, true),
  ('550e8400-e29b-41d4-a716-446655440007'::UUID, NULL, 'Bang Energy', 300, 0, 0, 2.75, 'Bang', 473, true),
  ('550e8400-e29b-41d4-a716-446655440008'::UUID, NULL, 'ZOA Energy', 160, 0, 15, 2.50, 'ZOA', 355, true),
  ('550e8400-e29b-41d4-a716-446655440009'::UUID, NULL, 'Reign Total Body Fuel', 300, 0, 10, 2.75, 'Reign', 473, true),
  ('550e8400-e29b-41d4-a716-446655440010'::UUID, NULL, 'Rockstar Original', 160, 62, 270, 2.50, 'Rockstar', 473, true),
  ('550e8400-e29b-41d4-a716-446655440011'::UUID, NULL, 'Coffee (8 oz)', 95, 0, 2, 2.00, 'Generic', 237, true),
  ('550e8400-e29b-41d4-a716-446655440012'::UUID, NULL, 'Espresso Shot', 64, 0, 1, 1.50, 'Generic', 30, true)
ON CONFLICT (id) DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist and recreate them
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_drinks_updated_at ON drinks;

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drinks_updated_at BEFORE UPDATE ON drinks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Jitter database schema updated successfully!';
  RAISE NOTICE 'New features added:';
  RAISE NOTICE '- User profile fields: first_name, last_name, username';
  RAISE NOTICE '- Updated authentication flow support';
  RAISE NOTICE '- All tables and functions are ready to use';
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated; 