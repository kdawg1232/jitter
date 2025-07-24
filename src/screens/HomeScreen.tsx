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
import { 
  AddDrinkWorkflowState, 
  DrinkFromDatabase, 
  SearchDrinkData, 
  getInitialAddDrinkState, 
  parseCSVToDrinkDatabase, 
  filterDrinks, 
  calculateCaffeineFromSearchDrink, 
  createDrinkRecordFromSearchData,
  createDrinkRecordFromCustomData,
  formatTimeFromDigits,
  toggleDrinkFavorite,
  getFavoritedDrinks,
  TIME_AGO_OPTIONS 
} from './addadrink';
import { getDrinksDatabase } from '../data/drinksDatabase';

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
  const [mealTimes, setMealTimes] = useState<Date[]>([]);
  const lastMealTime = mealTimes.length ? mealTimes[mealTimes.length - 1] : null;
  const [last24HourMealTimes, setLast24HourMealTimes] = useState<Date[]>([]);
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
  
  // NEW: Meal timing state (similar to exercise)
  const [selectedMealOption, setSelectedMealOption] = useState<'just_ate' | 'ate_earlier' | 'remove' | null>(null);
  const [showMealTimeModal, setShowMealTimeModal] = useState(false);
  const [selectedMealHoursAgo, setSelectedMealHoursAgo] = useState<number | null>(null);
  const [customMealTime, setCustomMealTime] = useState('');
  
  // Info modal state
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showFocusInfoModal, setShowFocusInfoModal] = useState(false);
  
  // Delete confirmation state
  const [deletingDrinkId, setDeletingDrinkId] = useState<string | null>(null);
  
  // NEW: Add drink workflow state
  const [addDrinkState, setAddDrinkState] = useState<AddDrinkWorkflowState>(getInitialAddDrinkState());
  const [drinkDatabase, setDrinkDatabase] = useState<DrinkFromDatabase[]>([]);
  
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
      
      // Load today's meal times
      if (profile) {
        const todayMeals = await StorageService.getTodayMealTimes(profile.userId);
        setMealTimes(todayMeals);
        setFoodButtonState(todayMeals.length ? 'added' : 'default');
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

  // Load drink database
  const loadDrinkDatabase = async () => {
    try {
      const drinks = getDrinksDatabase();
      
      // Load favorited drinks from storage
      const savedFavorites = await AsyncStorage.getItem('favorited_drinks');
      const favoritedNames = savedFavorites ? JSON.parse(savedFavorites) : [];
      
      // Mark drinks as favorited based on saved data
      const drinksWithFavorites = drinks.map(drink => ({
        ...drink,
        isFavorited: favoritedNames.includes(drink.name)
      }));
      
      setDrinkDatabase(drinksWithFavorites);
      
      // Update the add drink state with favorited drinks
      const favorited = getFavoritedDrinks(drinksWithFavorites);
      setAddDrinkState(prev => ({ ...prev, favoritedDrinks: favorited }));
      
      console.log('[HomeScreen] ☕ Loaded', drinks.length, 'drinks from database,', favorited.length, 'favorited');
    } catch (error) {
      console.error('[HomeScreen] ❌ Error loading drink database:', error);
      // Set empty array as fallback
      setDrinkDatabase([]);
    }
  };

  // Save favorited drinks to storage
  const saveFavoritedDrinks = async (drinks: DrinkFromDatabase[]) => {
    try {
      const favoritedNames = drinks.filter(d => d.isFavorited).map(d => d.name);
      await AsyncStorage.setItem('favorited_drinks', JSON.stringify(favoritedNames));
    } catch (error) {
      console.error('[HomeScreen] ❌ Error saving favorited drinks:', error);
    }
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
      
      // Load drink database
      await loadDrinkDatabase();
      
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
    setAddDrinkState(prev => ({ ...prev, showThreeButtons: true }));
  };

  // NEW: Handle the three button selection
  const handleQuickAdd = () => {
    if (addDrinkState.favoritedDrinks.length === 0) {
      // If no favorited drinks, show alert and go back to search
      alert('No favorited drinks yet! Please search for drinks and star your favorites.');
      setAddDrinkState(prev => ({ ...prev, showThreeButtons: false }));
      return;
    }
    
    setAddDrinkState(prev => ({ 
      ...prev, 
      showThreeButtons: false,
      showQuickAddModal: true 
    }));
  };

  const handleSearchFromDrink = () => {
    setAddDrinkState(prev => ({ 
      ...prev, 
      showThreeButtons: false,
      showSearchModal: true,
      filteredDrinks: drinkDatabase 
    }));
  };

  const handleAddCustomDrink = () => {
    setAddDrinkState(prev => ({ 
      ...prev, 
      showThreeButtons: false,
      showCustomDrinkModal: true 
    }));
  };

  // NEW: Handle search modal functions
  const handleSearchQueryChange = (query: string) => {
    const filtered = filterDrinks(drinkDatabase, query);
    setAddDrinkState(prev => ({ 
      ...prev, 
      searchQuery: query,
      filteredDrinks: filtered 
    }));
  };

  const handleSelectDrink = (drink: DrinkFromDatabase) => {
    setAddDrinkState(prev => ({ 
      ...prev,
      searchDrinkData: {
        ...prev.searchDrinkData,
        selectedDrink: drink
      }
    }));
  };

  // NEW: Handle toggling drink favorite status
  const handleToggleFavorite = async (drink: DrinkFromDatabase) => {
    const updatedDatabase = toggleDrinkFavorite(drinkDatabase, drink);
    const updatedFiltered = toggleDrinkFavorite(addDrinkState.filteredDrinks, drink);
    const favorited = getFavoritedDrinks(updatedDatabase);
    
    setDrinkDatabase(updatedDatabase);
    setAddDrinkState(prev => ({ 
      ...prev, 
      filteredDrinks: updatedFiltered,
      favoritedDrinks: favorited 
    }));
    
    // Save to storage
    await saveFavoritedDrinks(updatedDatabase);
  };

  const handleSearchModalCancel = () => {
    setAddDrinkState(prev => ({ 
      ...prev, 
      showSearchModal: false,
      searchQuery: '',
      filteredDrinks: drinkDatabase,
      searchDrinkData: {
        ...prev.searchDrinkData,
        selectedDrink: null,
        sipDuration: '00:05:00',
        sipDurationDigits: ''
      }
    }));
  };

  const handleSearchModalConfirm = () => {
    if (!addDrinkState.searchDrinkData.selectedDrink) return;
    
    setAddDrinkState(prev => ({ 
      ...prev, 
      showSearchModal: false,
      showQuestionsModal: true 
    }));
  };

  // NEW: Handle quick add modal functions
  const handleQuickAddModalCancel = () => {
    setAddDrinkState(prev => ({ 
      ...prev, 
      showQuickAddModal: false,
      searchDrinkData: {
        ...prev.searchDrinkData,
        selectedDrink: null,
        sipDuration: '00:05:00',
        sipDurationDigits: ''
      }
    }));
  };

  const handleQuickAddModalConfirm = () => {
    if (!addDrinkState.searchDrinkData.selectedDrink) return;
    
    setAddDrinkState(prev => ({ 
      ...prev, 
      showQuickAddModal: false,
      showQuestionsModal: true 
    }));
  };

  // NEW: Handle custom drink modal functions
  const handleCustomDrinkModalCancel = () => {
    setAddDrinkState(getInitialAddDrinkState());
  };

  const handleRecordCustomDrink = async () => {
    if (!userProfile) return;

    try {
      const drinkRecord = createDrinkRecordFromCustomData(
        addDrinkState.customDrinkData,
        userProfile.userId
      );

      console.log('[HomeScreen] ☕ Recording custom drink:', drinkRecord);

      // Save to storage
      await StorageService.addDrinkRecord(drinkRecord);

      // Update state
      if (userProfile) {
        const updatedTodaysDrinks = await StorageService.getDrinksToday(userProfile.userId);
        const updatedLast24HoursDrinks = await StorageService.getDrinksLast24Hours(userProfile.userId);
        setTodaysDrinks(updatedTodaysDrinks);
        setLast24HoursDrinks(updatedLast24HoursDrinks);
        
        const newTotal = calculateTotalCaffeine(updatedTodaysDrinks);
        setTotalDailyCaffeine(newTotal);
      }

      // Update CaffScore and other services
      await calculateCaffScore();
      
      if (userProfile) {
        await WidgetService.updateWidgetData(userProfile.userId);
        await PlanningService.reactToDrinkLogged(userProfile.userId, drinkRecord);
        await updateStatsCalculations(userProfile.userId);
      }

      // Reset state
      setAddDrinkState(getInitialAddDrinkState());

      console.log('[HomeScreen] ✅ Custom drink recorded successfully');
    } catch (error) {
      console.error('[HomeScreen] ❌ Error recording custom drink:', error);
    }
  };

  // NEW: Handle questions modal functions
  const handleQuestionsModalCancel = () => {
    setAddDrinkState(getInitialAddDrinkState());
  };

  // NEW: Handle time input changes (right-to-left like original)
  const handleSipDurationChange = (text: string) => {
    const newDigits = text.replace(/\D/g, '');
    
    if (newDigits.length > addDrinkState.searchDrinkData.sipDurationDigits.length) {
      const addedDigit = newDigits.slice(-1);
      const updatedDigits = (addDrinkState.searchDrinkData.sipDurationDigits + addedDigit).slice(-6);
      const formattedTime = formatTimeFromDigits(updatedDigits);
      
      setAddDrinkState(prev => ({
        ...prev,
        searchDrinkData: {
          ...prev.searchDrinkData,
          sipDurationDigits: updatedDigits,
          sipDuration: formattedTime
        }
      }));
    } else {
      const formattedTime = formatTimeFromDigits(newDigits);
      setAddDrinkState(prev => ({
        ...prev,
        searchDrinkData: {
          ...prev.searchDrinkData,
          sipDurationDigits: newDigits,
          sipDuration: formattedTime
        }
      }));
    }
  };

  const handleRecordSearchDrink = async () => {
    if (!userProfile || !addDrinkState.searchDrinkData.selectedDrink) return;

    try {
      const drinkRecord = createDrinkRecordFromSearchData(
        addDrinkState.searchDrinkData,
        userProfile.userId
      );

      console.log('[HomeScreen] ☕ Recording search-based drink:', drinkRecord);

      // Save to storage
      await StorageService.addDrinkRecord(drinkRecord);

      // Update state
      if (userProfile) {
        const updatedTodaysDrinks = await StorageService.getDrinksToday(userProfile.userId);
        const updatedLast24HoursDrinks = await StorageService.getDrinksLast24Hours(userProfile.userId);
        setTodaysDrinks(updatedTodaysDrinks);
        setLast24HoursDrinks(updatedLast24HoursDrinks);
        
        const newTotal = calculateTotalCaffeine(updatedTodaysDrinks);
        setTotalDailyCaffeine(newTotal);
      }

      // Update CaffScore and other services
      await calculateCaffScore();
      
      if (userProfile) {
        await WidgetService.updateWidgetData(userProfile.userId);
        await PlanningService.reactToDrinkLogged(userProfile.userId, drinkRecord);
        await updateStatsCalculations(userProfile.userId);
      }

      // Reset state
      setAddDrinkState(getInitialAddDrinkState());

      console.log('[HomeScreen] ✅ Search-based drink recorded successfully');
    } catch (error) {
      console.error('[HomeScreen] ❌ Error recording search-based drink:', error);
    }
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
  const handleFoodPress = async () => {
    try {
      console.log('[HomeScreen] 🍽️ Food button pressed');
      // Reset meal selection state
      setSelectedMealOption(null);
      setSelectedMealHoursAgo(null);
      setCustomMealTime('');
      
      // Load last 24 hour meal times for display
      if (userProfile) {
        const last24hMeals = await StorageService.getLast24HourMealTimes(userProfile.userId);
        setLast24HourMealTimes(last24hMeals);
      }
      
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

  // NEW: Save meal based on selected option
  const handleSaveFood = async () => {
    console.log('[HomeScreen] 🔄 handleSaveFood invoked with option:', selectedMealOption);

    // Always close the main food modal first
    setShowFoodModal(false);

    // CASE 1: User chose to remove entry
    if (selectedMealOption === 'remove') {
      setTimeout(async () => {
        try {
          setFoodButtonState('default');
          setMealTimes([]);
          setLast24HourMealTimes([]); // Clear the recent meals display

          if (userProfile) {
            // Clear meal records from storage for today
            await StorageService.clearMealTimesForDate(userProfile.userId);
            
            // Clear the last food log date
            await AsyncStorage.removeItem('last_food_log_date');
            setLastFoodLogDate(null);
            setNeedsFoodUpdate(true);
          }
          console.log('[HomeScreen] ✅ Meal entry removed successfully');
        } catch (err) {
          console.error('[HomeScreen] ❌ Error removing meal entry:', err);
        } finally {
          setSelectedMealOption(null);
        }
      }, 0);
      return;
    }

    // CASE 2: User chose "just ate" - record meal now
    if (selectedMealOption === 'just_ate') {
      setTimeout(async () => {
        try {
          const now = new Date();
          setFoodButtonState('added');

          if (userProfile) {
            await StorageService.addMealTime(userProfile.userId, now);
            await AsyncStorage.setItem('last_food_log_date', new Date().toISOString().split('T')[0]);

            // Refresh local meal times state
            const updatedMeals = await StorageService.getTodayMealTimes(userProfile.userId);
            setMealTimes(updatedMeals);

            setLastFoodLogDate(new Date().toISOString().split('T')[0]);
            setNeedsFoodUpdate(false);
            console.log('[HomeScreen] ✅ Recent meal recorded successfully');
          }
        } catch (err) {
          console.error('[HomeScreen] ❌ Error recording recent meal:', err);
        } finally {
          setSelectedMealOption(null);
        }
      }, 0);
      return;
    }

    // CASE 3: User chose "ate earlier" - show time selection modal
    if (selectedMealOption === 'ate_earlier') {
      setShowMealTimeModal(true);
      return;
    }

    // If no valid option selected, just close
    console.log('[HomeScreen] ⚠️ No meal option selected');
  };

  // NEW: Save meal time from time selection modal
  const handleSaveMealTime = async () => {
    console.log('[HomeScreen] 🔄 handleSaveMealTime invoked with hours ago:', selectedMealHoursAgo);

    // Close time modal
    setShowMealTimeModal(false);

    // Defer heavy work
    setTimeout(async () => {
      try {
        let hoursAgo: number;

        if (selectedMealHoursAgo !== null) {
          // User selected a preset option
          hoursAgo = selectedMealHoursAgo;
        } else if (customMealTime) {
          // User entered custom time
          const parsed = parseFloat(customMealTime);
          if (isNaN(parsed) || parsed < 0 || parsed > 24) {
            console.error('[HomeScreen] ❌ Invalid custom meal time:', customMealTime);
            // Could show an alert here for user feedback
            return;
          }
          hoursAgo = parsed;
        } else {
          console.error('[HomeScreen] ❌ No meal time selected');
          return;
        }

        // Calculate actual meal time
        const now = new Date();
        const mealTime = new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000));
        
        setFoodButtonState('added');

        if (userProfile) {
          await StorageService.addMealTime(userProfile.userId, mealTime);
          await AsyncStorage.setItem('last_food_log_date', new Date().toISOString().split('T')[0]);

          // Refresh local meal times state
          const updatedMeals = await StorageService.getTodayMealTimes(userProfile.userId);
          setMealTimes(updatedMeals);

          setLastFoodLogDate(new Date().toISOString().split('T')[0]);
          setNeedsFoodUpdate(false);
          
          console.log('[HomeScreen] ✅ Past meal recorded successfully:', {
            hoursAgo,
            mealTime: mealTime.toISOString()
          });
        }
      } catch (err) {
        console.error('[HomeScreen] ❌ Error recording past meal:', err);
      } finally {
        // Reset state
        setSelectedMealOption(null);
        setSelectedMealHoursAgo(null);
        setCustomMealTime('');
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
  const getPercentageTextPosition = (percentage?: number) => {
    // Increased padding to prevent thumb cutoff
    const horizontalPadding = Theme.spacing.lg; // Increased from md
    const sliderWidth = width - (Theme.spacing.lg * 2) - (horizontalPadding * 2);
    const percentageValue = percentage !== undefined ? percentage : completionPercentage;
    const thumbPosition = (percentageValue / 100) * sliderWidth;
    const textWidth = 50; // Approximate width of percentage text
    const leftPosition = Math.max(0, Math.min(sliderWidth - textWidth, thumbPosition - textWidth / 2));
    return leftPosition + horizontalPadding; // Use the increased padding
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
        const todayMeals = await StorageService.getTodayMealTimes(userProfile.userId);
        setMealTimes(todayMeals);
        setFoodButtonState(todayMeals.length ? 'added' : 'default');
        
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
                  <Image source={require('../../assets/sleepicon.png')} style={styles.trackingIcon} />
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
                  <Image source={require('../../assets/stressicon.png')} style={styles.trackingIcon} />
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
                  <Image source={require('../../assets/mealicon.png')} style={styles.trackingIcon} />
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
                  <Image source={require('../../assets/bikeicon.png')} style={styles.trackingIcon} />
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
              {!addDrinkState.showThreeButtons ? (
                <View style={styles.addDrinkSection}>
                  <TouchableOpacity style={styles.addButton} onPress={handleAddDrink}>
                    <Text style={styles.addButtonText}>+</Text>
                  </TouchableOpacity>
                  <Text style={styles.addDrinkLabel}>add a drink</Text>
                </View>
              ) : (
                <View style={styles.threeButtonsSection}>
                  <View style={styles.buttonOption}>
                    <TouchableOpacity style={styles.optionButton} onPress={handleSearchFromDrink}>
                      <Text style={styles.addButtonText}>+</Text>
                    </TouchableOpacity>
                    <Text style={styles.optionLabel}>search for drink</Text>
                  </View>
                  
                  <View style={styles.buttonOption}>
                    <TouchableOpacity style={styles.optionButton} onPress={handleQuickAdd}>
                      <Text style={styles.addButtonText}>+</Text>
                    </TouchableOpacity>
                    <Text style={styles.optionLabel}>quick add</Text>
                  </View>
                  
                  <View style={styles.buttonOption}>
                    <TouchableOpacity style={styles.optionButton} onPress={handleAddCustomDrink}>
                      <Text style={styles.addButtonText}>+</Text>
                    </TouchableOpacity>
                    <Text style={styles.optionLabel}>add custom drink</Text>
                  </View>
                </View>
              )}
              
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
                            <View style={styles.drinkItemFooter}>
                              <Text style={styles.drinkCaffeine}>
                                {drink.actualCaffeineConsumed}mg caffeine consumed
                              </Text>
                              <Text style={styles.drinkTimestamp}>
                                {drink.timestamp.toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </Text>
                            </View>
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
            <Text style={styles.modalTitle}>Add Food</Text>
            <Text style={styles.modalSubtitle}>
              {last24HourMealTimes.length > 0 
                ? `Recent meals (24h): ${last24HourMealTimes.slice(0, 3).map(t => new Date(t).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})).join(', ')}${last24HourMealTimes.length > 3 ? '...' : ''}`
                : 'No recent meals in last 24 hours'
              }
            </Text>
            
            <View style={styles.exerciseSelectionContainer}>
              <TouchableOpacity 
                style={[
                  styles.exerciseSelectionButton,
                  selectedMealOption === 'just_ate' && styles.exerciseSelectionButtonSelected
                ]}
                onPress={() => setSelectedMealOption('just_ate')}
              >
                <Text style={[
                  styles.exerciseSelectionButtonText,
                  selectedMealOption === 'just_ate' && styles.exerciseSelectionButtonTextSelected
                ]}>
                  Just ate (0-30 min ago)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.exerciseSelectionButton,
                  selectedMealOption === 'ate_earlier' && styles.exerciseSelectionButtonSelected
                ]}
                onPress={() => setSelectedMealOption('ate_earlier')}
              >
                <Text style={[
                  styles.exerciseSelectionButtonText,
                  selectedMealOption === 'ate_earlier' && styles.exerciseSelectionButtonTextSelected
                ]}>
                  Ate earlier (choose time)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.exerciseSelectionButton,
                  selectedMealOption === 'remove' && styles.exerciseSelectionButtonSelected
                ]}
                onPress={() => setSelectedMealOption('remove')}
              >
                <Text style={[
                  styles.exerciseSelectionButtonText,
                  selectedMealOption === 'remove' && styles.exerciseSelectionButtonTextSelected
                ]}>
                  Remove meal entry
                </Text>
              </TouchableOpacity>
            </View>
            
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

      {/* NEW: Meal Time Selection Modal */}
      <Modal
        visible={showMealTimeModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowMealTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>When did you eat?</Text>
            <Text style={styles.modalSubtitle}>Select how long ago you had your meal</Text>
            
            <View style={styles.exerciseSelectionContainer}>
              <TouchableOpacity 
                style={[
                  styles.exerciseSelectionButton,
                  selectedMealHoursAgo === 0.5 && styles.exerciseSelectionButtonSelected
                ]}
                onPress={() => setSelectedMealHoursAgo(0.5)}
              >
                <Text style={[
                  styles.exerciseSelectionButtonText,
                  selectedMealHoursAgo === 0.5 && styles.exerciseSelectionButtonTextSelected
                ]}>
                  30 minutes ago
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.exerciseSelectionButton,
                  selectedMealHoursAgo === 1 && styles.exerciseSelectionButtonSelected
                ]}
                onPress={() => setSelectedMealHoursAgo(1)}
              >
                <Text style={[
                  styles.exerciseSelectionButtonText,
                  selectedMealHoursAgo === 1 && styles.exerciseSelectionButtonTextSelected
                ]}>
                  1 hour ago
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.exerciseSelectionButton,
                  selectedMealHoursAgo === 2 && styles.exerciseSelectionButtonSelected
                ]}
                onPress={() => setSelectedMealHoursAgo(2)}
              >
                <Text style={[
                  styles.exerciseSelectionButtonText,
                  selectedMealHoursAgo === 2 && styles.exerciseSelectionButtonTextSelected
                ]}>
                  2 hours ago
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.exerciseSelectionButton,
                  selectedMealHoursAgo === 3 && styles.exerciseSelectionButtonSelected
                ]}
                onPress={() => setSelectedMealHoursAgo(3)}
              >
                <Text style={[
                  styles.exerciseSelectionButtonText,
                  selectedMealHoursAgo === 3 && styles.exerciseSelectionButtonTextSelected
                ]}>
                  3 hours ago
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.exerciseSelectionButton,
                  selectedMealHoursAgo === 4 && styles.exerciseSelectionButtonSelected
                ]}
                onPress={() => setSelectedMealHoursAgo(4)}
              >
                <Text style={[
                  styles.exerciseSelectionButtonText,
                  selectedMealHoursAgo === 4 && styles.exerciseSelectionButtonTextSelected
                ]}>
                  4 hours ago
                </Text>
              </TouchableOpacity>
            </View>

            {/* Custom time input */}
            <View style={styles.exerciseSelectionContainer}>
              <Text style={styles.modalSubtitle}>Or enter custom time (hours ago):</Text>
              <TextInput
                style={styles.customTimeInput}
                value={customMealTime}
                onChangeText={setCustomMealTime}
                placeholder="e.g., 1.5"
                keyboardType="decimal-pad"
                maxLength={4}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonCancel} 
                onPress={() => {
                  console.log('[HomeScreen] ❌ Meal time modal cancelled');
                  setShowMealTimeModal(false);
                  setSelectedMealHoursAgo(null);
                  setCustomMealTime('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButtonSave} 
                onPress={handleSaveMealTime}
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
              
              {/* CaffScore Ranges */}
              <Text style={styles.sectionTitle}>🎯 Score Ranges</Text>
              <View style={styles.scoreRangeItem}>
                <Text style={styles.scoreRangeText}>
                  <Text style={[styles.scoreRangeNumber, { color: Theme.colors.primaryGreen }]}>80-100</Text>
                  <Text style={styles.scoreRangeLabel}> Peak Effect</Text>
                </Text>
                <Text style={styles.scoreRangeDescription}>
                  Optimal caffeine levels - maximum focus and alertness
                </Text>
              </View>
              
              <View style={styles.scoreRangeItem}>
                <Text style={styles.scoreRangeText}>
                  <Text style={[styles.scoreRangeNumber, { color: Theme.colors.primaryBlue }]}>50-79</Text>
                  <Text style={styles.scoreRangeLabel}> Moderate Effect</Text>
                </Text>
                <Text style={styles.scoreRangeDescription}>
                  Good caffeine levels - noticeable focus enhancement
                </Text>
              </View>
              
              <View style={styles.scoreRangeItem}>
                <Text style={styles.scoreRangeText}>
                  <Text style={[styles.scoreRangeNumber, { color: Theme.colors.accentOrange }]}>25-49</Text>
                  <Text style={styles.scoreRangeLabel}> Low Effect</Text>
                </Text>
                <Text style={styles.scoreRangeDescription}>
                  Low caffeine levels - mild stimulation present
                </Text>
              </View>
              
              <View style={styles.scoreRangeItem}>
                <Text style={styles.scoreRangeText}>
                  <Text style={[styles.scoreRangeNumber, { color: Theme.colors.accentRed }]}>0-24</Text>
                  <Text style={styles.scoreRangeLabel}> Minimal Effect</Text>
                </Text>
                <Text style={styles.scoreRangeDescription}>
                  Very low or no caffeine levels - little stimulation
                </Text>
              </View>
              
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

      {/* NEW: Search Drink Modal */}
      <Modal
        visible={addDrinkState.showSearchModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleSearchModalCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.searchModalContent}>
            <Text style={styles.modalTitle}>Search for Drink</Text>
            
            <TextInput
              style={styles.searchInput}
              placeholder="Search drinks..."
              placeholderTextColor={Theme.colors.textTertiary}
              value={addDrinkState.searchQuery}
              onChangeText={handleSearchQueryChange}
              autoFocus={true}
            />
            
            <ScrollView style={styles.drinksListContainer} showsVerticalScrollIndicator={false}>
              {addDrinkState.filteredDrinks.map((drink, index) => (
                <View key={index} style={styles.drinkListItemContainer}>
                  <TouchableOpacity
                    style={[
                      styles.drinkListItem,
                      addDrinkState.searchDrinkData.selectedDrink?.name === drink.name && styles.drinkListItemSelected
                    ]}
                    onPress={() => handleSelectDrink(drink)}
                  >
                    <View style={styles.drinkListItemHeader}>
                      <Text style={styles.drinkListItemName}>{drink.name}</Text>
                      <Text style={styles.drinkListItemFlOz}>{drink.flOz} fl oz</Text>
                    </View>
                    <Text style={styles.drinkListItemCaffeine}>
                      {drink.caffeineMg}mg caffeine ({drink.mgPerFlOz} mg/fl oz)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.starButton}
                    onPress={() => handleToggleFavorite(drink)}
                  >
                    <Text style={[
                      styles.starIcon,
                      drink.isFavorited && styles.starIconFavorited
                    ]}>
                      ★
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            
            <View style={styles.searchModalButtons}>
              <TouchableOpacity style={styles.searchCancelButton} onPress={handleSearchModalCancel}>
                <Text style={styles.cancelButtonText}>✕</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.searchConfirmButton,
                  !addDrinkState.searchDrinkData.selectedDrink && styles.searchConfirmButtonDisabled
                ]} 
                onPress={handleSearchModalConfirm}
                disabled={!addDrinkState.searchDrinkData.selectedDrink}
              >
                <Text style={styles.confirmButtonText}>✓</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* NEW: Quick Add Modal */}
      <Modal
        visible={addDrinkState.showQuickAddModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleQuickAddModalCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.searchModalContent}>
            <Text style={styles.modalTitle}>Quick Add</Text>
            <Text style={styles.modalSubtitle}>Select from your favorited drinks</Text>
            
            <ScrollView style={styles.drinksListContainer} showsVerticalScrollIndicator={false}>
              {addDrinkState.favoritedDrinks.map((drink, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.drinkListItem,
                    styles.quickAddDrinkItem, // Add spacing for quick add modal
                    addDrinkState.searchDrinkData.selectedDrink?.name === drink.name && styles.drinkListItemSelected
                  ]}
                  onPress={() => handleSelectDrink(drink)}
                >
                  <View style={styles.drinkListItemHeader}>
                    <Text style={styles.drinkListItemName}>{drink.name}</Text>
                    <Text style={styles.drinkListItemFlOz}>{drink.flOz} fl oz</Text>
                  </View>
                  <Text style={styles.drinkListItemCaffeine}>
                    {drink.caffeineMg}mg caffeine ({drink.mgPerFlOz} mg/fl oz)
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.searchModalButtons}>
              <TouchableOpacity style={styles.searchCancelButton} onPress={handleQuickAddModalCancel}>
                <Text style={styles.cancelButtonText}>✕</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.searchConfirmButton,
                  !addDrinkState.searchDrinkData.selectedDrink && styles.searchConfirmButtonDisabled
                ]} 
                onPress={handleQuickAddModalConfirm}
                disabled={!addDrinkState.searchDrinkData.selectedDrink}
              >
                <Text style={styles.confirmButtonText}>✓</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* NEW: Custom Drink Modal */}
      <Modal
        visible={addDrinkState.showCustomDrinkModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCustomDrinkModalCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.questionsModalContent}>
            <Text style={styles.modalTitle}>Add Custom Drink</Text>
            
            <ScrollView style={styles.questionsScrollContainer} showsVerticalScrollIndicator={false}>
              {/* Drink Name */}
              <View style={styles.questionSectionNew}>
                <Text style={styles.questionTextNew}>what's the drink name?</Text>
                <TextInput
                  style={styles.drinkNameInputModal}
                  placeholder="Coffee, Tea, etc."
                  placeholderTextColor={Theme.colors.textTertiary}
                  value={addDrinkState.customDrinkData.drinkName}
                  onChangeText={(text) => setAddDrinkState(prev => ({
                    ...prev,
                    customDrinkData: { ...prev.customDrinkData, drinkName: text }
                  }))}
                  autoFocus={true}
                />
              </View>

              {/* Caffeine Amount */}
              <View style={styles.questionSectionNew}>
                <Text style={styles.questionTextNew}>how much caffeine was in the drink?</Text>
                <View style={styles.questionRow}>
                  <TextInput
                    style={styles.caffeineInputModal}
                    placeholder="mg"
                    placeholderTextColor={Theme.colors.textTertiary}
                    value={addDrinkState.customDrinkData.caffeineAmount}
                    onChangeText={(text) => setAddDrinkState(prev => ({
                      ...prev,
                      customDrinkData: { ...prev.customDrinkData, caffeineAmount: text }
                    }))}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Sip Duration */}
              <View style={styles.questionSectionNew}>
                <Text style={styles.questionTextNew}>how long did you sip for?</Text>
                <TextInput
                  style={styles.sipDurationInput}
                  value={formatTimeFromDigits(addDrinkState.customDrinkData.sipDurationDigits)}
                  onChangeText={(text) => {
                    const digits = text.replace(/\D/g, '');
                    const formattedTime = formatTimeFromDigits(digits);
                    setAddDrinkState(prev => ({
                      ...prev,
                      customDrinkData: {
                        ...prev.customDrinkData,
                        sipDurationDigits: digits,
                        sipDuration: formattedTime
                      }
                    }));
                  }}
                  keyboardType="numeric"
                />
              </View>

              {/* Time Ago */}
              <View style={styles.questionSectionNew}>
                <Text style={styles.questionTextNew}>how long ago did you finish?</Text>
                <View style={styles.timeAgoButtonsContainer}>
                  {TIME_AGO_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.hours}
                      style={[
                        styles.timeAgoButton,
                        addDrinkState.customDrinkData.hoursAgo === option.hours && styles.timeAgoButtonSelected
                      ]}
                      onPress={() => setAddDrinkState(prev => ({
                        ...prev,
                        customDrinkData: { ...prev.customDrinkData, hoursAgo: option.hours }
                      }))}
                    >
                      <Text style={[
                        styles.timeAgoButtonText,
                        addDrinkState.customDrinkData.hoursAgo === option.hours && styles.timeAgoButtonTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Completion Percentage */}
              <View style={styles.questionSectionNew}>
                <Text style={styles.questionTextNew}>how much of the drink did you complete?</Text>
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderWrapper}>
                    <Text style={[
                      styles.percentageText,
                      {
                        position: 'absolute',
                        left: getPercentageTextPosition(addDrinkState.customDrinkData.completionPercentage),
                        top: -5,
                        zIndex: 1
                      }
                    ]}>
                      {Math.round(addDrinkState.customDrinkData.completionPercentage)}%
                    </Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={100}
                      value={addDrinkState.customDrinkData.completionPercentage}
                      onValueChange={(value) => setAddDrinkState(prev => ({
                        ...prev,
                        customDrinkData: { ...prev.customDrinkData, completionPercentage: value }
                      }))}
                      step={1}
                      minimumTrackTintColor={Theme.colors.primaryBlue}
                      maximumTrackTintColor={Theme.colors.cardBg}
                      thumbTintColor={Theme.colors.primaryBlue}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.questionsModalButtons}>
              <TouchableOpacity style={styles.searchCancelButton} onPress={handleCustomDrinkModalCancel}>
                <Text style={styles.cancelButtonText}>✕</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.searchConfirmButton} onPress={handleRecordCustomDrink}>
                <Text style={styles.confirmButtonText}>✓</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* NEW: Questions Modal */}
      <Modal
        visible={addDrinkState.showQuestionsModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleQuestionsModalCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.questionsModalContent}>
            <Text style={styles.modalTitle}>Drink Details</Text>
            
            {addDrinkState.searchDrinkData.selectedDrink && (
              <Text style={styles.selectedDrinkName}>
                {addDrinkState.searchDrinkData.selectedDrink.name}
              </Text>
            )}
            
            <ScrollView style={styles.questionsScrollContainer} showsVerticalScrollIndicator={false}>
              {/* How many oz did you drink? */}
              <View style={styles.questionSectionNew}>
                <Text style={styles.questionTextNew}>how many oz is your drink?</Text>
                <TextInput
                  style={styles.ouncesInput}
                  placeholder="fl oz"
                  placeholderTextColor={Theme.colors.textTertiary}
                  value={addDrinkState.searchDrinkData.ouncesConsumed}
                  onChangeText={(text) => setAddDrinkState(prev => ({
                    ...prev,
                    searchDrinkData: { ...prev.searchDrinkData, ouncesConsumed: text }
                  }))}
                  keyboardType="decimal-pad"
                />
              </View>

                             {/* How long did you sip for? */}
               <View style={styles.questionSectionNew}>
                 <Text style={styles.questionTextNew}>how long did you sip for?</Text>
                 <TextInput
                   style={styles.sipDurationInput}
                   value={addDrinkState.searchDrinkData.sipDuration}
                   onChangeText={handleSipDurationChange}
                   keyboardType="numeric"
                   placeholder="00:00:00"
                   placeholderTextColor={Theme.colors.textTertiary}
                   selection={{ 
                     start: addDrinkState.searchDrinkData.sipDuration.length, 
                     end: addDrinkState.searchDrinkData.sipDuration.length 
                   }}
                   selectTextOnFocus={false}
                 />
               </View>

              {/* How long ago did you finish? */}
              <View style={styles.questionSectionNew}>
                <Text style={styles.questionTextNew}>how long ago did you finish?</Text>
                <View style={styles.timeAgoButtonsContainer}>
                  {TIME_AGO_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.hours}
                      style={[
                        styles.timeAgoButton,
                        addDrinkState.searchDrinkData.hoursAgo === option.hours && styles.timeAgoButtonSelected
                      ]}
                      onPress={() => setAddDrinkState(prev => ({
                        ...prev,
                        searchDrinkData: { ...prev.searchDrinkData, hoursAgo: option.hours }
                      }))}
                    >
                      <Text style={[
                        styles.timeAgoButtonText,
                        addDrinkState.searchDrinkData.hoursAgo === option.hours && styles.timeAgoButtonTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* How much of the drink did you complete? */}
              <View style={styles.questionSectionNew}>
                <Text style={styles.questionTextNew}>how much of the drink did you complete?</Text>
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderWrapper}>
                    <Text style={[
                      styles.percentageText,
                      {
                        position: 'absolute',
                        left: getPercentageTextPosition(addDrinkState.searchDrinkData.completionPercentage),
                        top: -5,
                        zIndex: 1
                      }
                    ]}>
                      {Math.round(addDrinkState.searchDrinkData.completionPercentage)}%
                    </Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={100}
                      value={addDrinkState.searchDrinkData.completionPercentage}
                      onValueChange={(value) => setAddDrinkState(prev => ({
                        ...prev,
                        searchDrinkData: { ...prev.searchDrinkData, completionPercentage: value }
                      }))}
                      step={1}
                      minimumTrackTintColor={Theme.colors.primaryBlue}
                      maximumTrackTintColor={Theme.colors.cardBg}
                      thumbTintColor={Theme.colors.primaryBlue}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.questionsModalButtons}>
              <TouchableOpacity style={styles.searchCancelButton} onPress={handleQuestionsModalCancel}>
                <Text style={styles.cancelButtonText}>✕</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.searchConfirmButton} onPress={handleRecordSearchDrink}>
                <Text style={styles.confirmButtonText}>✓</Text>
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
  // Three buttons section styles
  threeButtonsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: Theme.spacing.md,
  },
  buttonOption: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: Theme.spacing.xs,
  },
  optionButton: {
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
  optionLabel: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.sm,
    textAlign: 'center',
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
    paddingHorizontal: Theme.spacing.lg, // Increased from md to prevent thumb cutoff
  },
  percentageText: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    width: 50,
  },
  slider: {
    width: width - (Theme.spacing.lg * 2) - (Theme.spacing.lg * 2), // Adjusted for increased padding
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
  drinkItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  drinkTimestamp: {
    ...Theme.fonts.caption,
    color: Theme.colors.textTertiary,
    textAlign: 'right',
  },
  drinkCaffeine: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    flex: 1,
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
  trackingIcon: {
    width: 24,
    height: 24,
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

  // NEW: Search modal styles
  searchModalContent: {
    backgroundColor: Theme.colors.canvas,
    borderRadius: 16,
    padding: Theme.spacing.lg,
    margin: Theme.spacing.lg,
    width: width - (Theme.spacing.lg * 2),
    maxWidth: 400,
    maxHeight: '80%',
  },
  searchInput: {
    backgroundColor: Theme.colors.cardBg,
    borderRadius: 12,
    padding: Theme.spacing.md,
    fontSize: 16,
    marginBottom: Theme.spacing.md,
    color: Theme.colors.textPrimary,
  },
  drinksListContainer: {
    maxHeight: 300,
    marginBottom: Theme.spacing.lg,
  },
  drinkListItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  drinkListItem: {
    backgroundColor: Theme.colors.cardBg,
    borderRadius: 12,
    padding: Theme.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    flex: 1,
    marginRight: Theme.spacing.sm,
  },
  drinkListItemSelected: {
    borderColor: Theme.colors.primaryBlue,
    backgroundColor: Theme.colors.primaryBlue + '20',
  },
  quickAddDrinkItem: {
    marginRight: 0, // Remove right margin for quick add modal
    marginBottom: Theme.spacing.md, // Add bottom margin for spacing between items
  },
  drinkListItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  drinkListItemName: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    flex: 1,
  },
  drinkListItemFlOz: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
  },
  drinkListItemCaffeine: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
  },
  searchModalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Theme.spacing.md,
  },
  searchCancelButton: {
    width: 50,
    height: 50,
    backgroundColor: Theme.colors.accentRed,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchConfirmButton: {
    width: 50,
    height: 50,
    backgroundColor: Theme.colors.primaryGreen,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchConfirmButtonDisabled: {
    backgroundColor: Theme.colors.cardBg,
  },
  confirmButtonText: {
    fontSize: 24,
    color: Theme.colors.white,
  },
  starButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.cardBg,
    borderRadius: 20,
  },
  starIcon: {
    fontSize: 16,
    color: Theme.colors.textTertiary,
  },
  starIconFavorited: {
    color: Theme.colors.accentOrange,
  },

  // NEW: Questions modal styles
  questionsModalContent: {
    backgroundColor: Theme.colors.canvas,
    borderRadius: 16,
    padding: Theme.spacing.lg,
    margin: Theme.spacing.lg,
    width: width - (Theme.spacing.lg * 2),
    maxWidth: 400,
    maxHeight: '85%',
  },
  selectedDrinkName: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.primaryBlue,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
  questionsScrollContainer: {
    maxHeight: 400,
    marginBottom: Theme.spacing.lg,
  },
  questionSectionNew: {
    marginBottom: Theme.spacing.lg,
  },
  questionTextNew: {
    ...Theme.fonts.body,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  ouncesInput: {
    backgroundColor: Theme.colors.cardBg,
    borderRadius: 12,
    padding: Theme.spacing.md,
    fontSize: 16,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
  },
  sipDurationInput: {
    fontSize: 48,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
    backgroundColor: 'transparent',
    textAlign: 'center',
    marginTop: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
  },
  timeAgoButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  timeAgoButton: {
    backgroundColor: Theme.colors.cardBg,
    borderRadius: 8,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeAgoButtonSelected: {
    backgroundColor: Theme.colors.primaryBlue,
    borderColor: Theme.colors.primaryBlue,
  },
  timeAgoButtonText: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
  },
  timeAgoButtonTextSelected: {
    color: Theme.colors.white,
  },
  questionsModalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Theme.spacing.md,
  },
  
  // NEW: Custom drink modal styles
  drinkNameInputModal: {
    backgroundColor: Theme.colors.cardBg,
    borderRadius: 12,
    padding: Theme.spacing.md,
    fontSize: 16,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
  },
  caffeineInputModal: {
    backgroundColor: Theme.colors.cardBg,
    borderRadius: 12,
    padding: Theme.spacing.md,
    fontSize: 16,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    width: 120,
  },
  scoreRangeItem: {
    marginBottom: Theme.spacing.sm,
  },
  scoreRangeText: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    fontSize: 16,
  },
  scoreRangeLabel: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    fontSize: 14,
  },
  scoreRangeDescription: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    fontSize: 12,
  },
  scoreRangeNumber: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    fontSize: 16,
  },
}); 