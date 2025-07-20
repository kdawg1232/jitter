import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Theme } from '../theme/colors';
import { 
  UserProfile, 
  FocusSession, 
  CaffeinePlan, 
  PlanningPreferences,
  PlanningResult
} from '../types';
import { 
  StorageService, 
  PlanningService,
} from '../services';
import { TimePicker } from '../components';
import { styles } from './PlanScreen.styles';

interface PlanScreenProps {}

export const PlanScreen: React.FC<PlanScreenProps> = () => {
  // State management
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [todaysPlan, setTodaysPlan] = useState<CaffeinePlan | null>(null);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [preferences, setPreferences] = useState<PlanningPreferences | null>(null);
  const [planningResult, setPlanningResult] = useState<PlanningResult | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  
  // Date tracking for planning - initialize to today
  const [planningDate, setPlanningDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for consistent comparison
    console.log('[PlanScreen] Initializing planning date to:', today.toISOString());
    return today;
  });
  
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

  // Debug planning result changes
  useEffect(() => {
    console.log('[PlanScreen] Planning result updated:', {
      hasPlanningResult: !!planningResult,
      recommendationsLength: planningResult?.plan?.recommendations?.length || 0,
      planningResultDetails: planningResult ? {
        totalCaffeine: planningResult.plan.totalPlannedCaffeine,
        warnings: planningResult.warnings.length,
        suggestions: planningResult.suggestions.length,
        latestSafeCaffeineTime: planningResult.plan.latestSafeCaffeineTime?.toISOString()
      } : null
    });
  }, [planningResult]);

  // Helper function to clean up expired sessions
  const cleanupExpiredSessions = async (userId: string, allSessions: FocusSession[]) => {
    try {
      const now = new Date();
      console.log('[PlanScreen] Cleaning up expired sessions, current time is:', now.toISOString());
      
      // Filter out sessions whose end time has passed
      const expiredSessions = allSessions.filter(session => {
        return session.endTime < now;
      });
      
      if (expiredSessions.length > 0) {
        console.log('[PlanScreen] Found', expiredSessions.length, 'expired sessions to delete:', 
          expiredSessions.map(s => ({ 
            name: s.name, 
            endTime: s.endTime.toISOString(),
            hasEnded: s.endTime < now
          }))
        );
        
        // Delete expired sessions
        for (const session of expiredSessions) {
          await StorageService.deleteFocusSession(session.id);
        }
        
        // Return the cleaned sessions (sessions whose end time hasn't passed)
        const cleanedSessions = allSessions.filter(session => {
          return session.endTime >= now;
        });
        
        console.log('[PlanScreen] Cleanup complete. Remaining sessions:', cleanedSessions.length);
        return cleanedSessions;
      } else {
        console.log('[PlanScreen] No expired sessions found');
        return allSessions;
      }
    } catch (error) {
      console.error('[PlanScreen] Error cleaning up expired sessions:', error);
      return allSessions;
    }
  };

  // Helper function to get planning date string (for bedtime after midnight logic)
  const getPlanningDateString = (): string => {
    return planningDate.toISOString().split('T')[0];
  };

  // Helper function to format date like HomeScreen
  const formatPlanningDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Helper function to get sessions for the planning date
  const getSessionsForPlanningDate = (sessions: FocusSession[] = focusSessions): FocusSession[] => {
    const planDateString = getPlanningDateString();
    const today = new Date().toISOString().split('T')[0];
    
    return sessions.filter(session => {
      const sessionDateString = session.startTime.toISOString().split('T')[0];
      
      // If session is from the planning date
      if (sessionDateString === planDateString) {
        // If planning date is today, show all sessions for today
        if (planDateString === today) {
          return true;
        }
        // If planning date is in the future, show all sessions
        if (planDateString > today) {
          return true;
        }
        // If planning date is in the past, don't show any sessions
        return false;
      }
      
      return false;
    });
  };

  // Helper function to sort focus sessions by time
  const sortFocusSessionsByTime = (sessions: FocusSession[]): FocusSession[] => {
    return [...sessions].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  };



  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      
      // Load user profile
      const profile = await StorageService.getUserProfile();
      if (!profile) {
        console.error('Please complete your profile first');
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

      // Clean up expired sessions after setting user profile and before generating plans
      const cleanedSessions = await cleanupExpiredSessions(profile.userId, sessions);
      setFocusSessions(cleanedSessions);

      // Always generate guidance - either full plan with sessions or basic guidance
      const planningDateSessions = getSessionsForPlanningDate(cleanedSessions);
      console.log('[PlanScreen] Planning date sessions:', {
        planningDate: getPlanningDateString(),
        totalSessions: cleanedSessions.length,
        planningDateSessions: planningDateSessions.length,
        currentTime: new Date().toISOString(),
        sessionDetails: planningDateSessions.map(s => ({
          name: s.name,
          startTime: s.startTime.toISOString(),
          endTime: s.endTime.toISOString(),
          hasEnded: s.endTime < new Date()
        }))
      });
      
      if (planningDateSessions.length > 0) {
        console.log('[PlanScreen] Generating plan with', planningDateSessions.length, 'sessions');
        // Generate full plan with sessions for planning date
        await generateTodaysPlan(planningDateSessions, profile, currentPrefs);
      } else {
        console.log('[PlanScreen] No sessions found for planning date');
        // Clear any existing plan result to show the "add session" message
        setPlanningResult(null);
      }

    } catch (error) {
      console.error('Error loading planning data:', error);
      // Removed popup alert
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
      console.log('[PlanScreen] generateTodaysPlan called with:', {
        sessionsCount: sessions.length,
        sessions: sessions.map(s => ({ name: s.name, start: s.startTime.toISOString() })),
        selectedBedtime,
        planningDate: getPlanningDateString()
      });

      const bedtime = new Date(planningDate);
      
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
      
      // Handle bedtime after midnight logic
      if (period === 'AM' && bedtimeHours >= 0 && bedtimeHours <= 6) {
        // For early morning bedtimes (12 AM - 6 AM), it's likely the next day
        bedtime.setDate(bedtime.getDate() + 1);
      }
      
      bedtime.setHours(bedtimeHours, parseInt(minutes), 0, 0);

      console.log('[PlanScreen] Calculated bedtime:', bedtime.toISOString());

      // Get existing drinks for the planning date
      const planDateString = getPlanningDateString();
      const todaysDrinks = await StorageService.getDrinksForDate(profile.userId, planDateString);

      console.log('[PlanScreen] Existing drinks for planning date:', todaysDrinks.length);

      const result = await PlanningService.generateDailyPlan(
        profile,
        sessions,
        bedtime,
        prefs,
        todaysDrinks
      );

      console.log('[PlanScreen] Plan generated successfully:', {
        recommendationsCount: result.plan.recommendations.length,
        totalCaffeine: result.plan.totalPlannedCaffeine,
        warningsCount: result.warnings.length,
        suggestionsCount: result.suggestions.length
      });

      setPlanningResult(result);
      setTodaysPlan(result.plan);

      // Save the plan
      await StorageService.saveCaffeinePlan(result.plan);

      console.log('[PlanScreen] Plan saved and state updated');

    } catch (error) {
      console.error('[PlanScreen] Error generating plan:', error);
      // Clear plan result to show "add session" message
      setPlanningResult(null);
    }
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
      const planningDateSessions = getSessionsForPlanningDate();
      if (planningDateSessions.length > 0) {
        await generateTodaysPlan(planningDateSessions, userProfile, updatedPreferences);
      } else {
        // Clear plan result to show "add session" message
        setPlanningResult(null);
      }
    } catch (error) {
      console.error('Error saving bedtime:', error);
    }
  };



  const addFocusSession = async () => {
    if (!userProfile || !newSessionName.trim()) {
      console.error('Please enter a session name');
      return;
    }

    try {
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

      if (endHours <= startHours) {
        console.error('End time must be after start time');
        return;
      }

      // Use the planning date for the session
      const sessionDate = new Date(planningDate);
      
      // Set the correct date for start and end times
      const sessionStartTime = new Date(sessionDate);
      sessionStartTime.setHours(startHours, parseInt(startMinutes_str), 0, 0);

      const sessionEndTime = new Date(sessionDate);
      sessionEndTime.setHours(endHours, parseInt(endMinutes_str), 0, 0);

      const newSession: FocusSession = {
        id: `session_${Date.now()}`,
        userId: userProfile.userId,
        name: newSessionName.trim(),
        startTime: sessionStartTime,
        endTime: sessionEndTime,
        importance: newSessionImportance,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await StorageService.addFocusSession(newSession);
      const updatedSessions = [...focusSessions, newSession];
      setFocusSessions(updatedSessions);

      // Regenerate plan with new session (using updated sessions list)
      if (preferences) {
        // Use the updated sessions list directly
        const planDateString = getPlanningDateString();
        const today = new Date().toISOString().split('T')[0];
        
        const planningDateSessions = updatedSessions.filter(session => {
          const sessionDateString = session.startTime.toISOString().split('T')[0];
          
          if (sessionDateString === planDateString) {
            if (planDateString === today) {
              return true;
            }
            if (planDateString > today) {
              return true;
            }
            return false;
          }
          return false;
        });
        
        console.log('[PlanScreen] After adding session, planning date sessions:', planningDateSessions.length);
        if (planningDateSessions.length > 0) {
          await generateTodaysPlan(planningDateSessions, userProfile, preferences);
        } else {
          setPlanningResult(null);
        }
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
      // Removed popup alert
    }
  };

  const deleteFocusSession = async (sessionId: string) => {
    try {
      await StorageService.deleteFocusSession(sessionId);
      const updatedSessions = focusSessions.filter(s => s.id !== sessionId);
      setFocusSessions(updatedSessions);

      // Regenerate plan without this session (using updated sessions list)
      if (userProfile && preferences) {
        // Use the updated sessions list directly
        const planDateString = getPlanningDateString();
        const today = new Date().toISOString().split('T')[0];
        
        const planningDateSessions = updatedSessions.filter(session => {
          const sessionDateString = session.startTime.toISOString().split('T')[0];
          
          if (sessionDateString === planDateString) {
            if (planDateString === today) {
              return true;
            }
            if (planDateString > today) {
              return true;
            }
            return false;
          }
          return false;
        });
        
        console.log('[PlanScreen] After deleting session, planning date sessions:', planningDateSessions.length);
        if (planningDateSessions.length > 0) {
          await generateTodaysPlan(planningDateSessions, userProfile, preferences);
        } else {
          setPlanningResult(null);
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      // Removed popup alert
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>target bedtime</Text>
            <Text style={styles.sectionDate}>for {formatPlanningDate(planningDate)}</Text>
          </View>
          
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
            <View style={styles.sessionsContainer}>
              {/* Show sessions for planning date, sorted by time */}
              {sortFocusSessionsByTime(getSessionsForPlanningDate()).map((session) => (
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
                  <Text style={styles.sessionTimeAndDate}>
                    {formatTime(session.startTime)} - {formatTime(session.endTime)} • {formatPlanningDate(session.startTime)}
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
                  {getSessionsForPlanningDate().length === 0 ? 'add sessions' : 'add session'}
                </Text>
              </View>
            </View>
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
                  
                  {/* Importance selector */}
                  <View style={styles.importanceSection}>
                    <Text style={styles.importanceLabel}>session importance</Text>
                    <View style={styles.importanceOptions}>
                      <TouchableOpacity 
                        style={[styles.importanceOption, newSessionImportance === 1 && styles.importanceSelected]}
                        onPress={() => setNewSessionImportance(1)}
                      >
                        <Text style={[styles.importanceText, newSessionImportance === 1 && styles.importanceTextSelected]}>Normal</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.importanceOption, newSessionImportance === 2 && styles.importanceSelected]}
                        onPress={() => setNewSessionImportance(2)}
                      >
                        <Text style={[styles.importanceText, newSessionImportance === 2 && styles.importanceTextSelected]}>Important</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.importanceOption, newSessionImportance === 3 && styles.importanceSelected]}
                        onPress={() => setNewSessionImportance(3)}
                      >
                        <Text style={[styles.importanceText, newSessionImportance === 3 && styles.importanceTextSelected]}>Critical</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {/* Action buttons */}
                  <View style={styles.sessionActionButtons}>
                    <TouchableOpacity
                      style={styles.circularButton}
                      onPress={() => {
                        setShowAddSession(false);
                        setNewSessionName('');
                        setNewSessionStart('09:00 AM');
                        setNewSessionEnd('11:00 AM');
                        setNewSessionImportance(2);
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
                </View>
              ) : (
                /* Time Picker Section */
                <View style={styles.timePickerSection}>
                  <Text style={styles.pickerSectionTitle}>
                    {showStartTimePicker ? 'Select start time' : 'Select end time'}
                  </Text>
                  <TimePicker
                    value={showStartTimePicker ? newSessionStart : newSessionEnd}
                    onChange={(time) => {
                      if (showStartTimePicker) {
                        setNewSessionStart(time);
                      } else {
                        setNewSessionEnd(time);
                      }
                    }}
                    style={{ marginVertical: Theme.spacing.lg }}
                  />
                  <View style={styles.pickerButtons}>
                    <TouchableOpacity
                      style={styles.circularButton}
                      onPress={() => {
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
            </View>
          )}
        </View>

        {/* Caffeine Plan - Always visible */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>your caffeine plan</Text>
          
          {planningResult && planningResult.plan.recommendations.length > 0 ? (
            <>
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

              {/* Latest Safe Caffeine Time */}
              {planningResult.plan.latestSafeCaffeineTime && (
                <View style={styles.safeTimeCard}>
                  <Text style={styles.safeTimeLabel}>latest safe caffeine time</Text>
                  <Text style={styles.safeTimeValue}>
                    {formatTime(planningResult.plan.latestSafeCaffeineTime)}
                  </Text>
                  <Text style={styles.safeTimeSubtext}>to meet bedtime needs</Text>
                </View>
              )}
            </>
          ) : (
            /* No sessions fallback */
            <View style={styles.noSessionsContainer}>
              <Text style={styles.noSessionsText}>add a session to generate a plan</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}; 