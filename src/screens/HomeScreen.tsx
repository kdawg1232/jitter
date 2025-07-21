import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  TouchableOpacity,
  Dimensions,
  TextInput,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { Theme } from '../theme/colors';
import { UserProfile, DrinkRecord, FocusResult } from '../types';
import { StorageService, CaffScoreService, ValidationService, WidgetService, DeepLinkService, PlanningService, NotificationService, calculateStatus } from '../services';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  onProfileCleared?: () => Promise<void>;
}

// Using DrinkRecord from types - removed local interface

export const HomeScreen: React.FC<HomeScreenProps> = ({ onProfileCleared }) => {
  // Timer state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [timerStarted, setTimerStarted] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  
  // Input states
  const [drinkName, setDrinkName] = useState('');
  const [caffeineAmount, setCaffeineAmount] = useState('');
  const [completionPercentage, setCompletionPercentage] = useState(50);
  const [customTime, setCustomTime] = useState('');
  const [timeDigits, setTimeDigits] = useState(''); // Raw digits for time input
  
  // Drinks of the day state
  const [todaysDrinks, setTodaysDrinks] = useState<DrinkRecord[]>([]);
  const [totalDailyCaffeine, setTotalDailyCaffeine] = useState(0);
  const [last24HoursDrinks, setLast24HoursDrinks] = useState<DrinkRecord[]>([]);
  
  // User state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [lastNightSleep, setLastNightSleep] = useState<number>(7.5);
  const [caffScore, setCaffScore] = useState(0); // CaffScore
  const [caffResult, setCaffResult] = useState<FocusResult | null>(null); // Full CaffScore result
  const [previousCaffScore, setPreviousCaffScore] = useState(0); // Track previous score to detect trends
  const [isAppReturningFromBackground, setIsAppReturningFromBackground] = useState<boolean>(false); // Track app state transitions
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState<boolean>(false); // Track if initial data loading is complete
  
  // Status state
  const [statusText, setStatusText] = useState<string>(''); // Current status message
  const [statusTrend, setStatusTrend] = useState<'rising' | 'declining' | 'stable'>('stable'); // Current trend
  const [showStatusDot, setShowStatusDot] = useState<boolean>(false); // Animation control
  
  // Sleep tracking state
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [tempSleepHours, setTempSleepHours] = useState('');
  const [needsSleepUpdate, setNeedsSleepUpdate] = useState(false);
  const [lastSleepLogDate, setLastSleepLogDate] = useState<string | null>(null);
  
  // NEW: Food, stress, exercise tracking state
  const [showStressModal, setShowStressModal] = useState(false);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [tempStressLevel, setTempStressLevel] = useState<number | null>(null);
  const [lastMealTime, setLastMealTime] = useState<Date | null>(null);
  const [lastExerciseTime, setLastExerciseTime] = useState<Date | null>(null);
  const [exerciseType, setExerciseType] = useState<'starting' | 'completed' | null>(null);
  const [exerciseHoursAgo, setExerciseHoursAgo] = useState<number | null>(null);
  const [needsStressUpdate, setNeedsStressUpdate] = useState(false);
  const [needsFoodUpdate, setNeedsFoodUpdate] = useState(false);
  const [needsExerciseUpdate, setNeedsExerciseUpdate] = useState(false);
  const [lastStressLogDate, setLastStressLogDate] = useState<string | null>(null);
  const [lastFoodLogDate, setLastFoodLogDate] = useState<string | null>(null);
  const [lastExerciseLogDate, setLastExerciseLogDate] = useState<string | null>(null);
  const [foodButtonState, setFoodButtonState] = useState<'default' | 'added'>('default');
  const [showExerciseTimeModal, setShowExerciseTimeModal] = useState(false);
  const [selectedExerciseOption, setSelectedExerciseOption] = useState<'starting' | 'completed' | null>(null);
  const [foodAdded, setFoodAdded] = useState(false);
  
  // Info modal state
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showFocusInfoModal, setShowFocusInfoModal] = useState(false);
  
  // Delete confirmation state
  const [deletingDrinkId, setDeletingDrinkId] = useState<string | null>(null);
  
  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const customTimeInputRef = useRef<TextInput>(null);

  // Handle info modal
  const handleInfoPress = () => {
    setShowFocusInfoModal(true);
  };

  // Status calculation logic is now provided by StatusService.calculateStatus

  // Load user data and initialize
  const loadUserData = async () => {
    try {
      console.log('[HomeScreen] 🚀 Loading user data...');
      
      // Load user profile
      const profile = await StorageService.getUserProfile();
      setUserProfile(profile);
      
      // Load last night's sleep and previous CaffScore
      if (profile) {
        const sleepData = await StorageService.getLastNightSleep(profile.userId);
        setLastNightSleep(sleepData || 7.5);
        console.log('[HomeScreen] 😴 Last night sleep loaded:', sleepData || 7.5, 'hours');
        
        // Load previous CaffScore for comparison
        const prevScore = await StorageService.getPreviousCaffScore(profile.userId);
        setPreviousCaffScore(prevScore);
        console.log('[HomeScreen] 📊 Previous CaffScore loaded:', prevScore);
        
        // Load saved status
        const savedStatus = await AsyncStorage.getItem(`status_${profile.userId}`);
        if (savedStatus) {
          setStatusText(savedStatus);
          console.log('[HomeScreen] 📝 Status loaded from storage:', savedStatus);
        }
      }
      
      // Load today's drinks and last 24 hours drinks
      if (profile) {
        const todaysDrinksData = await StorageService.getDrinksToday(profile.userId);
        const last24HoursData = await StorageService.getDrinksLast24Hours(profile.userId);
        setTodaysDrinks(todaysDrinksData);
        setLast24HoursDrinks(last24HoursData);
        
        console.log('[HomeScreen] ☕ Drinks data loaded:', {
          todaysDrinks: todaysDrinksData.length,
          last24HoursDrinks: last24HoursData.length,
          todaysCaffeine: todaysDrinksData.reduce((sum, d) => sum + d.actualCaffeineConsumed, 0),
          last24hCaffeine: last24HoursData.reduce((sum, d) => sum + d.actualCaffeineConsumed, 0)
        });
        
        // Mark initial data as loaded
        setIsInitialDataLoaded(true);
        
        return todaysDrinksData;
      }
      
      return [];
    } catch (error) {
      console.error('[HomeScreen] ❌ Error loading user data:', error);
      return [];
    }
  };

  // Migrate legacy data if needed
  const migrateLegacyData = async () => {
    try {
      await StorageService.migrateLegacyDrinkData();
    } catch (error) {
      console.error('Error migrating legacy data:', error);
    }
  };

  // Calculate total daily caffeine
  const calculateTotalCaffeine = (drinks: DrinkRecord[]): number => {
    return drinks.reduce((total, drink) => total + drink.actualCaffeineConsumed, 0);
  };



  // Detect daily reset (new day)
  const detectDailyReset = async () => {
    const today = new Date().toDateString();
    const storedDate = await AsyncStorage.getItem('last_active_date');
    
    if (storedDate && storedDate !== today) {
      console.log('[HomeScreen] 🌅 NEW DAY DETECTED! Daily reset occurring:', {
        previousDate: storedDate,
        currentDate: today,
        message: 'Drinks display and daily caffeine progress will reset'
      });
    } else if (!storedDate) {
      console.log('[HomeScreen] 🚀 First app launch today:', today);
    }
    
    await AsyncStorage.setItem('last_active_date', today);
  };

  // Load drinks on component mount
  useEffect(() => {
    const initializeData = async () => {
      console.log('[HomeScreen] 🚀 App initializing...');
      await detectDailyReset();
      await migrateLegacyData();
      const todaysDrinksData = await loadUserData();
      const total = calculateTotalCaffeine(todaysDrinksData);
      setTotalDailyCaffeine(total);
      await checkDailyTrackingStatus();
      
      // Check for widget pre-fill data
      await checkWidgetPreFill();
      
      console.log('[HomeScreen] ✅ App initialization complete');
    };
    
    initializeData();
  }, []);



  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  // Format time as HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate actual caffeine consumed
  const calculateActualCaffeine = (caffeineAmount: number, completionPercentage: number): number => {
    return Math.round((caffeineAmount * completionPercentage) / 100);
  };

  // Get the time it took to drink (either elapsed time or custom time)
  const getTimeToConsume = (): string => {
    // If user modified the custom time, use that; otherwise use elapsed time
    const originalElapsedTimeFormatted = formatTime(elapsedTime);
    return customTime !== originalElapsedTimeFormatted ? customTime : originalElapsedTimeFormatted;
  };

  // Calculate real CaffScore using the algorithm
  const calculateCaffScore = async () => {
    if (!userProfile) {
      console.log('[HomeScreen] ⚠️ No user profile, setting CaffScore to 0');
      setCaffScore(0);
      setCaffResult(null);
      return;
    }

    try {
      console.log('[HomeScreen] 🎯 Calculating CaffScore...');
      
      // Always fetch fresh drinks data to avoid stale state issues
      const freshLast24HoursDrinks = await StorageService.getDrinksLast24Hours(userProfile.userId);
      
      console.log('[HomeScreen] 📊 Fresh drinks data loaded:', {
        count: freshLast24HoursDrinks.length,
        totalCaffeine: freshLast24HoursDrinks.reduce((sum, d) => sum + d.actualCaffeineConsumed, 0)
      });
      
      // Calculate CaffScore using the real algorithm (sleep data retrieved internally)
      const result = await CaffScoreService.calculateFocusScore(
        userProfile,
        freshLast24HoursDrinks // Use fresh 24-hour drinks for algorithm accuracy
      );

      console.log('[HomeScreen] ✅ CaffScore calculated:', result.score);
      
      // Use the loaded previous score from storage for comparison
      const loadedPreviousScore = previousCaffScore;
      const newScore = result.score;
      
      console.log('[HomeScreen] 📊 Score comparison:', {
        loadedPreviousScore,
        newScore,
        difference: (newScore - loadedPreviousScore).toFixed(3)
      });
      
      setCaffScore(newScore);
      setCaffResult(result);
      
      // Calculate and update status
      const statusResult = calculateStatus(newScore, loadedPreviousScore, statusText);

      // If the status text changed while app is in foreground, show a local notification
      if (statusResult.text && statusResult.text !== statusText) {
        try {
          const notificationsEnabled = await NotificationService.areNotificationsEnabled();
          if (notificationsEnabled) {
            await NotificationService.scheduleLocalNotification(
              statusResult.text,
              statusResult.text,
              { type: 'status_update' },
            );
          }
        } catch (notifyErr) {
          console.error('[HomeScreen] ❌ Failed to schedule status notification:', notifyErr);
        }
      }

      setStatusText(statusResult.text);
      setStatusTrend(statusResult.trend);
      setShowStatusDot(statusResult.showDot);

      // Persist status for future sessions
      if (userProfile) {
        await AsyncStorage.setItem(`status_${userProfile.userId}`, statusResult.text);
      }
      
      // Persist current score as previous score for next app session
      await StorageService.savePreviousCaffScore(userProfile.userId, newScore);
      
      // Update previous score state for next calculation
      setPreviousCaffScore(newScore);
    } catch (error) {
      console.error('[HomeScreen] ❌ Error calculating CaffScore:', error);
      setCaffScore(0);
      setCaffResult(null);
    }
  };



  // Update CaffScore when relevant data changes
  useEffect(() => {
    console.log('[HomeScreen] 🔄 CaffScore useEffect triggered:', {
      hasUserProfile: !!userProfile,
      last24HoursDrinksCount: last24HoursDrinks.length,
      currentCaffScore: caffScore,
      isInitialDataLoaded
    });
    
    // Only calculate if we have a user profile AND initial data loading is complete
    if (userProfile && isInitialDataLoaded) {
      calculateCaffScore();
    }
  }, [userProfile, last24HoursDrinks, isInitialDataLoaded]); // Sleep data retrieved internally by service

  // Recalculate CaffScore when app returns from background
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active' && userProfile) {
        console.log('[HomeScreen] 📱 App returned to foreground, reloading data');
        setIsAppReturningFromBackground(true);
        
        // Reload drinks data, previous score, and caffeine status, then recalculate
        const todaysDrinksData = await StorageService.getDrinksToday(userProfile.userId);
        const last24HoursData = await StorageService.getDrinksLast24Hours(userProfile.userId);
        const prevScore = await StorageService.getPreviousCaffScore(userProfile.userId);
        
        setTodaysDrinks(todaysDrinksData);
        setLast24HoursDrinks(last24HoursData);
        setPreviousCaffScore(prevScore);
        
        // Update totals
        const newTotal = calculateTotalCaffeine(todaysDrinksData);
        setTotalDailyCaffeine(newTotal);
        
        // Preserve current status when returning from background
        // (Status will be recalculated when CaffScore updates)
        
        console.log('[HomeScreen] ✅ Data reloaded from background:', {
          todaysDrinks: todaysDrinksData.length,
          last24HoursDrinks: last24HoursData.length,
          previousScoreLoaded: prevScore
        });
        
        // Ensure data loaded flag is set
        setIsInitialDataLoaded(true);
        
        // Reset the flag after a brief delay
        setTimeout(() => {
          setIsAppReturningFromBackground(false);
          console.log('[HomeScreen] 📱 App foreground transition complete');
        }, 1000);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [userProfile]);

  // Periodic CaffScore recalculation (every 5 minutes)
  useEffect(() => {
    if (!userProfile) return;

    const interval = setInterval(() => {
      console.log('[HomeScreen] ⏰ Periodic CaffScore recalculation');
      calculateCaffScore();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [userProfile]);

  // Recalculate CaffScore when HomeScreen component mounts
  useEffect(() => {
    if (userProfile) {
      console.log('[HomeScreen] 🏠 HomeScreen mounted, recalculating CaffScore');
      calculateCaffScore();
    }
  }, []); // Empty dependency array = runs once on mount

  // --- REFRESH DAILY TRACKING WHEN PROFILE LOADED ---
  // When the userProfile becomes available (e.g., after navigating back to HomeScreen),
  // we need to re-check whether today\'s sleep, stress, food, and exercise entries exist
  // so the UI correctly reflects already-saved data.
  useEffect(() => {
    if (userProfile) {
      console.log('[HomeScreen] 🔄 userProfile loaded/changed – refreshing daily tracking status');
      checkDailyTrackingStatus();
    }
  }, [userProfile]);

  // Get current score
  const getCurrentScore = () => {
    return caffScore;
  };
  const getCurrentScoreLabel = () => 'CaffScore';
  
  // Calculate progress bar fill percentage and color
  const currentScore = getCurrentScore();
  const progressPercentage = Math.min(currentScore, 100);
  
  const getProgressBarColor = () => {
    // CaffScore uses four-zone color scheme
    if (currentScore >= 80) return Theme.colors.primaryGreen;   // 80-100: Peak Stimulation (green)
    if (currentScore >= 50) return Theme.colors.primaryBlue;    // 50-79: Moderate Boost (blue)  
    if (currentScore >= 25) return Theme.colors.accentOrange;   // 25-49: Wearing Off (orange)
    return Theme.colors.accentRed;                              // 0-24: Minimal Effect (red)
  };

  // Calculate daily caffeine progress bar
  const dailyCaffeinePercentage = Math.min((totalDailyCaffeine / 400) * 100, 100);
  const getDailyCaffeineProgressBarColor = () => {
    if (dailyCaffeinePercentage >= 75) return Theme.colors.accentRed;
    if (dailyCaffeinePercentage >= 50) return Theme.colors.accentOrange;
    return Theme.colors.primaryGreen;
  };

  const handleAddDrink = () => {
    setTimerStarted(true);
    setIsTimerRunning(true);
    setElapsedTime(0);
    setDrinkName('');
  };

  const handleStopTimer = () => {
    setIsTimerRunning(false);
    setShowFollowUp(true);
    const formattedTime = formatTime(elapsedTime);
    setCustomTime(formattedTime);
    // Convert formatted time to digits for right-to-left input
    const digits = formattedTime.replace(/:/g, '');
    setTimeDigits(digits);
  };

  const handleRecord = async () => {
    const caffeineAmountNum = parseFloat(caffeineAmount) || 0;
    const actualCaffeine = calculateActualCaffeine(caffeineAmountNum, completionPercentage);
    const timeToConsume = getTimeToConsume();
    
    console.log('[HomeScreen] ☕ User recording new drink:', {
      name: drinkName || 'Unnamed Drink',
      caffeineAmount: caffeineAmountNum,
      completionPercentage,
      actualCaffeineConsumed: actualCaffeine,
      timeToConsume,
      elapsedTime: formatTime(elapsedTime)
    });
    
    // Create new drink record
    const now = new Date();
    const newDrink: DrinkRecord = {
      id: Date.now().toString(), // Simple ID generation
      userId: userProfile?.userId || 'unknown',
      name: drinkName || 'Unnamed Drink',
      caffeineAmount: caffeineAmountNum,
      completionPercentage,
      timeToConsume,
      actualCaffeineConsumed: actualCaffeine,
      timestamp: now, // When consumption started
      recordedAt: now, // When record was created
    };
    
    // Save drink to storage first
    console.log('[HomeScreen] 💾 Saving drink to storage...');
    await StorageService.addDrinkRecord(newDrink);
    

    
    // Reload drinks from storage to ensure state consistency
    if (userProfile) {
      console.log('[HomeScreen] 🔄 Reloading drinks data after new drink...');
      const updatedTodaysDrinks = await StorageService.getDrinksToday(userProfile.userId);
      const updatedLast24HoursDrinks = await StorageService.getDrinksLast24Hours(userProfile.userId);
      setTodaysDrinks(updatedTodaysDrinks);
      setLast24HoursDrinks(updatedLast24HoursDrinks);
      
      // Update totals (using today's drinks for daily total)
      const newTotal = calculateTotalCaffeine(updatedTodaysDrinks);
      console.log('[HomeScreen] 📊 Updated daily caffeine total:', newTotal, 'mg');
      setTotalDailyCaffeine(newTotal);
    }
    
    // Update CaffScore
    console.log('[HomeScreen] 🎯 Recalculating CaffScore...');
    await calculateCaffScore();
    
        // Update widget data with new scores
    if (userProfile) {
      console.log('[HomeScreen] 📱 Updating widget data after drink logging...');
      await WidgetService.updateWidgetData(userProfile.userId);
      
      // React to drink logged for planning system
      console.log('[HomeScreen] 📅 Updating planning system after drink logging...');
      await PlanningService.reactToDrinkLogged(userProfile.userId, newDrink);
      
      // Update stats calculations
      console.log('[HomeScreen] 📊 Updating stats calculations after drink logging...');
      await updateStatsCalculations(userProfile.userId);
    }

    // Reset everything
    console.log('[HomeScreen] 🔄 Resetting form after successful drink recording');
    setTimerStarted(false);
    setShowFollowUp(false);
    setDrinkName('');
    setCaffeineAmount('');
    setCompletionPercentage(50);
    setCustomTime('');
    setTimeDigits('');
    setElapsedTime(0);
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };



  // Handle sleep button press
  const handleSleepPress = () => {
    try {
      console.log('[HomeScreen] 🌙 Sleep button pressed');
      setTempSleepHours(lastNightSleep.toString());
      setShowSleepModal(true);
    } catch (error) {
      console.error('[HomeScreen] ❌ Error in handleSleepPress:', error);
    }
  };

  // NEW: Handle stress button press
  const handleStressPress = () => {
    try {
      console.log('[HomeScreen] 😰 Stress button pressed');
      setTempStressLevel(stressLevel);
      setShowStressModal(true);
    } catch (error) {
      console.error('[HomeScreen] ❌ Error in handleStressPress:', error);
    }
  };

  // NEW: Handle food button press
  const handleFoodPress = () => {
    try {
      console.log('[HomeScreen] 🍽️ Food button pressed, current state:', foodButtonState);
      // Pre-populate with existing state if food was already added today
      setFoodAdded(foodButtonState === 'added');
      setShowFoodModal(true);
    } catch (error) {
      console.error('[HomeScreen] ❌ Error in handleFoodPress:', error);
    }
  };

  // NEW: Handle exercise button press
  const handleExercisePress = () => {
    try {
      console.log('[HomeScreen] 🏃‍♂️ Exercise button pressed, current type:', exerciseType);
      // Pre-populate with existing exercise type if available
      if (exerciseType) {
        setSelectedExerciseOption(exerciseType);
      } else {
        setSelectedExerciseOption(null);
      }
      setShowExerciseModal(true);
    } catch (error) {
      console.error('[HomeScreen] ❌ Error in handleExercisePress:', error);
    }
  };

  // Save sleep hours
  const handleSaveSleep = async () => {
    const sleepHours = parseFloat(tempSleepHours);
    
    console.log('[HomeScreen] 💤 User attempting to save sleep:', {
      inputValue: tempSleepHours,
      parsedHours: sleepHours,
      isValid: !isNaN(sleepHours) && sleepHours >= 0 && sleepHours <= 24
    });
    
    if (isNaN(sleepHours) || sleepHours < 0 || sleepHours > 24) {
      console.log('[HomeScreen] ❌ Invalid sleep hours, not saving');
      return;
    }

    // Close the modal immediately so the UI is responsive while we finish async work
    setShowSleepModal(false);

    try {
      console.log('[HomeScreen] 🔄 Updating sleep from', lastNightSleep, 'to', sleepHours, 'hours');
      setLastNightSleep(sleepHours);
      
      // Save to storage
      if (userProfile) {
        // Save sleep data for yesterday since "last night" refers to the previous night
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        // Today's date for tracking when user last logged sleep
        const today = new Date().toISOString().split('T')[0];
        
        const sleepRecord = {
          userId: userProfile.userId,
          date: yesterdayStr,
          hoursSlept: sleepHours,
          source: 'manual' as const,
          createdAt: new Date(),
        };
        
        console.log('[HomeScreen] 💾 Saving sleep record for date:', yesterdayStr, '(logged on:', today, ')');
        await StorageService.addSleepRecord(sleepRecord);
        await AsyncStorage.setItem('last_sleep_log_date', today);
        
        setLastSleepLogDate(today);
        setNeedsSleepUpdate(false);
        
        // Recalculate CaffScore
        await calculateCaffScore();
        
        // Update widget data with new scores
        console.log('[HomeScreen] 📱 Updating widget data after sleep update...');
        await WidgetService.updateWidgetData(userProfile.userId);
        
        console.log('[HomeScreen] ✅ Sleep saved successfully and CaffScore updated');
      }
      
    } catch (error) {
      console.error('[HomeScreen] ❌ Error saving sleep:', error);
    } finally {
      // Always clear the temporary input so the next open starts fresh
      setTempSleepHours('');
    }
  };

  // NEW: Save stress level
  const handleSaveStress = async () => {
    if (tempStressLevel === null || tempStressLevel < 1 || tempStressLevel > 10) {
      console.log('[HomeScreen] ❌ Invalid stress level, not saving');
      return;
    }

    // Close the modal right away for better responsiveness
    setShowStressModal(false);

    // Defer heavy work so the modal can fully disappear first – this prevents the UI from freezing
    setTimeout(async () => {
      try {
        console.log('[HomeScreen] 🔄 Updating stress level to:', tempStressLevel);
        setStressLevel(tempStressLevel);
        
        if (userProfile) {
          const today = new Date().toISOString().split('T')[0];
          
          // Create stress record
          const stressRecord = {
            userId: userProfile.userId,
            date: today,
            stressLevel: tempStressLevel,
            createdAt: new Date(),
          };
          
          console.log('[HomeScreen] 💾 Saving stress record for date:', today);
          await StorageService.addStressRecord(stressRecord);
          await AsyncStorage.setItem('last_stress_log_date', today);
          
          setLastStressLogDate(today);
          setNeedsStressUpdate(false);
          
          console.log('[HomeScreen] ✅ Stress level saved successfully');
        }
        
      } catch (error) {
        console.error('[HomeScreen] ❌ Error saving stress level:', error);
      } finally {
        // Always reset temp state
        setTempStressLevel(null);
      }
    }, 0);
  };

  // NEW: Save food intake
  const handleSaveFood = async () => {
    // Close the modal immediately so the UI is free while we persist data
    setShowFoodModal(false);

    // Run persistence a tick later so the modal overlay is gone first
    setTimeout(async () => {
      try {
        console.log('[HomeScreen] 🔄 Recording food intake:', { foodAdded });
        
        if (foodAdded) {
          // Adding/updating food entry
          const now = new Date();
          setLastMealTime(now);
          setFoodButtonState('added');
          
          if (userProfile) {
            const today = new Date().toISOString().split('T')[0];
            
            // Create food record
            const foodRecord = {
              userId: userProfile.userId,
              date: today,
              lastMealTime: now,
              createdAt: new Date(),
            };
            
            console.log('[HomeScreen] �� Saving food record for date:', today);
            await StorageService.addFoodRecord(foodRecord);
            await AsyncStorage.setItem('last_food_log_date', today);
            
            setLastFoodLogDate(today);
            setNeedsFoodUpdate(false);
            
            console.log('[HomeScreen] ✅ Food intake saved successfully');
          }
        } else {
          // Removing food entry (user decided they haven't eaten)
          setLastMealTime(null);
          setFoodButtonState('default');
          
          if (userProfile) {
            // Remove today's food log date to show as needing update
            await AsyncStorage.removeItem('last_food_log_date');
            setLastFoodLogDate(null);
            setNeedsFoodUpdate(true);
            
            console.log('[HomeScreen] ✅ Food entry removed successfully');
          }
        }
        
      } catch (error) {
        console.error('[HomeScreen] ❌ Error saving food intake:', error);
      }
    }, 0);
  };

  // NEW: Save exercise data
  const handleSaveExercise = async () => {
    console.log('[HomeScreen] 🔄 handleSaveExercise invoked with option:', selectedExerciseOption);

    // Always close the main exercise modal first so only one modal is visible at a time
    setShowExerciseModal(false);

    // CASE 1: User chose to remove entry
    if (selectedExerciseOption === null) {
      // Defer heavy work
      setTimeout(async () => {
        try {
          setLastExerciseTime(null);
          setExerciseType(null);
          setExerciseHoursAgo(null);

          if (userProfile) {
            await AsyncStorage.removeItem('last_exercise_log_date');
            setLastExerciseLogDate(null);
            setNeedsExerciseUpdate(true);
          }
          console.log('[HomeScreen] ✅ Exercise entry removed successfully');
        } catch (err) {
          console.error('[HomeScreen] ❌ Error removing exercise entry:', err);
        } finally {
          setSelectedExerciseOption(null);
        }
      }, 0);
      return;
    }

    // CASE 2: User chose "I already exercised" → we need the secondary time modal
    if (selectedExerciseOption === 'completed') {
      // Open the time modal AFTER the first modal is gone (next tick prevents overlay freeze)
      setTimeout(() => {
        setShowExerciseTimeModal(true);
      }, 0);
      return; // Data will be persisted in handleSaveCompletedExercise
    }

    // CASE 3: User chose "starting" → persist immediately
    setTimeout(async () => {
      try {
        const now = new Date();
        setLastExerciseTime(now);
        setExerciseType('starting');

        if (userProfile) {
          const today = new Date().toISOString().split('T')[0];
          const exerciseRecord = {
            userId: userProfile.userId,
            date: today,
            exerciseType: 'starting' as const,
            exerciseTime: now,
            createdAt: new Date(),
          };
          console.log('[HomeScreen] 💾 Saving exercise record for date:', today);
          await StorageService.addExerciseRecord(exerciseRecord);
          await AsyncStorage.setItem('last_exercise_log_date', today);

          setLastExerciseLogDate(today);
          setNeedsExerciseUpdate(false);
          console.log('[HomeScreen] ✅ Exercise data saved successfully');
        }
      } catch (err) {
        console.error('[HomeScreen] ❌ Error saving starting exercise:', err);
      } finally {
        setSelectedExerciseOption(null);
      }
    }, 0);
  };

  // NEW: Save completed exercise with time
  const handleSaveCompletedExercise = async (hoursAgo: number) => {
    try {
      console.log('[HomeScreen] 🔄 Recording completed exercise:', { hoursAgo });
      const now = new Date();
      const exerciseTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
      
      setLastExerciseTime(exerciseTime);
      setExerciseType('completed');
      setExerciseHoursAgo(hoursAgo);
      
      if (userProfile) {
        const today = new Date().toISOString().split('T')[0];
        
        // Create exercise record
        const exerciseRecord = {
          userId: userProfile.userId,
          date: today,
          exerciseType: 'completed' as 'starting' | 'completed',
          exerciseTime: exerciseTime,
          hoursAgo: hoursAgo,
          createdAt: new Date(),
        };
        
        console.log('[HomeScreen] 💾 Saving completed exercise record for date:', today);
        await StorageService.addExerciseRecord(exerciseRecord);
        await AsyncStorage.setItem('last_exercise_log_date', today);
        
        setLastExerciseLogDate(today);
        setNeedsExerciseUpdate(false);
        
        console.log('[HomeScreen] ✅ Completed exercise data saved successfully');
      }
      
    } catch (error) {
      console.error('[HomeScreen] ❌ Error saving completed exercise data:', error);
    } finally {
      // Always close both modals and reset state
      setShowExerciseModal(false);
      setShowExerciseTimeModal(false);
      setSelectedExerciseOption(null);
    }
  };

  // Check for widget pre-fill data and automatically start follow-up
  const checkWidgetPreFill = async () => {
    try {
      const preFillData = await DeepLinkService.getWidgetPreFillData();
      
      if (preFillData) {
        console.log('[HomeScreen] 📱 Widget pre-fill data found:', preFillData);
        
        // Auto-populate the follow-up form with widget data
        setTimerStarted(true);
        setShowFollowUp(true);
        setCustomTime(preFillData.timeToConsume);
        setElapsedTime(preFillData.elapsedSeconds);
        
        // Set drink name to indicate it came from widget
        setDrinkName('Widget Drink');
        
        console.log('[HomeScreen] ✅ Pre-filled form with widget data');
      }
    } catch (error) {
      console.error('[HomeScreen] ❌ Error checking widget pre-fill:', error);
    }
  };

  // Update stats calculations after data changes
  const updateStatsCalculations = async (userId: string) => {
    try {
      // Force recalculation of the under 400mg streak
      console.log('[HomeScreen] 🔄 Recalculating under 400mg streak...');
      await StorageService.calculateUnder400Streak(userId, true);
      
      // Note: Calendar summary and other monthly stats will be recalculated 
      // automatically when the stats screen loads, as they don't use caching
      console.log('[HomeScreen] ✅ Stats calculations updated');
    } catch (error) {
      console.error('[HomeScreen] ❌ Error updating stats calculations:', error);
    }
  };

  // Handle drink deletion
  const handleDeleteDrink = async (drinkId: string) => {
    try {
      console.log('[HomeScreen] 🗑️ Deleting drink:', drinkId);
      
      // Delete the drink from storage
      await StorageService.deleteDrinkRecord(drinkId);
      
      // Reload drinks from storage to ensure state consistency
      if (userProfile) {
        console.log('[HomeScreen] 🔄 Reloading drinks data after deletion...');
        const updatedTodaysDrinks = await StorageService.getDrinksToday(userProfile.userId);
        const updatedLast24HoursDrinks = await StorageService.getDrinksLast24Hours(userProfile.userId);
        setTodaysDrinks(updatedTodaysDrinks);
        setLast24HoursDrinks(updatedLast24HoursDrinks);
        
        // Update totals (using today's drinks for daily total)
        const newTotal = calculateTotalCaffeine(updatedTodaysDrinks);
        console.log('[HomeScreen] 📊 Updated daily caffeine total after deletion:', newTotal, 'mg');
        setTotalDailyCaffeine(newTotal);
      }
      
      // Update CaffScore
      console.log('[HomeScreen] 🎯 Recalculating CaffScore after deletion...');
      await calculateCaffScore();
      
      // Update widget data with new scores
      if (userProfile) {
        console.log('[HomeScreen] 📱 Updating widget data after drink deletion...');
        await WidgetService.updateWidgetData(userProfile.userId);
      }
      
      // Force recalculation of stats that are shown in stats screen
      if (userProfile) {
        console.log('[HomeScreen] 📊 Updating stats calculations after drink deletion...');
        await updateStatsCalculations(userProfile.userId);
      }
      
      // Clear deletion state
      setDeletingDrinkId(null);
      
      console.log('[HomeScreen] ✅ Drink deletion complete');
    } catch (error) {
      console.error('[HomeScreen] ❌ Error deleting drink:', error);
      setDeletingDrinkId(null);
    }
  };

  // Calculate dynamic width for drink name input
  const getDrinkNameInputWidth = () => {
    const minWidth = 120;
    const maxWidth = width - (Theme.spacing.lg * 2);
    const characterWidth = 10; // Approximate character width
    const calculatedWidth = Math.max(minWidth, drinkName.length * characterWidth + 40);
    return Math.min(calculatedWidth, maxWidth);
  };

  // Calculate percentage text position for slider (improved positioning)
  const getPercentageTextPosition = () => {
    const sliderWidth = width - (Theme.spacing.lg * 2);
    const thumbPosition = (completionPercentage / 100) * sliderWidth;
    const textWidth = 50; // Approximate width of percentage text
    const leftPosition = Math.max(0, Math.min(sliderWidth - textWidth, thumbPosition - textWidth / 2));
    return leftPosition;
  };

  // Right-to-left time input formatting
  const formatTimeFromDigits = (digits: string): string => {
    // If no digits, return default
    if (digits.length === 0) {
      return '00:00:00';
    }
    
    // Take only the last 6 digits (newest digits on the right)
    const lastSixDigits = digits.slice(-6);
    
    // Pad with leading zeros to make it 6 digits for formatting
    const paddedDigits = lastSixDigits.padStart(6, '0');
    
    // Extract hours, minutes, seconds
    const hours = paddedDigits.slice(0, 2);
    const minutes = paddedDigits.slice(2, 4);
    const seconds = paddedDigits.slice(4, 6);
    
    // Validate ranges
    let h = parseInt(hours, 10);
    let m = parseInt(minutes, 10);
    let s = parseInt(seconds, 10);
    
    // Cap at maximum values
    if (h > 23) h = 23;
    if (m > 59) m = 59;
    if (s > 59) s = 59;
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCustomTimeChange = (text: string) => {
    // Extract only digits from the input
    const newDigits = text.replace(/\D/g, '');
    
    // For right-to-left entry, we need to handle the new input properly
    if (newDigits.length > timeDigits.length) {
      // User added a digit - append to the right
      const addedDigit = newDigits.slice(-1);
      const updatedDigits = (timeDigits + addedDigit).slice(-6); // Keep last 6 digits
      setTimeDigits(updatedDigits);
      setCustomTime(formatTimeFromDigits(updatedDigits));
    } else {
      // User deleted digit(s) - handle backspace
      setTimeDigits(newDigits);
      setCustomTime(formatTimeFromDigits(newDigits));
    }
  };

  const handleCustomTimeFocus = () => {
    // Scroll to make sure the input is visible
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
    
    // Set cursor to the end for right-to-left entry
    setTimeout(() => {
      if (customTimeInputRef.current) {
        const textLength = customTime.length;
        customTimeInputRef.current.setSelection(textLength, textLength);
      }
    }, 100);
  };

  // Check if today's sleep and other daily tracking has been logged
  const checkDailyTrackingStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check sleep status
      const lastSleepLogDate = await AsyncStorage.getItem('last_sleep_log_date');
      setLastSleepLogDate(lastSleepLogDate);
      setNeedsSleepUpdate(lastSleepLogDate !== today);
      
      // Check stress status
      const lastStressLogDate = await AsyncStorage.getItem('last_stress_log_date');
      setLastStressLogDate(lastStressLogDate);
      setNeedsStressUpdate(lastStressLogDate !== today);
      
      // Check food status
      const lastFoodLogDate = await AsyncStorage.getItem('last_food_log_date');
      setLastFoodLogDate(lastFoodLogDate);
      setNeedsFoodUpdate(lastFoodLogDate !== today);
      
      // Check exercise status
      const lastExerciseLogDate = await AsyncStorage.getItem('last_exercise_log_date');
      setLastExerciseLogDate(lastExerciseLogDate);
      setNeedsExerciseUpdate(lastExerciseLogDate !== today);
      
      // Load existing data for today if available
      if (userProfile) {
        // Load stress level for today using StorageService
        const todayStressLevel = await StorageService.getTodayStressLevel(userProfile.userId);
        if (todayStressLevel !== null) {
          setStressLevel(todayStressLevel);
        }
        
        // Load meal time for today using StorageService
        const todayLastMealTime = await StorageService.getTodayLastMealTime(userProfile.userId);
        if (todayLastMealTime) {
          setLastMealTime(todayLastMealTime);
          setFoodButtonState('added');
        } else {
          setFoodButtonState('default');
        }
        
        // Load exercise data for today using StorageService
        const todayExerciseData = await StorageService.getTodayExerciseData(userProfile.userId);
        if (todayExerciseData) {
          setLastExerciseTime(todayExerciseData.exerciseTime);
          setExerciseType(todayExerciseData.exerciseType);
          setExerciseHoursAgo(todayExerciseData.hoursAgo || 0);
        }
      }
    } catch (error) {
      console.error('Error checking daily tracking status:', error);
      // Default to needing updates on error
      setNeedsSleepUpdate(true);
      setNeedsStressUpdate(true);
      setNeedsFoodUpdate(true);
      setNeedsExerciseUpdate(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header with Tracking Buttons */}
          <View style={styles.header}>
            {/* Left Column: Sleep and Stress */}
            <View style={styles.leftColumn}>
              <View style={styles.buttonWithLabel}>
                <TouchableOpacity 
                  style={[
                    styles.trackingButton,
                    needsSleepUpdate && styles.trackingButtonAlert
                  ]} 
                  onPress={handleSleepPress}
                >
                  <Text style={styles.trackingEmoji}>🌙</Text>
                  {needsSleepUpdate && <Text style={styles.alertIcon}>!</Text>}
                </TouchableOpacity>
                <Text style={[
                  styles.buttonLabel,
                  needsSleepUpdate && styles.buttonLabelAlert
                ]}>
                  add sleep
                </Text>
              </View>
              
              <View style={styles.buttonWithLabel}>
                <TouchableOpacity 
                  style={[
                    styles.trackingButton,
                    needsStressUpdate && styles.trackingButtonAlert
                  ]} 
                  onPress={handleStressPress}
                >
                  <Text style={styles.trackingEmoji}>😰</Text>
                  {needsStressUpdate && <Text style={styles.alertIcon}>!</Text>}
                </TouchableOpacity>
                <Text style={[
                  styles.buttonLabel,
                  needsStressUpdate && styles.buttonLabelAlert
                ]}>
                  add stress level
                </Text>
              </View>
            </View>
            
            {/* Center: Title */}
            <View style={styles.centerColumn}>
              <Text style={styles.title}>jitter</Text>
              <Text style={styles.dateSubheading}>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            </View>
            
            {/* Right Column: Food and Exercise */}
            <View style={styles.rightColumn}>
              <View style={styles.buttonWithLabel}>
                <TouchableOpacity 
                  style={[
                    styles.trackingButton,
                    needsFoodUpdate && styles.trackingButtonAlert
                  ]} 
                  onPress={handleFoodPress}
                >
                  <Text style={styles.trackingEmoji}>🍽️</Text>
                  {needsFoodUpdate && <Text style={styles.alertIcon}>!</Text>}
                </TouchableOpacity>
                <Text style={[
                  styles.buttonLabel,
                  needsFoodUpdate && styles.buttonLabelAlert
                ]}>
                  add meal
                </Text>
              </View>
              
              <View style={styles.buttonWithLabel}>
                <TouchableOpacity 
                  style={[
                    styles.trackingButton,
                    needsExerciseUpdate && styles.trackingButtonAlert
                  ]} 
                  onPress={handleExercisePress}
                >
                  <Text style={styles.trackingEmoji}>🏃‍♂️</Text>
                  {needsExerciseUpdate && <Text style={styles.alertIcon}>!</Text>}
                </TouchableOpacity>
                <Text style={[
                  styles.buttonLabel,
                  needsExerciseUpdate && styles.buttonLabelAlert
                ]}>
                  add exercise
                </Text>
              </View>
            </View>
          </View>
          
          {/* Mascot */}
          <View style={styles.mascotContainer}>
            <Image 
              source={require('../../assets/purplejittermascot.png')} 
              style={styles.mascotImage}
              resizeMode="contain"
            />
          </View>
          
          {/* Score Container */}
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreNumber}>
              {Math.round(currentScore)}
            </Text>
            
            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: `${progressPercentage}%`,
                      backgroundColor: getProgressBarColor()
                    }
                  ]} 
                />
              </View>
            </View>
            
            {/* Score Label and Info */}
            <View style={styles.scoreLabelContainer}>
              <Text style={styles.scoreLabel}>{getCurrentScoreLabel()}</Text>
              <TouchableOpacity style={styles.infoButton} onPress={handleInfoPress}>
                <Text style={styles.infoIcon}>ⓘ</Text>
              </TouchableOpacity>
            </View>
            
            {/* Status Container */}
            <View style={styles.statusContainer}>
              {showStatusDot && (
                <View style={[styles.statusDot, styles.statusDotPulsing]} />
              )}
              <Text style={styles.statusText}>
                {statusText}
              </Text>
            </View>
            

          </View>
          
          {/* Add Drink Button or Timer Section */}
          {!timerStarted ? (
            <>
              <View style={styles.addDrinkSection}>
                <TouchableOpacity style={styles.addButton} onPress={handleAddDrink}>
                  <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
                <Text style={styles.addDrinkLabel}>add a drink</Text>
              </View>
              
              {/* Drinks of the Day Section */}
              {todaysDrinks.length > 0 && (
                <View style={styles.drinksOfDaySection}>
                  <View style={styles.drinksOfDayHeader}>
                    <Text style={styles.drinksOfDayTitle}>drinks of the day</Text>
                    <Text style={styles.drinksOfDayDate}>
                      {new Date().toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </Text>
                  </View>
                  {todaysDrinks.map((drink) => {
                    const isDeleting = deletingDrinkId === drink.id;
                    return (
                      <TouchableOpacity
                        key={drink.id}
                        style={[
                          styles.drinkItem,
                          isDeleting && styles.drinkItemDeleting
                        ]}
                        onLongPress={() => setDeletingDrinkId(drink.id)}
                        onPress={() => {
                          if (isDeleting) {
                            handleDeleteDrink(drink.id);
                          } else {
                            setDeletingDrinkId(null);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        {isDeleting ? (
                          <View style={styles.deleteConfirmContainer}>
                            <Text style={styles.deleteConfirmText}>delete?</Text>
                          </View>
                        ) : (
                          <>
                            <View style={styles.drinkItemHeader}>
                              <Text style={styles.drinkName}>{drink.name}</Text>
                              <Text style={styles.drinkTime}>{drink.timeToConsume}</Text>
                            </View>
                            <Text style={styles.drinkCaffeine}>
                              {drink.actualCaffeineConsumed}mg caffeine consumed
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  
                  {/* Daily Caffeine Progress Bar */}
                  <View style={styles.dailyCaffeineContainer}>
                    <View style={styles.dailyProgressBarContainer}>
                      <View style={styles.dailyProgressBarBackground}>
                        <View 
                          style={[
                            styles.dailyProgressBarFill, 
                            { 
                              width: `${dailyCaffeinePercentage}%`,
                              backgroundColor: getDailyCaffeineProgressBarColor()
                            }
                          ]} 
                        />
                      </View>
                    </View>
                    <Text style={styles.dailyCaffeineLabel}>
                      {totalDailyCaffeine}mg / 400mg total caffeine for day
                    </Text>
                  </View>
                </View>
              )}
            </>
          ) : !showFollowUp ? (
            <View style={styles.timerSection}>
              <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
              <Text style={styles.sippingLabel}>time sipping</Text>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => {
                  setTimerStarted(false);
                  setIsTimerRunning(false);
                  setElapsedTime(0);
                  setDrinkName('');
                }}>
                  <Text style={styles.cancelButtonText}>✕</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.doneButton} onPress={handleStopTimer}>
                  <Text style={styles.doneButtonText}>✓</Text>
                </TouchableOpacity>
              </View>
              
              {/* Drink Name Input */}
              <View style={styles.drinkNameSection}>
                <TextInput
                  style={[
                    styles.drinkNameInput,
                    { width: getDrinkNameInputWidth() }
                  ]}
                  value={drinkName}
                  onChangeText={setDrinkName}
                  returnKeyType="done"
                  onSubmitEditing={dismissKeyboard}
                  textAlign="center"
                />
                <Text style={styles.inputLabel}>whats the drink name</Text>
              </View>
            </View>
          ) : (
            // Follow-up Questions Section
            <View style={styles.followUpSection}>
              {/* Caffeine Amount */}
              <View style={styles.questionContainer}>
                <View style={styles.questionRow}>
                  <Text style={styles.questionText}>how much caffeine was in the drink?</Text>
                  <TextInput
                    style={styles.smallTextInput}
                    placeholder="mg"
                    placeholderTextColor={Theme.colors.textTertiary}
                    value={caffeineAmount}
                    onChangeText={setCaffeineAmount}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={dismissKeyboard}
                  />
                </View>
              </View>
              
              {/* Completion Percentage */}
              <View style={styles.questionContainer}>
                <Text style={styles.questionText}>how much of the drink did you complete?</Text>
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderWrapper}>
                    <Text 
                      style={[
                        styles.percentageText, 
                        { 
                          position: 'absolute',
                          left: getPercentageTextPosition(),
                          top: -5,
                          zIndex: 1
                        }
                      ]}
                    >
                      {Math.round(completionPercentage)}%
                    </Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={100}
                      value={completionPercentage}
                      onValueChange={setCompletionPercentage}
                      step={1}
                      minimumTrackTintColor={Theme.colors.primaryBlue}
                      maximumTrackTintColor={Theme.colors.cardBg}
                      thumbTintColor={Theme.colors.primaryBlue}
                    />
                  </View>
                </View>
              </View>
              
              {/* Custom Time */}
              <View style={styles.questionContainer}>
                <Text style={styles.questionText}>add in a custom time if you think we got it wrong</Text>
                <TextInput
                  ref={customTimeInputRef}
                  style={styles.customTimeInput}
                  value={customTime}
                  onChangeText={handleCustomTimeChange}
                  onFocus={handleCustomTimeFocus}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={dismissKeyboard}
                  textAlign="center"
                  selection={{ start: customTime.length, end: customTime.length }}
                  selectTextOnFocus={false}
                />
              </View>
              
              {/* Record Button */}
              <View style={styles.recordSection}>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => {
                    setShowFollowUp(false);
                    setTimerStarted(false);
                    setDrinkName('');
                    setCaffeineAmount('');
                    setCompletionPercentage(50);
                    setCustomTime('');
                    setTimeDigits('');
                    setElapsedTime(0);
                  }}>
                    <Text style={styles.cancelButtonText}>✕</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.recordButton} onPress={handleRecord}>
                    <Text style={styles.recordButtonIcon}>✓</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.recordLabel}>record</Text>
              </View>
            </View>
          )}
          
          {/* Testing Button */}
          <View style={styles.testingContainer}>
            <TouchableOpacity 
              style={styles.testingButton} 
              onPress={async () => {
                try {
                  console.log('[HomeScreen] 🧪 Testing: Starting onboarding flow test...');
                  await StorageService.clearUserProfile();
                  console.log('[HomeScreen] ✅ User profile cleared, triggering app re-check...');
                  // Trigger the app-level profile check to redirect to get started
                  if (onProfileCleared) {
                    await onProfileCleared();
                  }
                } catch (error) {
                  console.error('[HomeScreen] ❌ Error testing onboarding flow:', error);
                }
              }}
            >
              <Text style={styles.testingButtonText}>see onboarding</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Sleep Modal */}
      <Modal
        visible={showSleepModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSleepModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{lastNightSleep ? 'Update Sleep' : 'Add Sleep'}</Text>
            <Text style={styles.modalSubtitle}>
              {lastNightSleep 
                ? `Currently: ${lastNightSleep} hours. How many hours did you sleep last night?`
                : 'How many hours did you sleep last night?'
              }
            </Text>
            
            <TextInput
              style={styles.sleepInput}
              value={tempSleepHours}
              onChangeText={setTempSleepHours}
              placeholder="7.5"
              keyboardType="numeric"
              autoFocus={true}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonCancel} 
                onPress={() => setShowSleepModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButtonSave} 
                onPress={handleSaveSleep}
              >
                <Text style={styles.modalButtonTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* NEW: Stress Level Modal */}
      <Modal
        visible={showStressModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowStressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {stressLevel ? 'Update Stress Level' : 'Add Stress Level'}
            </Text>
            <Text style={styles.modalSubtitle}>
              How stressed are you feeling today?
              {stressLevel && ` (Currently: ${stressLevel}/10)`}
            </Text>
            
            <View style={styles.stressButtonGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.stressButton,
                    tempStressLevel === level && styles.stressButtonSelected
                  ]}
                  onPress={() => setTempStressLevel(level)}
                >
                  <Text style={[
                    styles.stressButtonText,
                    tempStressLevel === level && styles.stressButtonTextSelected
                  ]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonCancel} 
                onPress={() => setShowStressModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButtonSave} 
                onPress={handleSaveStress}
              >
                <Text style={styles.modalButtonTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* NEW: Food Modal */}
      <Modal
        visible={showFoodModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowFoodModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {foodButtonState === 'added' ? 'Update Food' : 'Add Food'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {foodButtonState === 'added' 
                ? `Last meal: ${lastMealTime ? new Date(lastMealTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Unknown time'}`
                : 'Click to add food'
              }
            </Text>
            
            <TouchableOpacity 
              style={[
                styles.foodSelectionButton,
                foodAdded && styles.foodSelectionButtonSelected
              ]}
              onPress={() => setFoodAdded(!foodAdded)}
            >
              <Text style={[
                styles.foodSelectionButtonText,
                foodAdded && styles.foodSelectionButtonTextSelected
              ]}>
                {foodAdded ? '✓ Food added!' : 'Tap to add food'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonCancel} 
                onPress={() => {
                  console.log('[HomeScreen] ❌ Food modal cancelled');
                  setShowFoodModal(false);
                  setFoodAdded(false);
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButtonSave} 
                onPress={handleSaveFood}
              >
                <Text style={styles.modalButtonTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* NEW: Exercise Modal */}
      <Modal
        visible={showExerciseModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowExerciseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {exerciseType ? 'Update Exercise' : 'Add Exercise'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {exerciseType 
                ? `Current: ${exerciseType === 'starting' ? 'About to start' : 'Already completed'} ${lastExerciseTime ? 'at ' + new Date(lastExerciseTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}`
                : 'Click to add exercise'
              }
            </Text>
            
            <View style={styles.exerciseSelectionContainer}>
              <TouchableOpacity 
                style={[
                  styles.exerciseSelectionButton,
                  selectedExerciseOption === 'starting' && styles.exerciseSelectionButtonSelected
                ]}
                onPress={() => setSelectedExerciseOption('starting')}
              >
                <Text style={[
                  styles.exerciseSelectionButtonText,
                  selectedExerciseOption === 'starting' && styles.exerciseSelectionButtonTextSelected
                ]}>
                  About to start exercise
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.exerciseSelectionButton,
                  selectedExerciseOption === 'completed' && styles.exerciseSelectionButtonSelected
                ]}
                onPress={() => setSelectedExerciseOption('completed')}
              >
                <Text style={[
                  styles.exerciseSelectionButtonText,
                  selectedExerciseOption === 'completed' && styles.exerciseSelectionButtonTextSelected
                ]}>
                  I already exercised
                </Text>
              </TouchableOpacity>
              
              {exerciseType && (
                <Text 
                  style={[
                    styles.exerciseRemoveText,
                    selectedExerciseOption === null && styles.exerciseRemoveTextSelected
                  ]}
                  onPress={() => setSelectedExerciseOption(null)}
                >
                  Remove exercise entry
                </Text>
              )}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonCancel} 
                onPress={() => {
                  console.log('[HomeScreen] ❌ Exercise modal cancelled');
                  setShowExerciseModal(false);
                  setSelectedExerciseOption(null);
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButtonSave} 
                onPress={handleSaveExercise}
              >
                <Text style={styles.modalButtonTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* NEW: Exercise Time Modal */}
      <Modal
        visible={showExerciseTimeModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowExerciseTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Exercise Timing</Text>
            <Text style={styles.modalSubtitle}>
              How long ago?
            </Text>
            
            <View style={styles.timeButtonGrid}>
              {[1, 2, 3, 4, 5, 6].map((hours) => (
                <TouchableOpacity
                  key={hours}
                  style={styles.timeButton}
                  onPress={() => handleSaveCompletedExercise(hours)}
                >
                  <Text style={styles.timeButtonText}>{hours}h</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity 
              style={styles.modalButtonCancel} 
              onPress={() => {
                console.log('[HomeScreen] ❌ Exercise time modal cancelled');
                setShowExerciseTimeModal(false);
                setSelectedExerciseOption(null);
              }}
            >
              <Text style={styles.modalButtonTextCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CaffScore Info Modal */}
      <Modal
        visible={showFocusInfoModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowFocusInfoModal(false)}
      >
                <View style={styles.modalOverlay}>
          <View style={styles.focusModalContent}>
            <View style={styles.focusModalHeader}>
              <Text style={styles.modalTitle}>CaffScore Guide</Text>
            </View>
            
            <ScrollView style={styles.focusModalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.infoText}>
                Shows your current focus potential from caffeine based on what's actively in your system right now.
              </Text>
              
              {/* What Score Changes Mean */}
              <Text style={styles.sectionTitle}>📈 Score Going UP</Text>
              <Text style={styles.trendDescription}>
                • Recent caffeine consumption being absorbed{'\n'}
                • Caffeine levels rising in your system{'\n'}
                • Active drinks reaching peak effect{'\n'}
                • Current stimulation increasing
              </Text>
              
              <Text style={styles.sectionTitle}>📉 Score Going DOWN</Text>
              <Text style={styles.trendDescription}>
                • Caffeine naturally leaving your system{'\n'}
                • Half-life elimination in progress{'\n'}
                • Effects wearing off from earlier drinks{'\n'}
                • Current stimulation decreasing
              </Text>
              
              {/* Extreme Scores */}
              <Text style={styles.sectionTitle}>🎯 Perfect Score (100)</Text>
              <Text style={styles.extremeDescription}>
                Peak caffeine effect right now - ideal levels actively stimulating your system
              </Text>
              
              <Text style={styles.sectionTitle}>🚫 Zero Score (0)</Text>
              <Text style={styles.extremeDescription}>
                No active caffeine effect - either no caffeine consumed or completely metabolized
              </Text>

              {/* Status Messages Guide */}
              <Text style={styles.sectionTitle}>📍 Status Messages</Text>
              <Text style={styles.trendDescription}>
                <Text style={styles.statusExample}>🔴 Rising:</Text> "Caffeine being absorbed" → "Caffeine levels rising" → "Peak caffeine effect active"{'\n\n'}
                <Text style={styles.statusExample}>🔵 Declining:</Text> "Caffeine leaving your system" → "Effects wearing off"{'\n\n'}
                <Text style={styles.statusExample}>⚪ Stable:</Text> Previous status preserved when score doesn't change{'\n\n'}
                <Text style={styles.statusExample}>⚫ Zero:</Text> "No active caffeine detected"
              </Text>

             </ScrollView>
            
            <View style={styles.focusModalFooter}>
              <TouchableOpacity 
                style={styles.infoCloseButton} 
                onPress={() => setShowFocusInfoModal(false)}
              >
                <Text style={styles.infoCloseButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.canvas,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl * 5, // Extra padding for keyboard
  },
  title: {
    ...Theme.fonts.bigTitle,
    fontSize: 42, // Made larger
    color: Theme.colors.textPrimary,
    textAlign: 'center',
  },
  mascotContainer: {
    marginBottom: Theme.spacing.lg,
  },
  mascotImage: {
    width: 120,
    height: 144,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  scoreNumber: {
    fontSize: 72,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  progressBarContainer: {
    marginBottom: Theme.spacing.sm,
  },
  progressBarBackground: {
    width: width - (Theme.spacing.lg * 2),
    height: 8,
    backgroundColor: Theme.colors.cardBg,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreLabel: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    textTransform: 'lowercase',
  },
  hintText: {
    ...Theme.fonts.caption,
    color: Theme.colors.textTertiary,
    fontSize: 10,
    textAlign: 'center',
  },
  // Status styles
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.primaryBlue,
    marginRight: Theme.spacing.xs,
  },
  statusDotPulsing: {
    shadowColor: Theme.colors.primaryBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  statusText: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  // Score navigation container
  scoreNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
  },
  // Score switching indicators
  scoreIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: Theme.spacing.xs / 2,
  },
  activeIndicator: {
    backgroundColor: Theme.colors.primaryBlue,
  },
  inactiveIndicator: {
    backgroundColor: Theme.colors.cardBg,
  },
  arrowButton: {
    padding: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.small,
    backgroundColor: 'transparent',
  },
  arrowText: {
    fontSize: 18,
    color: Theme.colors.primaryBlue,
    fontWeight: '600',
  },
  addDrinkSection: {
    alignItems: 'center',
  },
  addButton: {
    width: 60,
    height: 60,
    backgroundColor: Theme.colors.primaryBlue,
    borderRadius: Theme.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.colors.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonText: {
    fontSize: 32,
    fontWeight: '300',
    color: Theme.colors.white,
  },
  addDrinkLabel: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.sm,
  },
  timerSection: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 48,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  sippingLabel: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  doneButton: {
    width: 50,
    height: 50,
    backgroundColor: Theme.colors.primaryGreen,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.colors.primaryGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  doneButtonText: {
    fontSize: 24,
    color: Theme.colors.white,
  },
  cancelButton: {
    width: 50,
    height: 50,
    backgroundColor: Theme.colors.accentRed,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.colors.accentRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  cancelButtonText: {
    fontSize: 24,
    color: Theme.colors.white,
    fontWeight: '300',
  },
  drinkNameSection: {
    alignItems: 'center',
    marginTop: Theme.spacing.md,
  },
  drinkNameInput: {
    backgroundColor: Theme.colors.cardBg,
    borderRadius: Theme.borderRadius.large,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    ...Theme.fonts.body,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xs,
    minWidth: 120,
  },
  inputLabel: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
  },
  followUpSection: {
    width: '100%',
    alignItems: 'center',
  },
  questionContainer: {
    width: '100%',
    marginBottom: Theme.spacing.lg,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questionText: {
    ...Theme.fonts.body,
    color: Theme.colors.textPrimary,
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  smallTextInput: {
    backgroundColor: Theme.colors.cardBg,
    borderRadius: Theme.borderRadius.small,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    ...Theme.fonts.body,
    color: Theme.colors.textPrimary,
    width: 80,
    textAlign: 'center',
  },
  sliderContainer: {
    alignItems: 'center',
    marginTop: Theme.spacing.sm,
  },
  sliderWrapper: {
    position: 'relative',
    width: width - (Theme.spacing.lg * 2),
    paddingTop: 25, // Reduced to bring percentage closer to slider
  },
  percentageText: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    width: 50,
  },
  slider: {
    width: width - (Theme.spacing.lg * 2),
    height: 20,
  },
  customTimeInput: {
    fontSize: 48,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
    backgroundColor: 'transparent',
    marginTop: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
  },
  recordSection: {
    alignItems: 'center',
    marginTop: Theme.spacing.sm, // Reduced from md to bring it closer
  },
  recordButton: {
    width: 50,
    height: 50,
    backgroundColor: Theme.colors.primaryGreen,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.colors.primaryGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  recordButtonIcon: {
    fontSize: 24,
    color: Theme.colors.white,
  },
  recordLabel: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.sm,
  },
  // Drinks of the day styles
  drinksOfDaySection: {
    width: '100%',
    marginTop: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.md,
    alignItems: 'flex-start', // Left align the entire section
  },
  drinksOfDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: Theme.spacing.md,
  },
  drinksOfDayTitle: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textSecondary,
    textAlign: 'left', // Left align the title
    textTransform: 'lowercase',
  },
  drinksOfDayDate: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textTertiary,
    textTransform: 'lowercase',
  },
  drinkItem: {
    width: '100%', // Full width to match progress bar
    backgroundColor: Theme.colors.cardBg,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    shadowColor: Theme.colors.textTertiary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  drinkItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  drinkName: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    flex: 1,
  },
  drinkTime: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    fontWeight: '500',
  },
  drinkCaffeine: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
  },
  drinkItemDeleting: {
    backgroundColor: Theme.colors.accentRed,
  },
  deleteConfirmContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
  },
  deleteConfirmText: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.white,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Daily caffeine progress bar styles
  dailyCaffeineContainer: {
    width: '100%',
    marginTop: Theme.spacing.lg,
  },
  dailyProgressBarContainer: {
    marginBottom: Theme.spacing.xs,
  },
  dailyProgressBarBackground: {
    width: '100%', // Same width as drink items
    height: 6, // Skinnier than the main progress bar (was 8)
    backgroundColor: Theme.colors.cardBg,
    borderRadius: 3,
    overflow: 'hidden',
  },
  dailyProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  dailyCaffeineLabel: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    textAlign: 'left',
  },
  
  // Header styles
  header: {
    flexDirection: 'row', // Changed to row for horizontal layout
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: Theme.spacing.lg,
    paddingHorizontal: 0, // Remove padding to allow buttons at edges
  },
  
  // Left Column for Sleep and Stress
  leftColumn: {
    flexDirection: 'column',
    alignItems: 'center', // Center align buttons in column
    paddingLeft: Theme.spacing.sm, // Minimal padding from screen edge
  },
  
  // Center Column for Title
  centerColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingTop: Theme.spacing.sm, // Small padding to center with buttons
    paddingHorizontal: Theme.spacing.md, // More padding from buttons
  },
  
  // Right Column for Food and Exercise
  rightColumn: {
    flexDirection: 'column',
    alignItems: 'center', // Center align buttons in column
    paddingRight: Theme.spacing.sm, // Minimal padding from screen edge
  },
  
  headerSpacer: {
    width: 80, // Same width as sleep button for centering
  },
  
  // Tracking button styles
  trackingButton: {
    backgroundColor: Theme.colors.cardBg,
    padding: Theme.spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 60, // Smaller size
    height: 60, // Smaller size
  },
  trackingButtonAlert: {
    backgroundColor: '#FFE5E5', // Light red background
  },
  trackingEmoji: {
    fontSize: 24, // Slightly smaller emoji
  },
  trackingText: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    fontSize: 11,
    marginTop: 4,
  },
  trackingTextAlert: {
    color: Theme.colors.accentRed,
  },
  
  // Button label styles
  buttonLabel: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    fontSize: 11,
    marginTop: Theme.spacing.xs,
    maxWidth: 70, // Constrain width for wrapping
  },
  buttonLabelAlert: {
    color: Theme.colors.accentRed,
  },
  
  alertIcon: {
    color: Theme.colors.accentRed,
    fontWeight: 'bold',
    fontSize: 12,
  },
  
  // Score label with info icon
  scoreLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButton: {
    marginLeft: Theme.spacing.xs,
    padding: 2,
  },
  infoIcon: {
    fontSize: 14,
    color: Theme.colors.textTertiary,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Theme.colors.canvas,
    borderRadius: 16,
    padding: Theme.spacing.xl,
    margin: Theme.spacing.lg,
    width: width - (Theme.spacing.lg * 2),
    maxWidth: 340,
  },
  modalTitle: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
  },
  modalSubtitle: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
  
  // Sleep input styles
  sleepInput: {
    backgroundColor: Theme.colors.cardBg,
    borderRadius: 12,
    padding: Theme.spacing.md,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
    color: Theme.colors.textPrimary,
  },
  
  // Modal buttons
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Theme.spacing.md,
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: Theme.colors.cardBg,
    borderRadius: 12,
    padding: Theme.spacing.md,
    alignItems: 'center',
  },
  modalButtonSave: {
    flex: 1,
    backgroundColor: Theme.colors.primaryBlue,
    borderRadius: 12,
    padding: Theme.spacing.md,
    alignItems: 'center',
  },
  modalButtonTextCancel: {
    ...Theme.fonts.button,
    color: Theme.colors.textSecondary,
  },
  modalButtonTextSave: {
    ...Theme.fonts.button,
    color: 'white',
  },
  
  // Info modal styles
  infoText: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.md,
    lineHeight: 22,
  },
  infoFactors: {
    ...Theme.fonts.body,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.lg,
    lineHeight: 24,
  },
  infoFooter: {
    ...Theme.fonts.caption,
    color: Theme.colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
  infoCloseButton: {
    backgroundColor: Theme.colors.primaryBlue,
    borderRadius: 12,
    padding: Theme.spacing.md,
    alignItems: 'center',
  },
  infoCloseButtonText: {
    ...Theme.fonts.button,
    color: 'white',
  },
  testingContainer: {
    marginTop: Theme.spacing.xl,
    marginBottom: Theme.spacing.lg,
    alignItems: 'center',
  },
  testingButton: {
    backgroundColor: Theme.colors.accentOrange,
    borderRadius: Theme.borderRadius.medium,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    opacity: 0.7,
  },
  testingButtonText: {
    ...Theme.fonts.body,
    color: Theme.colors.white,
    fontSize: 12,
  },
  focusModalContent: {
    backgroundColor: Theme.colors.canvas,
    borderRadius: 10,
    paddingTop: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: 20,
    margin: Theme.spacing.lg,
    maxHeight: '85%',
    width: '90%',
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'space-between',
  },
  focusModalHeader: {
    paddingBottom: Theme.spacing.md,
  },
  focusModalScroll: {
    flex: 1,
  },
  focusModalFooter: {
    paddingTop: Theme.spacing.md,
  },
  scoreZoneContainer: {
    marginVertical: Theme.spacing.md,
  },
  scoreZone: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: Theme.spacing.md,
  },
  scoreZoneText: {
    flex: 1,
  },
  scoreRange: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  scoreDescription: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    fontSize: 13,
  },
  sectionTitle: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
  },
  trendDescription: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: Theme.spacing.sm,
  },
  extremeDescription: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: Theme.spacing.sm,
    fontStyle: 'italic',
  },
  algorithmNote: {
    ...Theme.fonts.body,
    color: Theme.colors.textTertiary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: Theme.spacing.md,
    textAlign: 'center',
  },
  statusExample: {
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },

  // NEW: Stress button styles
  stressButtonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  stressButton: {
    width: (width - (Theme.spacing.lg * 2) - Theme.spacing.md) / 3 - 10, // Adjust for spacing
    height: 50,
    backgroundColor: Theme.colors.cardBg,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
    marginHorizontal: 5,
  },
  stressButtonSelected: {
    backgroundColor: Theme.colors.primaryBlue,
  },
  stressButtonText: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    fontSize: 16,
  },
  stressButtonTextSelected: {
    color: 'white',
  },

  // NEW: Food button styles
  foodSelectionButton: {
    width: '100%',
    height: 50, // Made smaller/less thick
    backgroundColor: Theme.colors.cardBg,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  foodSelectionButtonSelected: {
    backgroundColor: Theme.colors.primaryGreen,
    borderColor: Theme.colors.primaryGreen,
  },
  foodSelectionButtonText: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  foodSelectionButtonTextSelected: {
    color: 'white',
  },

  // NEW: Exercise selection styles
  exerciseSelectionContainer: {
    flexDirection: 'column',
    width: '100%',
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    gap: Theme.spacing.md,
  },
  exerciseSelectionButton: {
    width: '100%',
    height: 50,
    backgroundColor: Theme.colors.cardBg,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  exerciseSelectionButtonSelected: {
    backgroundColor: Theme.colors.primaryBlue,
    borderColor: Theme.colors.primaryBlue,
  },
  exerciseSelectionButtonText: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  exerciseSelectionButtonTextSelected: {
    color: 'white',
  },

  // NEW: Time button styles
  timeButtonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  timeButton: {
    width: (width - (Theme.spacing.lg * 2) - Theme.spacing.md) / 3 - 10, // Adjust for spacing
    height: 50,
    backgroundColor: Theme.colors.cardBg,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
    marginHorizontal: 5,
  },
  timeButtonText: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    fontSize: 16,
  },

  // Button with label container
  buttonWithLabel: {
    alignItems: 'center',
    marginBottom: Theme.spacing.md, // Space between button groups
  },
  dateSubheading: {
    ...Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: Theme.spacing.xs,
  },
  // Exercise remove text styles (replaces button)
  exerciseRemoveText: {
    ...Theme.fonts.body,
    color: Theme.colors.accentRed,
    fontSize: 16,
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.md,
  },
  exerciseRemoveTextSelected: {
    color: Theme.colors.accentRed,
    fontWeight: 'bold',
  },
}); 