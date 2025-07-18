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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { Theme } from '../theme/colors';
import { UserProfile, DrinkRecord, CrashRiskResult } from '../types';
import { StorageService, CrashRiskService, FocusScoreService, ValidationService } from '../services';

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
  const [crashRiskScore, setCrashRiskScore] = useState(0);
  
  // New state for crash risk calculation
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [lastNightSleep, setLastNightSleep] = useState<number>(7.5);
  const [crashRiskResult, setCrashRiskResult] = useState<CrashRiskResult | null>(null);
  const [isCalculatingRisk, setIsCalculatingRisk] = useState(false);
  
  // Score switching state
  const [activeScore, setActiveScore] = useState<'crash' | 'focus'>('focus');
  const [focusScore, setFocusScore] = useState(0); // Peak Focus Score
  
  // Sleep tracking state
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [tempSleepHours, setTempSleepHours] = useState('');
  const [needsSleepUpdate, setNeedsSleepUpdate] = useState(false);
  const [lastSleepLogDate, setLastSleepLogDate] = useState<string | null>(null);
  
  // Info modal state
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showFocusInfoModal, setShowFocusInfoModal] = useState(false);
  
  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const customTimeInputRef = useRef<TextInput>(null);

  // Handle score switching
  const handleScoreSwitch = () => {
    if (activeScore === 'focus') {
      setActiveScore('crash');
      console.log('[HomeScreen] 🔄 Switched to crash risk score');
    } else {
      setActiveScore('focus');
      console.log('[HomeScreen] 🔄 Switched to focus score');
    }
  };

  // Handle info modal based on active score
  const handleInfoPress = () => {
    if (activeScore === 'focus') {
      setShowFocusInfoModal(true);
    } else {
      setShowInfoModal(true);
    }
  };

  // Load user data and initialize
  const loadUserData = async () => {
    try {
      console.log('[HomeScreen] 🚀 Loading user data...');
      
      // Load user profile
      const profile = await StorageService.getUserProfile();
      setUserProfile(profile);
      
      // Load last night's sleep
      if (profile) {
        const sleepData = await StorageService.getLastNightSleep(profile.userId);
        setLastNightSleep(sleepData || 7.5);
        console.log('[HomeScreen] 😴 Last night sleep loaded:', sleepData || 7.5, 'hours');
      }
      
      // Load today's drinks (for display) and last 24 hours drinks (for crash risk calculation)
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

  // Calculate crash risk score using the real algorithm
  const updateCrashRiskScore = async () => {
    if (!userProfile) {
      console.log('[HomeScreen] ⚠️ No user profile, setting crash risk to 0');
      setCrashRiskScore(0);
      return;
    }

    try {
      console.log('[HomeScreen] 🎯 Starting crash risk calculation...');
      setIsCalculatingRisk(true);
      
      // Check cache first
      const cachedResult = await StorageService.getCrashRiskCache();
      if (cachedResult) {
        console.log('[HomeScreen] 💾 Using cached crash risk:', {
          score: cachedResult.score,
          cacheValidUntil: cachedResult.validUntil.toISOString(),
          currentTime: new Date().toISOString()
        });
        setCrashRiskResult(cachedResult);
        setCrashRiskScore(cachedResult.score);
        setIsCalculatingRisk(false);
        return;
      }

      console.log('[HomeScreen] 🧮 Calculating new crash risk with:', {
        userId: userProfile.userId,
        last24hDrinksCount: last24HoursDrinks.length,
        lastNightSleep,
        userAge: userProfile.age,
        userWeight: userProfile.weightKg
      });

      // Calculate new risk score (sleep data retrieved internally)
      const result = await CrashRiskService.calculateCrashRisk(
        userProfile,
        last24HoursDrinks
      );

      console.log('[HomeScreen] ✅ Crash risk calculated:', {
        score: result.score,
        currentCaffeineLevel: result.currentCaffeineLevel,
        peakCaffeineLevel: result.peakCaffeineLevel,
        factors: result.factors
      });

      console.log('[HomeScreen] 💥 Setting crash risk score state:', {
        oldScore: crashRiskScore,
        newScore: result.score,
        scoreChanged: crashRiskScore !== result.score
      });
      
      setCrashRiskResult(result);
      setCrashRiskScore(result.score);

      // Cache the result
      await StorageService.saveCrashRiskCache(result);
    } catch (error) {
      console.error('[HomeScreen] ❌ Error calculating crash risk:', error);
      setCrashRiskScore(0);
    } finally {
      setIsCalculatingRisk(false);
    }
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
      console.log('[HomeScreen] ✅ App initialization complete');
    };
    
    initializeData();
  }, []);

  // Recalculate crash risk when data changes
  useEffect(() => {
    console.log('[HomeScreen] 🔄 Crash risk useEffect triggered:', {
      hasUserProfile: !!userProfile,
      last24HoursDrinksCount: last24HoursDrinks.length,
      lastNightSleep,
      currentCrashRiskScore: crashRiskScore
    });
    
    if (userProfile && last24HoursDrinks.length >= 0) {
      updateCrashRiskScore();
    }
  }, [userProfile, last24HoursDrinks, lastNightSleep]);

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

  // Calculate real focus score using the algorithm
  const calculateFocusScore = async () => {
    if (!userProfile) {
      console.log('[HomeScreen] ⚠️ No user profile, setting focus score to 0');
      setFocusScore(0);
      return;
    }

    try {
      console.log('[HomeScreen] 🎯 Calculating focus score...');
      
      // Calculate focus score using the real algorithm (sleep data retrieved internally)
      const result = await FocusScoreService.calculateFocusScore(
        userProfile,
        last24HoursDrinks // Use 24-hour drinks for algorithm accuracy
      );

      console.log('[HomeScreen] ✅ Focus score calculated:', {
        score: result.score,
        currentCaffeineLevel: result.currentCaffeineLevel,
        factors: result.factors
      });

      console.log('[HomeScreen] 🎯 Setting focus score state:', {
        oldScore: focusScore,
        newScore: result.score,
        scoreChanged: focusScore !== result.score
      });
      
      setFocusScore(result.score);
    } catch (error) {
      console.error('[HomeScreen] ❌ Error calculating focus score:', error);
      setFocusScore(0);
    }
  };

  // Update focus score when relevant data changes
  useEffect(() => {
    console.log('[HomeScreen] 🔄 Focus score useEffect triggered:', {
      hasUserProfile: !!userProfile,
      last24HoursDrinksCount: last24HoursDrinks.length,
      currentFocusScore: focusScore
    });
    
    if (userProfile && last24HoursDrinks.length >= 0) {
      calculateFocusScore();
    }
  }, [userProfile, last24HoursDrinks]); // Sleep data retrieved internally by service

  // Get current score and color based on active view
  const getCurrentScore = () => {
    const score = activeScore === 'crash' ? crashRiskScore : focusScore;
    console.log('[HomeScreen] 📊 getCurrentScore called:', {
      activeScore,
      crashRiskScore,
      focusScore,
      returnedScore: score
    });
    return score;
  };
  const getCurrentScoreLabel = () => activeScore === 'crash' ? 'crash risk score' : 'peak focus score';
  
  // Calculate progress bar fill percentage and color
  const currentScore = getCurrentScore();
  const progressPercentage = Math.min(currentScore, 100);
  
  console.log('[HomeScreen] 🎨 Rendering with scores:', {
    activeScore,
    currentScore,
    progressPercentage,
    crashRiskScore,
    focusScore
  });
  const getProgressBarColor = () => {
    if (activeScore === 'focus') {
      // Focus score uses four-zone color scheme matching the guide
      if (currentScore >= 75) return Theme.colors.primaryGreen;   // 75-100: Peak Focus Zone (green)
      if (currentScore >= 50) return Theme.colors.primaryBlue;    // 50-75: Good Focus Zone (blue)  
      if (currentScore >= 25) return Theme.colors.accentOrange;   // 25-50: Building Focus Zone (orange)
      return Theme.colors.accentRed;                              // 0-25: Low Focus Zone (red)
    } else {
      // Crash risk uses original colors
      if (currentScore >= 75) return Theme.colors.accentRed;
      if (currentScore >= 50) return Theme.colors.accentOrange;
      return Theme.colors.primaryGreen;
    }
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
    
    // Clear cache to force recalculation
    console.log('[HomeScreen] 🗑️ Clearing crash risk cache after new drink');
    await StorageService.clearCrashRiskCache();
    
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
    
    // Update both crash risk and focus scores
    console.log('[HomeScreen] 🎯 Recalculating crash risk and focus scores...');
    await updateCrashRiskScore();
    await calculateFocusScore();
    
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
        const today = new Date().toISOString().split('T')[0];
        const sleepRecord = {
          userId: userProfile.userId,
          date: today,
          hoursSlept: sleepHours,
          source: 'manual' as const,
          createdAt: new Date(),
        };
        
        console.log('[HomeScreen] 💾 Saving sleep record for date:', today);
        await StorageService.addSleepRecord(sleepRecord);
        await AsyncStorage.setItem('last_sleep_log_date', today);
        
        setLastSleepLogDate(today);
        setNeedsSleepUpdate(false);
        
        // Clear crash risk cache to force recalculation
        console.log('[HomeScreen] 🗑️ Clearing crash risk cache to force recalculation');
        await StorageService.clearCrashRiskCache();
        await updateCrashRiskScore();
        await calculateFocusScore();
        
        console.log('[HomeScreen] ✅ Sleep saved successfully and both scores updated');
      }
      
      setShowSleepModal(false);
      setTempSleepHours('');
    } catch (error) {
      console.error('[HomeScreen] ❌ Error saving sleep:', error);
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
                  add sleep
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
              {(isCalculatingRisk && activeScore === 'crash') ? '...' : Math.round(currentScore)}
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
            
            {/* Score-specific hints (above navigation) */}
            {activeScore === 'focus' && (
              <Text style={styles.hintText}>
                {focusScore === 0 && todaysDrinks.length === 0
                  ? "Score increases with caffeine intake for optimal focus"
                  : "Predicts peak productivity in next 30-60 minutes"
                }
              </Text>
            )}
            {activeScore === 'crash' && (
              <Text style={styles.hintText}>
                {crashRiskScore === 0 && todaysDrinks.length > 0 
                  ? "Score increases as caffeine drops from peak levels"
                  : "Predicts energy crash risk in next 60-90 minutes"
                }
              </Text>
            )}
            
            {/* Score Navigation */}
            <View style={styles.scoreNavigation}>
              <TouchableOpacity 
                style={styles.arrowButton} 
                onPress={handleScoreSwitch}
              >
                <Text style={styles.arrowText}>◀</Text>
              </TouchableOpacity>
              
              <View style={styles.scoreIndicators}>
                <View style={[
                  styles.indicator, 
                  activeScore === 'focus' ? styles.activeIndicator : styles.inactiveIndicator
                ]} />
                <View style={[
                  styles.indicator, 
                  activeScore === 'crash' ? styles.activeIndicator : styles.inactiveIndicator
                ]} />
              </View>
              
              <TouchableOpacity 
                style={styles.arrowButton} 
                onPress={handleScoreSwitch}
              >
                <Text style={styles.arrowText}>▶</Text>
              </TouchableOpacity>
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
                  {todaysDrinks.map((drink) => (
                    <View key={drink.id} style={styles.drinkItem}>
                      <View style={styles.drinkItemHeader}>
                        <Text style={styles.drinkName}>{drink.name}</Text>
                        <Text style={styles.drinkTime}>{drink.timeToConsume}</Text>
                      </View>
                      <Text style={styles.drinkCaffeine}>
                        {drink.actualCaffeineConsumed}mg caffeine consumed
                      </Text>
                    </View>
                  ))}
                  
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
              
              <TouchableOpacity style={styles.doneButton} onPress={handleStopTimer}>
                <Text style={styles.doneButtonText}>✓</Text>
              </TouchableOpacity>
              
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
                <TouchableOpacity style={styles.recordButton} onPress={handleRecord}>
                  <Text style={styles.recordButtonIcon}>✓</Text>
                </TouchableOpacity>
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
            <Text style={styles.modalTitle}>Add Sleep</Text>
            <Text style={styles.modalSubtitle}>How many hours did you sleep last night?</Text>
            
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

      {/* Info Modal */}
      {/* Crash Risk Info Modal */}
      <Modal
        visible={showInfoModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>How Crash Risk Works</Text>
            
            <Text style={styles.infoText}>
              Your crash risk score predicts caffeine crashes in the next 60-90 minutes based on:
            </Text>
            
            <Text style={styles.infoFactors}>
              • Your caffeine intake timing and amount{'\n'}
              • Personal factors (age, weight, lifestyle){'\n'}
              • Sleep quality and patterns{'\n'}
              • Time of day and circadian rhythms{'\n'}
              • Your individual caffeine tolerance
            </Text>
            
            <Text style={styles.infoFooter}>
              The score becomes more accurate as you use the app consistently.
            </Text>
            
            <TouchableOpacity 
              style={styles.infoCloseButton} 
              onPress={() => setShowInfoModal(false)}
            >
              <Text style={styles.infoCloseButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Peak Focus Info Modal */}
      <Modal
        visible={showFocusInfoModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowFocusInfoModal(false)}
      >
                <View style={styles.modalOverlay}>
          <View style={styles.focusModalContent}>
            <View style={styles.focusModalHeader}>
              <Text style={styles.modalTitle}>Peak Focus Score Guide</Text>
            </View>
            
            <ScrollView style={styles.focusModalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.infoText}>
                Predicts your optimal cognitive performance in the next 30-60 minutes.
              </Text>
              
              {/* Score Zones */}
              <View style={styles.scoreZoneContainer}>
                <View style={styles.scoreZone}>
                  <View style={[styles.colorIndicator, { backgroundColor: Theme.colors.primaryGreen }]} />
                  <View style={styles.scoreZoneText}>
                    <Text style={styles.scoreRange}>75-100: Peak Focus Zone</Text>
                    <Text style={styles.scoreDescription}>Maximum focus, alertness, and cognitive performance</Text>
                  </View>
                </View>
                
                <View style={styles.scoreZone}>
                  <View style={[styles.colorIndicator, { backgroundColor: Theme.colors.primaryBlue }]} />
                  <View style={styles.scoreZoneText}>
                    <Text style={styles.scoreRange}>50-75: Good Focus Zone</Text>
                    <Text style={styles.scoreDescription}>Strong focus with good performance</Text>
                  </View>
                </View>
                
                <View style={styles.scoreZone}>
                  <View style={[styles.colorIndicator, { backgroundColor: Theme.colors.accentOrange }]} />
                  <View style={styles.scoreZoneText}>
                    <Text style={styles.scoreRange}>25-50: Building Focus Zone</Text>
                    <Text style={styles.scoreDescription}>Moderate focus, getting better or declining</Text>
                  </View>
                </View>
                
                <View style={styles.scoreZone}>
                  <View style={[styles.colorIndicator, { backgroundColor: Theme.colors.accentRed }]} />
                  <View style={styles.scoreZoneText}>
                    <Text style={styles.scoreRange}>0-25: Low Focus Zone</Text>
                    <Text style={styles.scoreDescription}>Difficulty concentrating, low alertness</Text>
                  </View>
                </View>
              </View>
              
              {/* What Score Changes Mean */}
              <Text style={styles.sectionTitle}>📈 Score Going UP</Text>
              <Text style={styles.trendDescription}>
                • Caffeine absorption reaching optimal levels{'\n'}
                • Building toward peak (100-125% of tolerance){'\n'}
                • In the 30-60 minute effectiveness window{'\n'}
                • Expect: Increasing alertness and focus
              </Text>
              
              <Text style={styles.sectionTitle}>📉 Score Going DOWN</Text>
              <Text style={styles.trendDescription}>
                • Natural caffeine elimination{'\n'}
                • Past peak absorption window{'\n'}
                • Possible overstimulation{'\n'}
                • Sleep debt reducing focus capacity
              </Text>
              
              {/* Extreme Scores */}
              <Text style={styles.sectionTitle}>🎯 Perfect Score (100)</Text>
              <Text style={styles.extremeDescription}>
                Ideal caffeine level, perfect timing, good sleep, optimal absorption rate
              </Text>
              
              <Text style={styles.sectionTitle}>🚫 Zero Score (0)</Text>
              <Text style={styles.extremeDescription}>
                No caffeine, severe overstimulation, very poor sleep, or wrong timing
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
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
    paddingHorizontal: Theme.spacing.lg,
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
    marginBottom: Theme.spacing.lg,
  },
  doneButtonText: {
    fontSize: 24,
    color: Theme.colors.white,
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
}); 