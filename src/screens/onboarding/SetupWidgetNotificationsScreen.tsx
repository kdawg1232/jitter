import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Theme } from '../../theme/colors';
import { OnboardingData } from '../../types/onboarding';
import { NotificationService, WidgetService } from '../../services';

interface SetupWidgetNotificationsScreenProps {
  data: OnboardingData;
  onUpdateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
}

export const SetupWidgetNotificationsScreen: React.FC<SetupWidgetNotificationsScreenProps> = ({
  data,
  onUpdateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [widgetsEnabled, setWidgetsEnabled] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isSettingUpWidget, setIsSettingUpWidget] = useState(false);

  const handleNotificationSetup = async () => {
    if (isSettingUp) return;
    
    setIsSettingUp(true);
    try {
      console.log('[SetupWidgetNotificationsScreen] 🔔 Starting notification setup...');
      
      const setupSuccessful = await NotificationService.setupNotifications();
      
      if (setupSuccessful) {
        setNotificationsEnabled(true);
        // Store notification setup status in onboarding data
        onUpdateData({ notificationsEnabled: true });
        
        // Send setup notification instead of popup
        await NotificationService.scheduleSetupNotification();
        console.log('[SetupWidgetNotificationsScreen] ✅ Notifications enabled successfully');
      } else {
        Alert.alert(
          'Permission Required',
          'To receive caffeine level notifications, please enable notifications in your device settings.\n\nYou can always set this up later in Settings.',
          [
            { text: 'Skip for now', style: 'cancel', onPress: () => {
              onUpdateData({ notificationsEnabled: false });
            }},
            { text: 'Open Settings', onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              }
            }}
          ]
        );
      }
    } catch (error) {
      console.error('[SetupWidgetNotificationsScreen] ❌ Error setting up notifications:', error);
      Alert.alert(
        'Setup Error',
        'There was an error setting up notifications. You can try again later in Settings.',
        [{ text: 'OK', onPress: () => {
          onUpdateData({ notificationsEnabled: false });
        }}]
      );
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleSkip = () => {
    onUpdateData({ notificationsEnabled: false });
    onNext();
  };

  const handleNotificationDisable = async () => {
    try {
      console.log('[SetupWidgetNotificationsScreen] 🔇 Disabling notifications...');
      await NotificationService.disableNotifications();
      setNotificationsEnabled(false);
      onUpdateData({ notificationsEnabled: false });
      console.log('[SetupWidgetNotificationsScreen] ✅ Notifications disabled');
    } catch (error) {
      console.error('[SetupWidgetNotificationsScreen] ❌ Error disabling notifications:', error);
    }
  };

  const handleWidgetSetup = async () => {
    if (isSettingUpWidget) return;
    
    setIsSettingUpWidget(true);
    try {
      console.log('[SetupWidgetNotificationsScreen] 📱 Starting widget setup...');
      
      const setupSuccessful = await WidgetService.setupWidgets();
      
      if (setupSuccessful) {
        setWidgetsEnabled(true);
        // Store widget setup status in onboarding data
        onUpdateData({ widgetsEnabled: true });
        console.log('[SetupWidgetNotificationsScreen] ✅ Widgets enabled successfully');
      } else {
        Alert.alert(
          'Setup Error',
          'Unable to set up your widget at this time. You can set this up later in Settings.',
          [{ text: 'OK', onPress: () => {
            onUpdateData({ widgetsEnabled: false });
          }}]
        );
      }
    } catch (error) {
      console.error('[SetupWidgetNotificationsScreen] ❌ Error setting up widget:', error);
      Alert.alert(
        'Setup Error',
        'There was an error setting up your widget. You can try again later in Settings.',
        [{ text: 'OK', onPress: () => {
          onUpdateData({ widgetsEnabled: false });
        }}]
      );
    } finally {
      setIsSettingUpWidget(false);
    }
  };

  const handleWidgetDisable = async () => {
    try {
      console.log('[SetupWidgetNotificationsScreen] 🔇 Disabling widgets...');
      await WidgetService.disableWidgets();
      setWidgetsEnabled(false);
      onUpdateData({ widgetsEnabled: false });
      console.log('[SetupWidgetNotificationsScreen] ✅ Widgets disabled');
    } catch (error) {
      console.error('[SetupWidgetNotificationsScreen] ❌ Error disabling widgets:', error);
    }
  };

  const handleContinue = () => {
    onNext();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Progress Bar and Back Button */}
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(currentStep / totalSteps) * 100}%` }
              ]} 
            />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>set up your widget and add notifications</Text>

        {/* Widget Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>widget</Text>
            {widgetsEnabled && (
              <TouchableOpacity 
                style={styles.headerDisableButton}
                onPress={handleWidgetDisable}
              >
                <Text style={styles.headerDisableButtonText}>disable</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.widgetRow} 
              onPress={widgetsEnabled ? undefined : handleWidgetSetup}
              disabled={widgetsEnabled || isSettingUpWidget}
            >
              <View style={styles.widgetLeft}>
                <View style={[
                  styles.widgetIndicator, 
                  widgetsEnabled && styles.widgetIndicatorEnabled
                ]} />
                <Text style={styles.widgetIcon}>📱</Text>
                <View>
                  <Text style={styles.widgetTitle}>
                    {widgetsEnabled ? 'widgets are set up!' : 'set up widget'}
                  </Text>
                  <Text style={styles.widgetSubtitle}>
                    {widgetsEnabled 
                      ? 'home screen widget active' 
                      : `add to home screen for${'\n'}quick brain health checks`
                    }
                  </Text>
                </View>
              </View>
              {!widgetsEnabled && (
                <View style={styles.enableButton}>
                  <Text style={styles.enableButtonText}>
                    {isSettingUpWidget ? 'setting up...' : 'enable'}
                  </Text>
                </View>
              )}
              {widgetsEnabled && (
                <View style={styles.enabledIndicator}>
                  <Text style={styles.enabledText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>notifications</Text>
            {notificationsEnabled && (
              <TouchableOpacity 
                style={styles.headerDisableButton}
                onPress={handleNotificationDisable}
              >
                <Text style={styles.headerDisableButtonText}>disable</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.notificationRow} 
              onPress={notificationsEnabled ? undefined : handleNotificationSetup}
              disabled={notificationsEnabled || isSettingUp}
            >
              <View style={styles.notificationLeft}>
                <View style={[
                  styles.notificationIndicator, 
                  notificationsEnabled && styles.notificationIndicatorEnabled
                ]} />
                <Text style={styles.notificationIcon}>📱</Text>
                <View>
                  <Text style={styles.notificationTitle}>
                    {notificationsEnabled ? 'notifications are set up!' : 'set up notifications'}
                  </Text>
                  <Text style={styles.notificationSubtitle}>
                    {notificationsEnabled 
                      ? 'alerts based on your caffeine levels' 
                      : `get alerts based on${'\n'}caffeine levels`
                    }
                  </Text>
                </View>
              </View>
              {!notificationsEnabled && (
                <View style={styles.enableButton}>
                  <Text style={styles.enableButtonText}>
                    {isSettingUp ? 'setting up...' : 'enable'}
                  </Text>
                </View>
              )}
              {notificationsEnabled && (
                <View style={styles.enabledIndicator}>
                  <Text style={styles.enabledText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>skip for now</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.continueButton} 
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.canvas,
  },
  content: {
    flex: 1,
    paddingHorizontal: Theme.spacing.lg,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.lg,
  },
  backButton: {
    marginRight: Theme.spacing.md,
    padding: Theme.spacing.xs,
  },
  backButtonText: {
    fontSize: 24,
    color: Theme.colors.primaryBlue,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: Theme.colors.divider,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Theme.colors.primaryBlue,
    borderRadius: 2,
  },
  title: {
    ...Theme.fonts.bigTitle,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  section: {
    marginBottom: Theme.spacing.lg,
  },
  sectionHeader: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.md,
  },
  card: {
    backgroundColor: Theme.colors.cardBg,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: Theme.colors.cardStroke,
    overflow: 'hidden',
  },
  widgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Theme.spacing.md,
  },
  widgetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  widgetIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.accentRed,
    marginRight: Theme.spacing.sm,
  },
  widgetIndicatorEnabled: {
    backgroundColor: Theme.colors.primaryGreen,
  },
  widgetIcon: {
    fontSize: 24,
    marginRight: Theme.spacing.md,
  },
  widgetTitle: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    marginBottom: 2,
  },
  widgetSubtitle: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 16,
  },
  comingSoonButton: {
    backgroundColor: Theme.colors.primaryBlue,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.medium,
  },
  comingSoonButtonText: {
    ...Theme.fonts.button,
    color: Theme.colors.white,
    fontSize: 15,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Theme.spacing.md,
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.accentRed,
    marginRight: Theme.spacing.sm,
  },
  notificationIndicatorEnabled: {
    backgroundColor: Theme.colors.primaryGreen,
  },
  notificationIcon: {
    fontSize: 24,
    marginRight: Theme.spacing.md,
  },
  notificationTitle: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    marginBottom: 2,
  },
  notificationSubtitle: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    fontSize: 13,
  },
  enableButton: {
    backgroundColor: Theme.colors.primaryBlue,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.medium,
  },
  enableButtonText: {
    ...Theme.fonts.button,
    color: Theme.colors.white,
    fontSize: 15,
  },
  enabledIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enabledText: {
    color: Theme.colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
    marginBottom: Theme.spacing.xl,
    gap: Theme.spacing.md,
  },
  skipButton: {
    flex: 1,
    paddingVertical: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: Theme.colors.cardStroke,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    ...Theme.fonts.button,
    color: Theme.colors.textSecondary,
  },
  continueButton: {
    flex: 1,
    backgroundColor: Theme.colors.primaryBlue,
    paddingVertical: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.large,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    ...Theme.fonts.button,
    color: Theme.colors.white,
  },
  headerDisableButton: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.medium,
    backgroundColor: Theme.colors.accentRed,
    alignSelf: 'center',
    marginTop: -2,
  },
  headerDisableButtonText: {
    ...Theme.fonts.button,
    color: Theme.colors.white,
    fontSize: 13,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
}); 