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
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { Theme } from '../theme/colors';
import { UserProfile, DrinkRecord, FocusResult } from '../types';
import { StorageService, CaffScoreService, ValidationService, WidgetService, DeepLinkService, PlanningService, NotificationService } from '../services';

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
  const [caffResult, setCaffResult] = useState<FocusResult | null>(null); // Full CaffScore result for status detection
  const [previousCaffScore, setPreviousCaffScore] = useState(0); // Track previous score to detect trends
  const [previousCaffeineStatus, setPreviousCaffeineStatus] = useState<string>(""); // Track status changes for notifications
  const [lastNotificationSent, setLastNotificationSent] = useState<string>(""); // Prevent duplicate notifications
  const [currentCaffeineStatus, setCurrentCaffeineStatus] = useState<string>("No active caffeine detected"); // Current status for UI display
  const [isInitialStatusLoad, setIsInitialStatusLoad] = useState<boolean>(true); // Track if this is initial load vs actual change
  const [pendingNotificationTimeout, setPendingNotificationTimeout] = useState<NodeJS.Timeout | null>(null); // Track pending notification
  const [isAppReturningFromBackground, setIsAppReturningFromBackground] = useState<boolean>(false); // Track app state transitions
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState<boolean>(false); // Track if initial data loading is complete
  
  // Sleep tracking state
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [tempSleepHours, setTempSleepHours] = useState('');
  const [needsSleepUpdate, setNeedsSleepUpdate] = useState(false);
  const [lastSleepLogDate, setLastSleepLogDate] = useState<string | null>(null);
  
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
      await checkSleepStatus();
      
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
      
      // Calculate CaffScore using the real algorithm (sleep data retrieved internally)
      const result = await CaffScoreService.calculateFocusScore(
        userProfile,
        last24HoursDrinks // Use 24-hour drinks for algorithm accuracy
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
      
      // Persist current score as previous score for next app session
      await StorageService.savePreviousCaffScore(userProfile.userId, newScore);
      
      // Update previous score state for next calculation
      setPreviousCaffScore(newScore);
      
      // Calculate status with correct previous score from storage
      const status = calculateCaffeineStatusDirect(result, newScore, loadedPreviousScore);
      setCurrentCaffeineStatus(status);
    } catch (error) {
      console.error('[HomeScreen] ❌ Error calculating CaffScore:', error);
      setCaffScore(0);
      setCaffResult(null);
    }
  };

  // Calculate dynamic caffeine status based on CaffScore range + trend (simplified approach)
  const calculateCaffeineStatus = (): string => {
    // Factor 1: CaffScore range
    const scoreRange = caffScore === 0 ? 'none' : 
                      caffScore < 25 ? 'low' : 
                      caffScore < 80 ? 'medium' : 'high';

    // Factor 2: CaffScore trend - only update if score actually changed
    const scoreDifference = caffScore - previousCaffScore;
    
    // If score hasn't changed, keep the previous state
    if (scoreDifference === 0) {
      console.log('[HomeScreen] 🎯 Score unchanged, keeping previous state:', {
        currentScore: caffScore,
        previousScore: previousCaffScore,
        currentStatus: currentCaffeineStatus
      });
      return currentCaffeineStatus;
    }

    const trend = scoreDifference > 0 ? 'rising' : 'declining';

    console.log('[HomeScreen] 🎯 Status calculation factors:', {
      currentScore: caffScore,
      previousScore: previousCaffScore,
      scoreDifference: scoreDifference.toFixed(3),
      scoreRange,
      trend
    });

    let finalStatus: string;
    let triggerReason: string;

    // Map range + trend to the 6 states
    if (scoreRange === 'none') {
      finalStatus = "No active caffeine detected";
      triggerReason = "Score = 0";
    } else if (scoreRange === 'low' && trend === 'declining') {
      finalStatus = "Effects wearing off";
      triggerReason = "Low score + declining";
    } else if (scoreRange === 'medium' && trend === 'declining') {
      finalStatus = "Caffeine leaving your system";
      triggerReason = "Medium score + declining";
    } else if (scoreRange === 'high' && trend === 'declining') {
      finalStatus = "Caffeine leaving your system";
      triggerReason = "High score + declining";
    } else if (scoreRange === 'low' && trend === 'rising') {
      finalStatus = "Caffeine being absorbed";
      triggerReason = "Low score + rising";
    } else if (scoreRange === 'medium' && trend === 'rising') {
      finalStatus = "Caffeine levels rising";
      triggerReason = "Medium score + rising";
    } else if (scoreRange === 'high' && trend === 'rising') {
      finalStatus = "Peak caffeine effect active";
      triggerReason = "High score + rising";
    } else {
      // Fallback (shouldn't happen with simplified logic)
      finalStatus = "Caffeine is present in your system";
      triggerReason = `${scoreRange} score + ${trend}`;
    }

    console.log('[HomeScreen] 🎯 Status determination (range + trend):', {
      finalStatus,
      triggerReason,
      scoreRange,
      trend
    });

    return finalStatus;
  };

  // Calculate status with direct values (for immediate updates) - range + trend approach
  const calculateCaffeineStatusDirect = (result: FocusResult, currentScore: number, prevScore: number): string => {
    // Factor 1: CaffScore range
    const scoreRange = currentScore === 0 ? 'none' : 
                      currentScore < 25 ? 'low' : 
                      currentScore < 80 ? 'medium' : 'high';

    // Factor 2: CaffScore trend - only update if score actually changed
    const scoreDifference = currentScore - prevScore;
    
    // If score hasn't changed, return stable status based on current range
    if (scoreDifference === 0) {
      console.log('[HomeScreen] 🎯 Score unchanged in DIRECT calculation:', {
        currentScore,
        prevScore,
        scoreRange,
        action: 'keeping stable status based on range'
      });
      
      // Return appropriate status based on current score range
      if (scoreRange === 'none') {
        return "No active caffeine detected";
      } else if (scoreRange === 'low') {
        return "Caffeine is present in your system";
      } else if (scoreRange === 'medium') {
        return "Caffeine is present in your system"; 
      } else { // high
        return "Peak caffeine effect active";
      }
    }

    const trend = scoreDifference > 0 ? 'rising' : 'declining';

    console.log('[HomeScreen] 🎯 Status calculation factors DIRECT:', {
      currentScore,
      prevScore,
      scoreDifference: scoreDifference.toFixed(3),
      scoreRange,
      trend
    });

    let finalStatus: string;
    let triggerReason: string;

    // Map range + trend to the 6 states
    if (scoreRange === 'none') {
      finalStatus = "No active caffeine detected";
      triggerReason = "Score = 0";
    } else if (scoreRange === 'low' && trend === 'declining') {
      finalStatus = "Effects wearing off";
      triggerReason = "Low score + declining";
    } else if (scoreRange === 'medium' && trend === 'declining') {
      finalStatus = "Caffeine leaving your system";
      triggerReason = "Medium score + declining";
    } else if (scoreRange === 'high' && trend === 'declining') {
      finalStatus = "Caffeine leaving your system";
      triggerReason = "High score + declining";
    } else if (scoreRange === 'low' && trend === 'rising') {
      finalStatus = "Caffeine being absorbed";
      triggerReason = "Low score + rising";
    } else if (scoreRange === 'medium' && trend === 'rising') {
      finalStatus = "Caffeine levels rising";
      triggerReason = "Medium score + rising";
    } else if (scoreRange === 'high' && trend === 'rising') {
      finalStatus = "Peak caffeine effect active";
      triggerReason = "High score + rising";
    } else {
      // Fallback (shouldn't happen with simplified logic)
      finalStatus = "Caffeine is present in your system";
      triggerReason = `${scoreRange} score + ${trend}`;
    }

    console.log('[HomeScreen] 🎯 Status determination DIRECT (range + trend):', {
      finalStatus,
      triggerReason,
      scoreRange,
      trend
    });

    return finalStatus;
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
        
        // Reload drinks data and previous score, then recalculate
        const todaysDrinksData = await StorageService.getDrinksToday(userProfile.userId);
        const last24HoursData = await StorageService.getDrinksLast24Hours(userProfile.userId);
        const prevScore = await StorageService.getPreviousCaffScore(userProfile.userId);
        
        setTodaysDrinks(todaysDrinksData);
        setLast24HoursDrinks(last24HoursData);
        setPreviousCaffScore(prevScore);
        
        // Update totals
        const newTotal = calculateTotalCaffeine(todaysDrinksData);
        setTotalDailyCaffeine(newTotal);
        
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

  // Update caffeine status when relevant data changes
  useEffect(() => {
    const newStatus = calculateCaffeineStatus();
    setCurrentCaffeineStatus(newStatus);
    
    // Mark initial load as complete after first status update
    if (isInitialStatusLoad) {
      setIsInitialStatusLoad(false);
      console.log('[HomeScreen] 🚀 Initial status load completed, future changes will trigger notifications');
    }
  }, [caffResult, caffScore, previousCaffScore, last24HoursDrinks, userProfile, isInitialStatusLoad]);

  // Handle notifications when status changes (separate from UI updates)
  useEffect(() => {
    // Skip notifications on initial load
    if (isInitialStatusLoad) {
      console.log('[HomeScreen] 🔇 Skipping notification on initial load');
      return;
    }

    // Skip notifications when app is returning from background
    if (isAppReturningFromBackground) {
      console.log('[HomeScreen] 🔇 Skipping notification - app returning from background');
      return;
    }

    // Skip if no real status change
    if (previousCaffeineStatus === currentCaffeineStatus) {
      console.log('[HomeScreen] ⚡ Caffeine status unchanged:', currentCaffeineStatus);
      return;
    }

    // Skip if this is the same status we already sent a notification for
    if (lastNotificationSent === currentCaffeineStatus) {
      console.log('[HomeScreen] 🔇 Notification already sent for status:', currentCaffeineStatus);
      return;
    }

    // Skip if no previous status (shouldn't happen after initial load, but safety check)
    if (previousCaffeineStatus === "") {
      console.log('[HomeScreen] 🔇 Skipping notification - no previous status to compare');
      return;
    }

    console.log('[HomeScreen] 🔔 Caffeine status changed:', {
      from: previousCaffeineStatus,
      to: currentCaffeineStatus,
      caffScore,
      timestamp: new Date().toISOString()
    });

    // Clear any pending notification
    if (pendingNotificationTimeout) {
      clearTimeout(pendingNotificationTimeout);
      console.log('[HomeScreen] ⏰ Cleared pending notification timeout');
    }

    // Set 5-second delay before sending notification
    const timeoutId = setTimeout(() => {
      console.log('[HomeScreen] ⏰ 5-second delay completed, sending notification for:', currentCaffeineStatus);
      
      // Trigger appropriate notification based on new status
      let notificationTriggered = false;
      switch (currentCaffeineStatus) {
        case "Caffeine levels rising":
          console.log('[HomeScreen] 📈 Triggering rising notification');
          NotificationService.scheduleCaffeineRisingNotification();
          notificationTriggered = true;
          break;
        case "Peak caffeine effect active":
          console.log('[HomeScreen] 🚀 Triggering peak notification');
          NotificationService.schedulePeakCaffeineNotification();
          notificationTriggered = true;
          break;
        case "Effects wearing off":
        case "Caffeine leaving your system":
          console.log('[HomeScreen] 📉 Triggering declining notification');
          NotificationService.scheduleCaffeineDecreasingNotification();
          notificationTriggered = true;
          break;
        case "No active caffeine detected":
          console.log('[HomeScreen] 💤 Triggering zero notification');
          NotificationService.scheduleCaffeineZeroNotification();
          notificationTriggered = true;
          // Reset notification state when caffeine drops to zero for next cycle
          setLastNotificationSent("");
          break;
        default:
          console.log('[HomeScreen] ℹ️ No notification for status:', currentCaffeineStatus);
          // No notifications for intermediate states like "being absorbed" or "leaving system"
      }
      
      // Update last notification sent to prevent duplicates
      if (notificationTriggered) {
        setLastNotificationSent(currentCaffeineStatus);
      }

      // Clear the timeout reference
      setPendingNotificationTimeout(null);
    }, 5000); // 5 second delay

    setPendingNotificationTimeout(timeoutId);
    console.log('[HomeScreen] ⏰ Notification scheduled for 5 seconds from now');

    // Update previous status for next comparison
    setPreviousCaffeineStatus(currentCaffeineStatus);
  }, [currentCaffeineStatus, previousCaffeineStatus, lastNotificationSent, caffScore, isInitialStatusLoad, pendingNotificationTimeout, isAppReturningFromBackground]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (pendingNotificationTimeout) {
        clearTimeout(pendingNotificationTimeout);
        console.log('[HomeScreen] 🧹 Cleared notification timeout on unmount');
      }
    };
  }, [pendingNotificationTimeout]);

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
    
    // Reset notification state for new caffeine cycle
    setLastNotificationSent("");
    // Clear any pending notification timeouts
    if (pendingNotificationTimeout) {
      clearTimeout(pendingNotificationTimeout);
      setPendingNotificationTimeout(null);
      console.log('[HomeScreen] ⏰ Cleared pending notification timeout due to new drink');
    }
    console.log('[HomeScreen] 🔔 Reset notification state for new caffeine cycle');
    
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

  // Check if today's sleep has been logged
  const checkSleepStatus = async () => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    try {
      // Check if sleep was logged today
      const lastLogDate = await AsyncStorage.getItem('last_sleep_log_date');
      setLastSleepLogDate(lastLogDate);
      
      if (lastLogDate !== today) {
        setNeedsSleepUpdate(true);
      } else {
        setNeedsSleepUpdate(false);
      }
    } catch (error) {
      console.error('Error checking sleep status:', error);
      setNeedsSleepUpdate(true); // Default to needing update on error
    }
  };

  // Handle sleep button press
  const handleSleepPress = () => {
    setTempSleepHours(lastNightSleep.toString());
    setShowSleepModal(true);
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
      
      setShowSleepModal(false);
      setTempSleepHours('');
    } catch (error) {
      console.error('[HomeScreen] ❌ Error saving sleep:', error);
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

  // Get color for caffeine status dot
  const getStatusDotColor = (status: string): string => {
    switch (status) {
      case "Caffeine being absorbed":
        return '#9C27B0'; // Purple
      case "Caffeine levels rising":
        return '#FFC107'; // Yellow
      case "Peak caffeine effect active":
        return Theme.colors.primaryGreen; // Green
      case "Caffeine leaving your system":
        return '#FF9800'; // Orange
      case "Effects wearing off":
        return Theme.colors.accentRed; // Red
      case "No active caffeine detected":
        return '#000000'; // Black
      case "Caffeine is present in your system":
        return '#666666'; // Gray for fallback
      default:
        return '#666666'; // Gray fallback
    }
  };

  // Animated value for pulsing dot
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Start pulsing animation
  useEffect(() => {
    const startPulse = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startPulse();
  }, []);

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
          {/* Header with Sleep Button */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={[
                styles.sleepButton,
                needsSleepUpdate && styles.sleepButtonAlert
              ]} 
              onPress={handleSleepPress}
            >
              <Text style={styles.sleepEmoji}>🌙</Text>
              <View style={styles.sleepTextContainer}>
                <Text style={[
                  styles.sleepText,
                  needsSleepUpdate && styles.sleepTextAlert
                ]}>
                  {lastNightSleep ? `${lastNightSleep}h` : 'add sleep'}
                  {needsSleepUpdate && <Text style={styles.alertIcon}> !</Text>}
                </Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.title}>jitter</Text>
            <View style={styles.headerSpacer} />
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
            
            {/* Caffeine status hint */}
            <View style={styles.statusContainer}>
              <Animated.View 
                style={[
                  styles.statusDot, 
                  { 
                    backgroundColor: getStatusDotColor(currentCaffeineStatus),
                    transform: [{ scale: pulseAnim }]
                  }
                ]} 
              />
              <Text style={styles.hintText}>
                {caffScore === 0 && todaysDrinks.length === 0
                  ? "Score increases with caffeine intake for optimal focus"
                  : currentCaffeineStatus
                }
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
              <Text style={styles.sectionTitle}>📱 Status Messages</Text>
              <Text style={styles.infoText}>
                Below your CaffScore, you'll see real-time status messages showing what's happening with your caffeine right now:
              </Text>
              
              <View style={styles.statusTable}>
                <View style={styles.statusRow}>
                  <View style={styles.statusRowHeader}>
                    <View style={[styles.modalStatusDot, { backgroundColor: '#9C27B0' }]} />
                    <Text style={styles.statusLabel}>"Caffeine being absorbed"</Text>
                  </View>
                  <Text style={styles.statusDescription}>Just drank something + levels rising</Text>
                </View>
                
                <View style={styles.statusRow}>
                  <View style={styles.statusRowHeader}>
                    <View style={[styles.modalStatusDot, { backgroundColor: '#FFC107' }]} />
                    <Text style={styles.statusLabel}>"Caffeine levels rising"</Text>
                  </View>
                  <Text style={styles.statusDescription}>Strong upward trend detected</Text>
                </View>
                
                <View style={styles.statusRow}>
                  <View style={styles.statusRowHeader}>
                    <View style={[styles.modalStatusDot, { backgroundColor: Theme.colors.primaryGreen }]} />
                    <Text style={styles.statusLabel}>"Peak caffeine effect active"</Text>
                  </View>
                  <Text style={styles.statusDescription}>High CaffScore (80+) + stable/rising</Text>
                </View>
                
                <View style={styles.statusRow}>
                  <View style={styles.statusRowHeader}>
                    <View style={[styles.modalStatusDot, { backgroundColor: '#FF9800' }]} />
                    <Text style={styles.statusLabel}>"Caffeine leaving your system"</Text>
                  </View>
                  <Text style={styles.statusDescription}>Clear declining trend</Text>
                </View>
                
                <View style={styles.statusRow}>
                  <View style={styles.statusRowHeader}>
                    <View style={[styles.modalStatusDot, { backgroundColor: Theme.colors.accentRed }]} />
                    <Text style={styles.statusLabel}>"Effects wearing off"</Text>
                  </View>
                  <Text style={styles.statusDescription}>Low levels + declining</Text>
                </View>
                
                <View style={styles.statusRow}>
                  <View style={styles.statusRowHeader}>
                    <View style={[styles.modalStatusDot, { backgroundColor: '#000000' }]} />
                    <Text style={styles.statusLabel}>"No active caffeine detected"</Text>
                  </View>
                  <Text style={styles.statusDescription}>Minimal/no active caffeine</Text>
                </View>
              </View>
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
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.lg,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: Theme.spacing.lg,
  },
  headerSpacer: {
    width: 80, // Same width as sleep button for centering
  },
  
  // Sleep button styles
  sleepButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.cardBg,
    borderRadius: 12,
    padding: Theme.spacing.sm,
    width: 80,
    minHeight: 60,
  },
  sleepButtonAlert: {
    backgroundColor: '#FFE6E6', // Light red background
  },
  sleepEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  sleepTextContainer: {
    alignItems: 'center',
  },
  sleepText: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  sleepTextAlert: {
    color: '#D32F2F', // Red text
    fontWeight: '600',
  },
  alertIcon: {
    color: '#D32F2F', // Red exclamation mark
    fontWeight: 'bold',
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
  statusTable: {
    marginVertical: Theme.spacing.md,
  },
  statusRow: {
    marginBottom: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.divider,
  },
  statusRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  modalStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Theme.spacing.sm,
  },
  statusLabel: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    fontSize: 14,
    flex: 1,
  },
  statusDescription: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 24, // Align with text above (12px dot + 12px margin)
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
}); 