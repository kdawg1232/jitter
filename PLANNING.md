# Jitter - Caffeine Tracking App

## 🎯 Project Overview
Jitter is a React Native app built with Expo that helps users track their caffeine and energy drink consumption. The app provides insights into daily intake, visualizes caffeine metabolism, and promotes healthy consumption habits through gamified tracking and informative displays.

## 🎨 Design System

### Color Palette
- **Primary Background**: `#1F1F1F` (Eerie Black) - Dark background elements
- **Primary Accent**: `#A259FF` (Medium Slate Blue) - Main interactive elements, buttons, highlights
- **Secondary Accent**: `#C18DFF` (Lavender) - Secondary buttons, progress indicators
- **Light Background**: `#F9F9FB` (Seasalt) - Card backgrounds, light mode sections
- **Support Elements**: `#E0E0E0` (Platinum) - Borders, strokes, secondary text

export const typography = {
  fontFamily: 'Inter',
  heading: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '500',
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.border,
  },
}

- **Clean & Minimal**: Spacious layouts with purposeful whitespace
- **Gamified**: Progress bars, achievement-style counters, friendly animations
- **Health-Conscious**: Encouraging responsible consumption through visual feedback
- **Rounded Design**: Soft, rounded corners on all components (8-16px border radius)
- **Subtle Interactions**: Smooth transitions and micro-animations

## 📱 Core Screens Architecture

### 1. Tracker Screen (Home)
**Purpose**: Daily intake logging and quick overview
- Current date/time display
- Daily intake badge (e.g., "3 drinks today")
- Progress bar showing caffeine consumption vs daily limit
- Individual drink counters (Red Bull, Celsius, ZOA, etc.)
- Quick add functionality for common drinks
- Add new drink button

### 2. Stats Screen
**Purpose**: Historical data and analytics
- Time period tabs (Today, Weekly, Monthly)
- Nutritional totals (sugar, caffeine, calories)
- Caffeine metabolism line graph (24-hour view)
- "Crashout Clock" preview showing time until caffeine clears

### 3. Profile Screen
**Purpose**: Long-term achievements and settings
- All-time statistics dashboard
- Total consumption metrics
- Money spent tracking
- User preferences (daily caffeine limit)
- Achievement badges

### 4. Crashout Clock Screen
**Purpose**: Real-time caffeine metabolism tracking
- Countdown timer to caffeine clearance
- Visual progress indicator
- Daily spending summary
- Animated caffeine decay visualization

## 🗄️ Data Architecture

### Supabase Schema

```sql
-- User profiles and preferences
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  daily_limit_mg INTEGER DEFAULT 400,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drink library (reusable drink templates)
CREATE TABLE drinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  caffeine_mg INTEGER NOT NULL,
  sugar_g DECIMAL(5,2) DEFAULT 0,
  calories INTEGER DEFAULT 0,
  price DECIMAL(6,2) DEFAULT 0,
  brand TEXT,
  volume_ml INTEGER DEFAULT 250,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual consumption entries
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  drink_id UUID REFERENCES drinks(id),
  amount DECIMAL(3,2) DEFAULT 1.0, -- multiplier (0.5 for half can, 2.0 for double, etc.)
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🧠 Core Features

### Caffeine Metabolism Model
- **Half-life**: 5-6 hours average (configurable per user)
- **Clearance**: 95% elimination after ~5 half-lives (25-30 hours)
- **Visualization**: Real-time decay curve showing current caffeine levels

### Daily Tracking
- Real-time totals for caffeine, sugar, calories
- Progress indicators with visual feedback
- Customizable daily limits with warnings

### Historical Analytics
- Weekly/monthly consumption trends
- Spending analysis
- Peak consumption times
- Health insights and recommendations

### Gamification Elements
- Achievement badges for milestones
- Streak tracking for moderate consumption
- Visual progress indicators
- Friendly reminder notifications

## 🛠️ Technical Stack

### Frontend
- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and build tools
- **React Navigation**: Screen navigation and tab bars
- **React Native Reanimated**: Smooth animations
- **Victory Native**: Charts and data visualization
- **Expo Vector Icons**: Consistent iconography

### Backend
- **Supabase**: Authentication, database, and real-time subscriptions
- **PostgreSQL**: Primary database through Supabase
- **Row Level Security**: User data isolation

### State Management
- **Context API**: User authentication and global state
- **React Query**: Server state management and caching
- **AsyncStorage**: Local preferences and offline capability

## 📊 User Experience Flow

1. **Onboarding**: Sign up/login → Set daily caffeine limit → Add first drink
2. **Daily Use**: Log drinks → View progress → Check crashout clock
3. **Analysis**: Review stats → Adjust consumption habits → Set new goals
4. **Long-term**: Track achievements → Monitor health trends → Share progress

## 🔐 Security & Privacy
- Email-based authentication through Supabase
- Row-level security ensuring users only access their data
- Local data encryption for sensitive information
- Optional anonymous usage analytics

## 🚀 Future Enhancements (Post-MVP)
- Social features (sharing achievements)
- Barcode scanning for drink identification
- Apple Health / Google Fit integration
- Personalized recommendations based on consumption patterns
- Notification system for intake reminders
- Dark/light theme toggle
- Export data functionality 