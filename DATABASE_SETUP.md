# Database Setup Guide

This guide will walk you through setting up the Supabase database for the Jitter app.

## 🚀 Quick Setup

### Step 1: Run the Database Schema
1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `src/constants/database.sql`
4. Run the SQL commands

### Step 2: Verify Tables
After running the SQL script, you should see these tables in your database:
- `users` - User profiles and preferences
- `drinks` - Drink library (personal and public drinks)
- `entries` - Individual consumption entries

### Step 3: Test the Setup
The database includes:
- ✅ Automatic user profile creation on signup
- ✅ Row Level Security (RLS) policies
- ✅ Database functions for calculations
- ✅ Seed data for 12 common drinks
- ✅ Real-time subscriptions ready

## 📊 Database Schema Overview

### Users Table
Stores user profiles and preferences:
```sql
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  daily_limit_mg INTEGER DEFAULT 400,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Drinks Table  
Stores drink templates (both personal and public):
```sql
drinks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  caffeine_mg INTEGER NOT NULL,
  sugar_g DECIMAL(5,2) DEFAULT 0,
  calories INTEGER DEFAULT 0,
  price DECIMAL(6,2) DEFAULT 0,
  brand TEXT,
  volume_ml INTEGER DEFAULT 250,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Entries Table
Stores individual consumption records:
```sql
entries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  drink_id UUID REFERENCES drinks(id),
  amount DECIMAL(3,2) DEFAULT 1.0,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP
)
```

## 🔐 Security Features

### Row Level Security (RLS)
All tables have RLS enabled with policies that ensure:
- Users can only access their own data
- Public drinks are visible to all users
- User profiles are automatically created on signup

### Database Functions
Two key functions for calculations:
1. `get_daily_caffeine_intake()` - Calculates daily totals
2. `get_caffeine_metabolism()` - Models caffeine decay over time

## 🎯 Seed Data

The database includes 12 popular energy drinks:
- Red Bull (Original & Sugar Free)
- Monster Energy (Original & Ultra Zero)
- Celsius (Original & HEAT)
- Bang Energy
- ZOA Energy
- Reign Total Body Fuel
- Rockstar Original
- Coffee & Espresso

## 🔄 Real-time Features

Real-time subscriptions are configured for:
- Live entry updates
- Collaborative features (future)
- Push notifications (future)

## 🛠️ Development Notes

### TypeScript Integration
- Full type safety with generated types
- Database schema types in `src/types/database.ts`
- API hooks in `src/hooks/useDatabase.ts`

### API Hooks Available
- `useUserProfile()` - User profile management
- `useDrinks()` - Drink library CRUD
- `useEntries()` - Entry tracking CRUD
- `useDailyStats()` - Daily intake calculations
- `useCaffeineMetabolism()` - Caffeine decay modeling

### Authentication Integration
- Automatic user profile creation on signup
- Secure user ID mapping from auth.users to public.users
- Profile data saved during onboarding

## 📱 Next Steps

With the database setup complete, you can now:
1. Run the app with `npx expo start`
2. Sign up for a new account
3. Complete the onboarding process
4. Your profile will be automatically saved to the database
5. Ready to start Phase 5: Tracker Screen implementation

## 🐛 Troubleshooting

### Common Issues
1. **RLS Policies**: Ensure RLS is enabled and policies are created
2. **Function Permissions**: Verify database functions are accessible
3. **Seed Data**: Check that public drinks are inserted correctly
4. **Real-time**: Test that subscriptions are working

### Verification Queries
```sql
-- Check user profiles
SELECT * FROM users LIMIT 5;

-- Check public drinks
SELECT * FROM drinks WHERE is_public = true;

-- Test daily stats function
SELECT * FROM get_daily_caffeine_intake('your-user-id');
```

## 🎉 Success!

Your Jitter database is now ready for production use with:
- ✅ Secure user data isolation
- ✅ Efficient query performance
- ✅ Real-time capabilities
- ✅ Type-safe API integration
- ✅ Comprehensive seed data

Ready to move on to Phase 5: Tracker Screen implementation! 