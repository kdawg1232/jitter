import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions
} from 'react-native';
import { Theme } from '../theme/colors';
import { 
  UserProfile, 
  FocusSession, 
  CaffeinePlan, 
  PlanningPreferences,
  PlanningResult,
  CaffeineCurvePoint
} from '../types';
import { 
  StorageService, 
  PlanningService,
  CrashRiskService 
} from '../services';
import { TimePicker } from '../components';

const { width } = Dimensions.get('window');

interface PlanScreenProps {}

export const PlanScreen: React.FC<PlanScreenProps> = () => {
  // State management
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [todaysPlan, setTodaysPlan] = useState<CaffeinePlan | null>(null);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [preferences, setPreferences] = useState<PlanningPreferences | null>(null);
  const [planningResult, setPlanningResult] = useState<PlanningResult | null>(null);
  const [caffeineCurve, setCaffeineCurve] = useState<CaffeineCurvePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI state
  const [selectedBedtime, setSelectedBedtime] = useState<string>('10:00 PM');
  const [showBedtimeModal, setShowBedtimeModal] = useState(false);
  const [showBedtimePicker, setShowBedtimePicker] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionStart, setNewSessionStart] = useState('09:00 AM');
  const [newSessionEnd, setNewSessionEnd] = useState('11:00 AM');
  const [newSessionImportance, setNewSessionImportance] = useState<1 | 2 | 3>(2);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Scroll ref for auto-scrolling to time picker
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      
      // Load user profile
      const profile = await StorageService.getUserProfile();
      if (!profile) {
        Alert.alert('Error', 'Please complete your profile first');
        return;
      }
      setUserProfile(profile);

      // Load existing planning data
      const [sessions, prefs, plan] = await Promise.all([
        StorageService.getFocusSessionsForUser(profile.userId),
        StorageService.getPlanningPreferences(),
        StorageService.getTodaysPlan(profile.userId)
      ]);

      setFocusSessions(sessions);
      setTodaysPlan(plan);

      // Initialize preferences if not exists
      if (!prefs) {
        const defaultPrefs: PlanningPreferences = {
          ...PlanningService.DEFAULT_PREFERENCES,
          userId: profile.userId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await StorageService.savePlanningPreferences(defaultPrefs);
        setPreferences(defaultPrefs);
        setSelectedBedtime(defaultPrefs.targetBedtime);
      } else {
        setPreferences(prefs);
        setSelectedBedtime(prefs.targetBedtime);
      }

      const currentPrefs = prefs || {
        ...PlanningService.DEFAULT_PREFERENCES,
        userId: profile.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Always generate guidance - either full plan with sessions or basic guidance
      if (sessions.length > 0) {
        // Generate full plan with sessions
        await generateTodaysPlan(sessions, profile, currentPrefs);
      } else if (plan) {
        // Load existing plan data and add basic guidance
        const result = await generateCurveFromPlan(plan, profile);
        setPlanningResult(result);
        setCaffeineCurve(result.caffeineCurve);
      } else {
        // Generate basic guidance with just bedtime
        await generateBasicGuidance(currentPrefs);
      }

    } catch (error) {
      console.error('Error loading planning data:', error);
      Alert.alert('Error', 'Failed to load planning data');
    } finally {
      setIsLoading(false);
    }
  };

  const generateTodaysPlan = async (
    sessions: FocusSession[], 
    profile: UserProfile, 
    prefs: PlanningPreferences
  ) => {
    try {
      const bedtime = new Date();
      
      // Parse the new time format "HH:MM AM/PM"
      const [time, period] = selectedBedtime.split(' ');
      const [hours, minutes] = time.split(':');
      let bedtimeHours = parseInt(hours);
      
      // Convert to 24-hour format
      if (period === 'PM' && bedtimeHours !== 12) {
        bedtimeHours += 12;
      } else if (period === 'AM' && bedtimeHours === 12) {
        bedtimeHours = 0;
      }
      
      bedtime.setHours(bedtimeHours, parseInt(minutes), 0, 0);

      // Get existing drinks for today
      const today = new Date().toISOString().split('T')[0];
      const todaysDrinks = await StorageService.getDrinksForDate(profile.userId, today);

      const result = await PlanningService.generateDailyPlan(
        profile,
        sessions,
        bedtime,
        prefs,
        todaysDrinks
      );

      setPlanningResult(result);
      setCaffeineCurve(result.caffeineCurve);
      setTodaysPlan(result.plan);

      // Save the plan
      await StorageService.saveCaffeinePlan(result.plan);

      if (result.warnings.length > 0) {
        Alert.alert('Planning Warnings', result.warnings.join('\n'));
      }
    } catch (error) {
      console.error('Error generating plan:', error);
      Alert.alert('Error', 'Failed to generate caffeine plan');
    }
  };

  const generateCurveFromPlan = async (
    plan: CaffeinePlan, 
    profile: UserProfile
  ): Promise<PlanningResult> => {
    // Get existing drinks for today
    const todaysDrinks = await StorageService.getDrinksForDate(profile.userId, plan.planDate);
    
    // Generate curve with current data
    const curve = await PlanningService.generateCaffeineCurve(
      profile,
      todaysDrinks,
      plan.recommendations.filter(r => r.status === 'pending')
    );

    return {
      plan,
      caffeineCurve: curve,
      warnings: [],
      suggestions: [],
      conflictResolutions: []
    };
  };

  const saveBedtime = async (newBedtime: string) => {
    if (!preferences || !userProfile) return;
    
    try {
      const updatedPreferences = {
        ...preferences,
        targetBedtime: newBedtime,
        updatedAt: new Date()
      };
      
      await StorageService.savePlanningPreferences(updatedPreferences);
      setPreferences(updatedPreferences);
      setSelectedBedtime(newBedtime);

      // Regenerate plan with new bedtime
      if (focusSessions.length > 0) {
        await generateTodaysPlan(focusSessions, userProfile, updatedPreferences);
      } else {
        // Generate basic guidance even without sessions
        await generateBasicGuidance(updatedPreferences);
      }
    } catch (error) {
      console.error('Error saving bedtime:', error);
    }
  };

  const generateBasicGuidance = async (prefs: PlanningPreferences) => {
    if (!userProfile) return;

    try {
      // Parse bedtime
      const bedtime = new Date();
      const [time, period] = selectedBedtime.split(' ');
      const [hours, minutes] = time.split(':');
      let bedtimeHours = parseInt(hours);
      
      if (period === 'PM' && bedtimeHours !== 12) {
        bedtimeHours += 12;
      } else if (period === 'AM' && bedtimeHours === 12) {
        bedtimeHours = 0;
      }
      bedtime.setHours(bedtimeHours, parseInt(minutes), 0, 0);

      // Calculate latest safe caffeine time
      const latestSafeCaffeineTime = PlanningService.calculateLatestSafeCaffeineTime(
        bedtime,
        userProfile,
        prefs.sleepBufferHours
      );

      // Generate basic suggestions that always show
      const suggestions = [
        `💡 Latest safe caffeine time: ${latestSafeCaffeineTime.toLocaleTimeString()} (to avoid sleep disruption)`,
        `💡 Recommended dose range: ${prefs.preferredDoseMgMin}-${prefs.preferredDoseMgMax}mg per drink`,
        `💡 Space drinks at least 2-3 hours apart for optimal effectiveness`,
        `💡 Add focus sessions above to get personalized caffeine timing recommendations`
      ];

      // If there are existing drinks today, add guidance about them
      const today = new Date().toISOString().split('T')[0];
      const todaysDrinks = await StorageService.getDrinksForDate(userProfile.userId, today);
      
      if (todaysDrinks.length > 0) {
        const totalCaffeine = todaysDrinks.reduce((sum, drink) => sum + drink.actualCaffeineConsumed, 0);
        suggestions.push(`💡 Today's caffeine so far: ${Math.round(totalCaffeine)}mg`);
        
        if (totalCaffeine > 300) {
          suggestions.push(`💡 Consider lighter doses for remaining drinks (already at ${Math.round(totalCaffeine)}mg)`);
        }
      }

      // Create a basic planning result
      const basicResult: PlanningResult = {
        plan: {
          id: `basic_${userProfile.userId}_${today}`,
          userId: userProfile.userId,
          planDate: today,
          bedtime,
          sessions: [],
          recommendations: [],
          latestSafeCaffeineTime,
          totalPlannedCaffeine: 0,
          generatedAt: new Date(),
          lastUpdatedAt: new Date()
        },
        caffeineCurve: [],
        warnings: [],
        suggestions,
        conflictResolutions: []
      };

      setPlanningResult(basicResult);
      
    } catch (error) {
      console.error('Error generating basic guidance:', error);
    }
  };

  const addFocusSession = async () => {
    if (!userProfile || !newSessionName.trim()) {
      Alert.alert('Error', 'Please enter a session name');
      return;
    }

    try {
      const today = new Date();
      
      // Parse start time
      const [startTime_str, startPeriod] = newSessionStart.split(' ');
      const [startHours_str, startMinutes_str] = startTime_str.split(':');
      let startHours = parseInt(startHours_str);
      if (startPeriod === 'PM' && startHours !== 12) {
        startHours += 12;
      } else if (startPeriod === 'AM' && startHours === 12) {
        startHours = 0;
      }

      // Parse end time
      const [endTime_str, endPeriod] = newSessionEnd.split(' ');
      const [endHours_str, endMinutes_str] = endTime_str.split(':');
      let endHours = parseInt(endHours_str);
      if (endPeriod === 'PM' && endHours !== 12) {
        endHours += 12;
      } else if (endPeriod === 'AM' && endHours === 12) {
        endHours = 0;
      }

      const startTime = new Date(today);
      startTime.setHours(startHours, parseInt(startMinutes_str), 0, 0);

      const endTime = new Date(today);
      endTime.setHours(endHours, parseInt(endMinutes_str), 0, 0);

      if (endTime <= startTime) {
        Alert.alert('Error', 'End time must be after start time');
        return;
      }

      const newSession: FocusSession = {
        id: `session_${Date.now()}`,
        userId: userProfile.userId,
        name: newSessionName.trim(),
        startTime,
        endTime,
        importance: newSessionImportance,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await StorageService.addFocusSession(newSession);
      const updatedSessions = [...focusSessions, newSession];
      setFocusSessions(updatedSessions);

      // Regenerate plan with new session
      if (preferences) {
        await generateTodaysPlan(updatedSessions, userProfile, preferences);
      }

      // Reset form
      setNewSessionName('');
      setNewSessionStart('09:00 AM');
      setNewSessionEnd('11:00 AM');
      setNewSessionImportance(2);
      setShowStartTimePicker(false);
      setShowEndTimePicker(false);
      setShowAddSession(false);

    } catch (error) {
      console.error('Error adding session:', error);
      Alert.alert('Error', 'Failed to add focus session');
    }
  };

  const deleteFocusSession = async (sessionId: string) => {
    try {
      await StorageService.deleteFocusSession(sessionId);
      const updatedSessions = focusSessions.filter(s => s.id !== sessionId);
      setFocusSessions(updatedSessions);

      // Regenerate plan without this session
      if (userProfile && preferences) {
        await generateTodaysPlan(updatedSessions, userProfile, preferences);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      Alert.alert('Error', 'Failed to delete session');
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };



  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your caffeine plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        scrollEnabled={!showBedtimePicker && !showStartTimePicker && !showEndTimePicker}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>jitter planning</Text>
        </View>

        {/* Target Bedtime */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>target bedtime</Text>
          
          {!showBedtimePicker ? (
            <View style={styles.centeredSection}>
              <TouchableOpacity 
                onPress={() => {
                  // Keep the saved bedtime when opening picker
                  setShowBedtimePicker(true);
                }}
                style={styles.bedtimeDisplay}
              >
                <Text style={styles.bedtimeTime}>{selectedBedtime}</Text>
                <Text style={styles.bedtimeEditText}>click to edit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.bedtimePickerSection}>
              <Text style={styles.bedtimeTimeEditing}>{selectedBedtime}</Text>
              <TimePicker
                value={selectedBedtime}
                onChange={setSelectedBedtime}
                style={{ marginVertical: Theme.spacing.lg }}
              />
              <View style={styles.pickerButtons}>
                <TouchableOpacity
                  style={styles.circularButton}
                  onPress={() => {
                    // Reset to saved bedtime on cancel
                    if (preferences) {
                      setSelectedBedtime(preferences.targetBedtime);
                    }
                    setShowBedtimePicker(false);
                  }}
                >
                  <Text style={styles.circularButtonText}>×</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.circularButton, styles.circularButtonSave]}
                  onPress={() => {
                    saveBedtime(selectedBedtime);
                    setShowBedtimePicker(false);
                  }}
                >
                  <Text style={[styles.circularButtonText, { color: Theme.colors.white }]}>✓</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Focus Sessions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>focus sessions</Text>
          
          {!showAddSession ? (
            <>
              {/* Show existing sessions first */}
              {focusSessions.map((session) => (
                <View key={session.id} style={styles.sessionCard}>
                  <View style={styles.sessionHeader}>
                    <Text style={styles.sessionName}>{session.name}</Text>
                    <TouchableOpacity
                      onPress={() => deleteFocusSession(session.id)}
                      style={styles.deleteButton}
                    >
                      <Text style={styles.deleteButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.sessionTime}>
                    {formatTime(session.startTime)} - {formatTime(session.endTime)}
                  </Text>
                  <Text style={styles.sessionImportance}>
                    {session.importance === 3 ? 'Critical' : 
                     session.importance === 2 ? 'Important' : 'Normal'}
                  </Text>
                </View>
              ))}
              
              {/* Add session button */}
              <View style={styles.centeredSection}>
                <TouchableOpacity 
                  style={[styles.circularAddButton, { backgroundColor: Theme.colors.primaryBlue }]}
                  onPress={() => setShowAddSession(true)}
                >
                  <Text style={styles.addButtonIcon}>+</Text>
                </TouchableOpacity>
                <Text style={styles.addLabel}>
                  {focusSessions.length === 0 ? 'add sessions' : 'add another session'}
                </Text>
              </View>
            </>
          ) : (
            /* Add session form - inline like home screen */
            <View style={styles.addSessionSection}>
              {/* Session name input */}
              <View style={styles.sessionNameSection}>
                <TextInput
                  style={styles.sessionNameInput}
                  placeholder="Session name"
                  value={newSessionName}
                  onChangeText={setNewSessionName}
                />
                <Text style={styles.sessionNameLabel}>enter session name</Text>
              </View>

              {/* Time selection - clickable like target bedtime */}
              {!showStartTimePicker && !showEndTimePicker ? (
                <View style={styles.timeSelectionSection}>
                  <View style={styles.timeButtonsRow}>
                    <TouchableOpacity 
                      onPress={() => {
                        setShowStartTimePicker(true);
                        setShowEndTimePicker(false);
                        // Auto-scroll to show time picker and buttons in center of view
                        setTimeout(() => {
                          scrollViewRef.current?.scrollTo({ y: 400, animated: true });
                        }, 300);
                      }}
                      style={styles.timeButton}
                    >
                      <Text style={styles.timeButtonText}>{newSessionStart}</Text>
                      <Text style={styles.timeButtonLabel}>start time</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={() => {
                        setShowEndTimePicker(true);
                        setShowStartTimePicker(false);
                        // Auto-scroll to show time picker and buttons in center of view
                        setTimeout(() => {
                          scrollViewRef.current?.scrollTo({ y: 400, animated: true });
                        }, 300);
                      }}
                      style={styles.timeButton}
                    >
                      <Text style={styles.timeButtonText}>{newSessionEnd}</Text>
                      <Text style={styles.timeButtonLabel}>end time</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Time picker section - centered below like target bedtime */
                <View style={styles.timePickerSection}>
                  <Text style={styles.timePickerTitle}>
                    {showStartTimePicker ? newSessionStart : newSessionEnd}
                  </Text>
                  <TimePicker
                    value={showStartTimePicker ? newSessionStart : newSessionEnd}
                    onChange={showStartTimePicker ? setNewSessionStart : setNewSessionEnd}
                    style={{ marginVertical: Theme.spacing.lg }}
                  />
                  <View style={styles.pickerButtons}>
                    <TouchableOpacity
                      style={styles.circularButton}
                      onPress={() => {
                        // Reset to saved times on cancel
                        if (showStartTimePicker) {
                          setNewSessionStart('09:00 AM');
                        } else {
                          setNewSessionEnd('11:00 AM');
                        }
                        setShowStartTimePicker(false);
                        setShowEndTimePicker(false);
                      }}
                    >
                      <Text style={styles.circularButtonText}>×</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.circularButton, styles.circularButtonSave]}
                      onPress={() => {
                        setShowStartTimePicker(false);
                        setShowEndTimePicker(false);
                      }}
                    >
                      <Text style={[styles.circularButtonText, { color: Theme.colors.white }]}>✓</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Importance selection - only show when not picking time */}
              {!showStartTimePicker && !showEndTimePicker && (
                <View style={styles.importanceSection}>
                  <Text style={styles.importanceLabel}>Importance</Text>
                  <View style={styles.importanceButtons}>
                    {[1, 2, 3].map((importance) => (
                      <TouchableOpacity
                        key={importance}
                        style={[
                          styles.importanceButton,
                          newSessionImportance === importance && styles.importanceButtonActive
                        ]}
                        onPress={() => setNewSessionImportance(importance as 1 | 2 | 3)}
                      >
                        <Text style={[
                          styles.importanceButtonText,
                          newSessionImportance === importance && styles.importanceButtonTextActive
                        ]}>
                          {importance === 1 ? 'Normal' : importance === 2 ? 'Important' : 'Critical'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Action buttons - circular X and checkmark like target bedtime */}
              {!showStartTimePicker && !showEndTimePicker && (
                <View style={styles.sessionActionButtons}>
                  <TouchableOpacity
                    style={styles.circularButton}
                    onPress={() => {
                      // Reset form and hide
                      setNewSessionName('');
                      setNewSessionStart('09:00 AM');
                      setNewSessionEnd('11:00 AM');
                      setNewSessionImportance(2);
                      setShowStartTimePicker(false);
                      setShowEndTimePicker(false);
                      setShowAddSession(false);
                    }}
                  >
                    <Text style={styles.circularButtonText}>×</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.circularButton, styles.circularButtonSave]}
                    onPress={addFocusSession}
                  >
                    <Text style={[styles.circularButtonText, { color: Theme.colors.white }]}>✓</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Caffeine Timeline Suggestions */}
        {planningResult && planningResult.suggestions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>caffeine timeline suggestions</Text>
            
            <View style={styles.suggestionsContainer}>
              {planningResult.suggestions.map((suggestion, index) => (
                <View key={index} style={styles.suggestionItem}>
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Caffeine Plan */}
        {planningResult && planningResult.plan.recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>your caffeine plan</Text>
            
            {/* Warnings */}
            {planningResult.warnings.length > 0 && (
              <View style={styles.warningBox}>
                {planningResult.warnings.map((warning, index) => (
                  <Text key={index} style={styles.warningText}>⚠️ {warning}</Text>
                ))}
              </View>
            )}
            
            {/* Suggestions */}
            {planningResult.suggestions.length > 0 && (
              <View style={styles.suggestionBox}>
                {planningResult.suggestions.map((suggestion, index) => (
                  <Text key={index} style={styles.suggestionText}>💡 {suggestion}</Text>
                ))}
              </View>
            )}
            
            {/* Smart Caffeine Plan */}
            <View style={styles.planCard}>
              {planningResult.plan.recommendations.map((rec, index) => (
                <View key={rec.id}>
                  <View style={styles.drinkHeader}>
                    <View style={styles.drinkHeaderLeft}>
                      <Text style={styles.drinkNumber}>
                        {index === 0 ? 'first drink:' : index === 1 ? 'second drink:' : `drink ${index + 1}:`}
                      </Text>
                      {rec.confidence < 0.8 && (
                        <Text style={styles.compromiseIndicator}>⚠️ adjusted</Text>
                      )}
                    </View>
                    {rec.status !== 'pending' && (
                      <Text style={styles.statusIndicator}>
                        {rec.status === 'consumed' ? '✅' : rec.status === 'adjusted' ? '🔄' : '⏭️'}
                      </Text>
                    )}
                  </View>
                  <View style={styles.drinkDetails}>
                    <View style={styles.drinkTimeRow}>
                      <Text style={styles.drinkTime}>{formatTime(rec.recommendedTime)}</Text>
                      <Text style={styles.drinkDose}>{rec.doseMg} mg</Text>
                    </View>
                    <Text style={styles.drinkDuration}>sip over {rec.sippingWindowMinutes} minutes</Text>
                    {rec.reasoning && (
                      <Text style={styles.drinkReasoning}>{rec.reasoning}</Text>
                    )}
                  </View>
                  {index < planningResult.plan.recommendations.length - 1 && (
                    <View style={styles.drinkSeparator} />
                  )}
                </View>
              ))}
              
              <View style={styles.totalSeparator} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>total caffeine</Text>
                <Text style={styles.totalAmount}>{planningResult.plan.totalPlannedCaffeine} mg</Text>
              </View>
            </View>
          </View>
        )}


      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.canvas,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.md,
    alignItems: 'center',
  },
  title: {
    ...Theme.fonts.bigTitle,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.lg,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  sectionTitle: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  addButton: {
    backgroundColor: Theme.colors.primaryBlue,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.small,
  },
  addButtonText: {
    ...Theme.fonts.caption,
    color: Theme.colors.white,
    fontWeight: '600',
  },
  centeredSection: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.lg,
  },
  circularAddButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Theme.colors.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bedtimePickerSection: {
    paddingVertical: Theme.spacing.lg,
    alignItems: 'center',
  },
  pickerSectionTitle: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  pickerButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Theme.spacing.md,
    width: '100%',
  },
  bedtimeDisplay: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.lg,
  },
  bedtimeTime: {
    ...Theme.fonts.bigTitle,
    color: Theme.colors.primaryBlue,
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
  },
  bedtimeEditText: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
  bedtimeTimeEditing: {
    ...Theme.fonts.bigTitle,
    color: Theme.colors.primaryBlue,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
  },
  circularButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Theme.colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.divider,
  },
  circularButtonSave: {
    backgroundColor: Theme.colors.primaryGreen,
    borderColor: Theme.colors.primaryGreen,
  },
  circularButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  addButtonIcon: {
    fontSize: 24,
    color: Theme.colors.white,
    fontWeight: '300',
  },
  addLabel: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
  },
  currentTimeDisplay: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.primaryBlue,
  },
  card: {
    backgroundColor: Theme.colors.cardBg,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.cardStroke,
  },
  bedtimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bedtimeLabel: {
    ...Theme.fonts.body,
    color: Theme.colors.textPrimary,
  },
  timeInput: {
    ...Theme.fonts.body,
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.small,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderWidth: 1,
    borderColor: Theme.colors.divider,
    minWidth: 80,
    textAlign: 'center',
  },
  emptyText: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  emptySubtext: {
    ...Theme.fonts.caption,
    color: Theme.colors.textTertiary,
    textAlign: 'center',
  },
  sessionCard: {
    width: '100%',
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
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  sessionName: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    flex: 1,
  },
  deleteButton: {
    backgroundColor: Theme.colors.accentRed,
    borderRadius: Theme.borderRadius.small,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: Theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  sessionTime: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    fontWeight: '500',
    marginBottom: Theme.spacing.xs,
  },
  sessionImportance: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
  },
  recommendationCard: {
    backgroundColor: Theme.colors.cardBg,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Theme.colors.cardStroke,
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  recTime: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.primaryBlue,
  },
  recDose: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.primaryGreen,
  },
  recReason: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
  },
  recWindow: {
    ...Theme.fonts.caption,
    color: Theme.colors.textTertiary,
  },
  totalCard: {
    backgroundColor: Theme.colors.pastelGreen,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    alignItems: 'center',
  },
  totalText: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
  },
  // Caffeine plan styles
  warningBox: {
    backgroundColor: '#FFF3CD',
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  warningText: {
    ...Theme.fonts.body,
    color: '#856404',
    marginBottom: Theme.spacing.xs,
  },
  suggestionBox: {
    backgroundColor: '#D1ECF1',
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#BEE5EB',
  },
  suggestionText: {
    ...Theme.fonts.body,
    color: '#0C5460',
    marginBottom: Theme.spacing.xs,
  },
  planCard: {
    backgroundColor: Theme.colors.cardBg,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.cardStroke,
  },
  drinkHeader: {
    marginBottom: Theme.spacing.sm,
  },
  drinkNumber: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    fontSize: 16,
  },
  drinkDetails: {
    paddingLeft: Theme.spacing.md,
  },
  drinkTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  drinkTime: {
    ...Theme.fonts.body,
    color: Theme.colors.textPrimary,
    fontSize: 16,
  },
  drinkDose: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.primaryGreen,
    fontSize: 16,
  },
  drinkDuration: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    fontSize: 14,
  },
  drinkSeparator: {
    height: 1,
    backgroundColor: Theme.colors.divider,
    marginVertical: Theme.spacing.md,
  },
  totalSeparator: {
    height: 2,
    backgroundColor: Theme.colors.textPrimary,
    marginVertical: Theme.spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    fontSize: 16,
  },
  totalAmount: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.primaryBlue,
    fontSize: 18,
    fontWeight: '700',
  },



  importanceButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  importanceButton: {
    flex: 0.3,
    backgroundColor: Theme.colors.cardBg,
    borderRadius: Theme.borderRadius.small,
    paddingVertical: Theme.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.divider,
  },
  importanceButtonActive: {
    backgroundColor: Theme.colors.primaryBlue,
    borderColor: Theme.colors.primaryBlue,
  },
  importanceButtonText: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
  },
  importanceButtonTextActive: {
    color: Theme.colors.white,
    fontWeight: '600',
  },

  // Session form styles
  sessionNameSection: {
    marginBottom: Theme.spacing.lg,
    alignItems: 'center',
  },
  sessionNameInput: {
    ...Theme.fonts.body,
    backgroundColor: Theme.colors.cardBg,
    borderRadius: Theme.borderRadius.large,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
    fontSize: 16,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
  },
  sessionNameLabel: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
  timePickersSection: {
    marginBottom: Theme.spacing.lg,
  },
  timePickerGroup: {
    marginBottom: Theme.spacing.md,
    alignItems: 'center',
  },
  timePickerLabel: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.sm,
    fontSize: 16,
  },

  addSessionSection: {
    paddingVertical: Theme.spacing.lg,
    alignItems: 'center',
  },
  timeSelectionSection: {
    marginBottom: Theme.spacing.lg,
    alignItems: 'center',
  },
  timeButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: Theme.spacing.md,
  },
  timeButton: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
  },
  timeButtonText: {
    ...Theme.fonts.bigTitle,
    color: Theme.colors.primaryBlue,
    textAlign: 'center',
  },
  timeButtonLabel: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
  timePickerSection: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.lg,
  },
  timePickerTitle: {
    ...Theme.fonts.bigTitle,
    color: Theme.colors.primaryBlue,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  importanceSection: {
    marginBottom: Theme.spacing.lg,
    alignItems: 'center',
  },
  importanceLabel: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
  },
     sessionActionButtons: {
     flexDirection: 'row',
     justifyContent: 'center',
     gap: Theme.spacing.md,
     marginTop: Theme.spacing.lg,
   },
   // Enhanced plan display styles
   drinkHeaderLeft: {
     flexDirection: 'row',
     alignItems: 'center',
     flex: 1,
   },
   compromiseIndicator: {
     ...Theme.fonts.caption,
     color: '#FF6B35',
     marginLeft: Theme.spacing.xs,
     fontSize: 10,
   },
   statusIndicator: {
     fontSize: 16,
   },
   drinkReasoning: {
     ...Theme.fonts.caption,
     color: Theme.colors.textSecondary,
     marginTop: Theme.spacing.xs,
     fontStyle: 'italic',
   },
   // Suggestions section styles
   suggestionsContainer: {
     gap: Theme.spacing.sm,
   },
   suggestionItem: {
     backgroundColor: '#F0F8FF', // Light blue background
     borderRadius: Theme.borderRadius.medium,
     padding: Theme.spacing.md,
     borderLeftWidth: 3,
     borderLeftColor: Theme.colors.primaryBlue,
   },
}); 