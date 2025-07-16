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
import Slider from '@react-native-community/slider';
import { Theme } from '../theme/colors';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  // Add navigation props later if needed
}

export const HomeScreen: React.FC<HomeScreenProps> = () => {
  // State for crash risk score (placeholder for now)
  const [crashRiskScore] = useState(69); // Placeholder value
  
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
  
  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const customTimeInputRef = useRef<TextInput>(null);

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

  // Calculate progress bar fill percentage and color
  const progressPercentage = Math.min(crashRiskScore, 100);
  const getProgressBarColor = () => {
    if (crashRiskScore >= 75) return Theme.colors.accentRed;
    if (crashRiskScore >= 50) return Theme.colors.accentOrange;
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

  const handleRecord = () => {
    // TODO: Save drink data
    console.log('Recording drink:', {
      name: drinkName,
      caffeine: caffeineAmount,
      completion: completionPercentage,
      time: customTime,
    });
    
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
            <View style={styles.addDrinkSection}>
              <TouchableOpacity style={styles.addButton} onPress={handleAddDrink}>
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
              <Text style={styles.addDrinkLabel}>add a drink</Text>
            </View>
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
}); 