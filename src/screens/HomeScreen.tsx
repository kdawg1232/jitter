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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { Theme } from '../theme/colors';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  // Add navigation props later if needed
}

interface DrinkRecord {
  id: string;
  name: string;
  caffeineAmount: number; // in mg
  completionPercentage: number; // 0-100
  timeToConsume: string; // formatted time (HH:MM:SS)
  actualCaffeineConsumed: number; // calculated value
  recordedAt: Date;
}

export const HomeScreen: React.FC<HomeScreenProps> = () => {
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
  const [crashRiskScore, setCrashRiskScore] = useState(0);
  
  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const customTimeInputRef = useRef<TextInput>(null);

  // Storage functions
  const STORAGE_KEY = 'jitter_drinks_data';

  const saveDrinksToStorage = async (drinks: DrinkRecord[]) => {
    try {
      const today = new Date().toDateString();
      const dataToSave = {
        date: today,
        drinks: drinks
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error saving drinks to storage:', error);
    }
  };

  const loadDrinksFromStorage = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        const today = new Date().toDateString();
        
        // Only load drinks if they're from today
        if (parsedData.date === today && parsedData.drinks) {
          const drinks = parsedData.drinks.map((drink: any) => ({
            ...drink,
            recordedAt: new Date(drink.recordedAt)
          }));
          setTodaysDrinks(drinks);
          return drinks;
        }
      }
      return [];
    } catch (error) {
      console.error('Error loading drinks from storage:', error);
      return [];
    }
  };

  // Calculate total daily caffeine
  const calculateTotalCaffeine = (drinks: DrinkRecord[]): number => {
    return drinks.reduce((total, drink) => total + drink.actualCaffeineConsumed, 0);
  };

  // Calculate crash risk score based on caffeine intake
  const calculateCrashRiskScore = (totalCaffeine: number): number => {
    // Scale 0-400mg caffeine to 0-100 crash risk score
    return Math.min(Math.round((totalCaffeine / 400) * 100), 100);
  };

  // Load drinks on component mount
  useEffect(() => {
    const initializeData = async () => {
      const drinks = await loadDrinksFromStorage();
      const total = calculateTotalCaffeine(drinks);
      setTotalDailyCaffeine(total);
      setCrashRiskScore(calculateCrashRiskScore(total));
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

  // Calculate progress bar fill percentage and color
  const progressPercentage = Math.min(crashRiskScore, 100);
  const getProgressBarColor = () => {
    if (crashRiskScore >= 75) return Theme.colors.accentRed;
    if (crashRiskScore >= 50) return Theme.colors.accentOrange;
    return Theme.colors.primaryGreen;
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
    
    // Create new drink record
    const newDrink: DrinkRecord = {
      id: Date.now().toString(), // Simple ID generation
      name: drinkName || 'Unnamed Drink',
      caffeineAmount: caffeineAmountNum,
      completionPercentage,
      timeToConsume,
      actualCaffeineConsumed: actualCaffeine,
      recordedAt: new Date(),
    };
    
    // Add to today's drinks
    const updatedDrinks = [...todaysDrinks, newDrink];
    setTodaysDrinks(updatedDrinks);
    
    // Update totals
    const newTotal = calculateTotalCaffeine(updatedDrinks);
    setTotalDailyCaffeine(newTotal);
    setCrashRiskScore(calculateCrashRiskScore(newTotal));
    
    // Save to storage
    await saveDrinksToStorage(updatedDrinks);
    
    // Reset everything
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
          {/* Header */}
          <Text style={styles.title}>jitter</Text>
          
          {/* Mascot */}
          <View style={styles.mascotContainer}>
            <Image 
              source={require('../../assets/purplejittermascot.png')} 
              style={styles.mascotImage}
              resizeMode="contain"
            />
          </View>
          
          {/* Crash Risk Score */}
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreNumber}>{crashRiskScore}</Text>
            
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
            <Text style={styles.scoreLabel}>crash risk score</Text>
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
                  <Text style={styles.drinksOfDayTitle}>drinks of the day</Text>
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
        </ScrollView>
      </TouchableWithoutFeedback>
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
  drinksOfDayTitle: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.md,
    textAlign: 'left', // Left align the title
    textTransform: 'lowercase',
    alignSelf: 'flex-start',
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
}); 