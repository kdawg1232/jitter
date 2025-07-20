import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Theme } from '../theme/colors';
import { StorageService, WidgetService, NotificationService } from '../services';
import { UserProfile } from '../types';

interface SettingsScreenProps {
  onNavigateToEditInput?: () => void;
  onNavigateToHelpSupport?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onNavigateToEditInput,
  onNavigateToHelpSupport,
}) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    loadUserProfile();
    checkNotificationStatus();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profile = await StorageService.getUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkNotificationStatus = async () => {
    try {
      const enabled = await NotificationService.areNotificationsEnabled();
      setNotificationsEnabled(enabled);
      console.log('[SettingsScreen] 📱 Notification status checked:', enabled);
    } catch (error) {
      console.error('Error checking notification status:', error);
    }
  };

  const handleNotificationSetup = async () => {
    try {
      console.log('[SettingsScreen] 🔔 Starting notification setup...');
      
      const setupSuccessful = await NotificationService.setupNotifications();
      
      if (setupSuccessful) {
        setNotificationsEnabled(true);
        
        // Show initial success message
        Alert.alert(
          'Your Jitter notifications are set up!',
          '',
          [{ text: 'OK' }]
        );
        
        // Test notification
        await NotificationService.scheduleCaffeineRisingNotification();
        
        // Show final configuration message  
        Alert.alert(
          'Notifications are enabled!',
          'You will now receive alerts based off of the amount of caffeine in your body!',
          [{ text: 'Great!' }]
        );
      } else {
        Alert.alert(
          'Permission Required',
          'To receive caffeine level notifications, please enable notifications in your device settings.\n\nGo to Settings > Jitter > Notifications',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // On iOS, this opens the app's settings page
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              }
            }}
          ]
        );
      }
    } catch (error) {
      console.error('[SettingsScreen] ❌ Error setting up notifications:', error);
      Alert.alert(
        'Setup Error',
        'There was an error setting up notifications. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleNotificationDisable = async () => {
    try {
      console.log('[SettingsScreen] 🔇 Disabling notifications...');
      
      Alert.alert(
        'Disable Notifications?',
        'You won\'t receive alerts when your caffeine levels are rising. You can re-enable this anytime.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Disable', style: 'destructive', onPress: async () => {
            await NotificationService.disableNotifications();
            setNotificationsEnabled(false);
            console.log('[SettingsScreen] ✅ Notifications disabled');
          }}
        ]
      );
    } catch (error) {
      console.error('[SettingsScreen] ❌ Error disabling notifications:', error);
      Alert.alert(
        'Error',
        'There was an error disabling notifications. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleEditProfile = () => {
    if (onNavigateToEditInput) {
      onNavigateToEditInput();
    } else {
      Alert.alert(
        'Edit Profile',
        'Navigation not configured',
        [{ text: 'OK' }]
      );
    }
  };

  const handleWidgetSetup = async () => {
    try {
      console.log('[SettingsScreen] 📱 Starting widget setup...');
      
      if (!userProfile) {
        Alert.alert(
          'Setup Required',
          'Please complete your profile setup before configuring widgets.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Update widget data to ensure it's current
      await WidgetService.updateWidgetData(userProfile.userId);
      
      // Check if widget data is available
      const widgetData = await WidgetService.getWidgetData();
      
      if (widgetData) {
        Alert.alert(
          'Widget Setup',
          `Your Jitter widget is ready! 🎉\n\nCurrent data:\n• Crash Risk: ${widgetData.crashRiskScore}\n• CaffScore: ${widgetData.caffScore}\n• Caffeine Level: ${widgetData.currentCaffeineLevel}mg\n\nTo add the widget:\n1. Long-press your home screen\n2. Tap the "+" button\n3. Search for "Jitter"\n4. Select your preferred widget size`,
          [{ text: 'Got it!' }]
        );
      } else {
        Alert.alert(
          'Widget Setup',
          'Unable to prepare widget data. Please log some drinks first and try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[SettingsScreen] ❌ Error setting up widget:', error);
      Alert.alert(
        'Setup Error',
        'There was an error setting up your widget. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleHelpSupport = () => {
    if (onNavigateToHelpSupport) {
      onNavigateToHelpSupport();
    } else {
      Linking.openURL('mailto:support@jitterapp.com?subject=Help%20%26%20Support');
    }
  };

  const handleFeatureRequests = () => {
    Linking.openURL('mailto:feedback@jitterapp.com?subject=Feature%20Request');
  };

  const handleLeaveReview = () => {
    // iOS App Store URL - replace with actual app ID when published
    Linking.openURL('https://apps.apple.com/app/idYOUR_APP_ID');
  };

  const handleContactUs = () => {
    Linking.openURL('https://getjitterapp.com/contact');
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://getjitterapp.com/privacy');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://getjitterapp.com/terms');
  };

  const SettingRow: React.FC<{
    icon: string;
    title: string;
    onPress: () => void;
    showArrow?: boolean;
  }> = ({ icon, title, onPress, showArrow = true }) => (
    <TouchableOpacity style={styles.settingRow} onPress={onPress}>
      <View style={styles.settingRowLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      {showArrow && <Text style={styles.chevron}>›</Text>}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>settings</Text>

        {/* Edit Input Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>edit input</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.editInputRow} onPress={handleEditProfile}>
              <View style={styles.editInputLeft}>
                <Text style={styles.editInputIcon}>👤</Text>
                <View>
                  <Text style={styles.editInputTitle}>personal information</Text>
                  <Text style={styles.editInputSubtitle}>
                    update details that affect your algorithm
                  </Text>
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Widget Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>widget</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.widgetRow} onPress={handleWidgetSetup}>
              <View style={styles.widgetLeft}>
                <View style={styles.widgetIndicator} />
                <Text style={styles.widgetIcon}>📱</Text>
                <View>
                  <Text style={styles.widgetTitle}>set up widget</Text>
                  <Text style={styles.widgetSubtitle}>
                    add to home screen for{'\n'}quick brain health checks
                  </Text>
                </View>
              </View>
              <View style={styles.setupButton}>
                <Text style={styles.setupButtonText}>set up</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>notifications</Text>
          <View style={styles.card}>
            <View style={[
              styles.notificationRow,
              notificationsEnabled && styles.notificationRowEnabled
            ]}>
              <TouchableOpacity 
                style={styles.notificationContent} 
                onPress={notificationsEnabled ? undefined : handleNotificationSetup}
                disabled={notificationsEnabled}
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
                        : 'get alerts based on caffeine levels'
                      }
                    </Text>
                  </View>
                </View>
                {!notificationsEnabled && (
                  <View style={styles.enableButton}>
                    <Text style={styles.enableButtonText}>enable</Text>
                  </View>
                )}
                {notificationsEnabled && (
                  <View style={styles.enabledIndicator}>
                    <Text style={styles.enabledText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
              {notificationsEnabled && (
                <TouchableOpacity 
                  style={styles.disableButton}
                  onPress={handleNotificationDisable}
                >
                  <Text style={styles.disableButtonText}>disable</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Support & Feedback Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>support & feedback</Text>
          <View style={styles.card}>
            <SettingRow
              icon="❓"
              title="help & support"
              onPress={handleHelpSupport}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="💡"
              title="feature requests"
              onPress={handleFeatureRequests}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="⭐"
              title="leave a review"
              onPress={handleLeaveReview}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="✉️"
              title="contact us"
              onPress={handleContactUs}
            />
          </View>
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>legal</Text>
          <View style={styles.card}>
            <SettingRow
              icon="🛡️"
              title="privacy policy"
              onPress={handlePrivacyPolicy}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="📄"
              title="terms of service"
              onPress={handleTermsOfService}
            />
          </View>
        </View>

        {/* Follow Us Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>follow us</Text>
          <View style={styles.socialContainer}>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => Linking.openURL('https://twitter.com/jitterapp')}
            >
              <Text style={styles.socialIcon}>𝕏</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => Linking.openURL('https://instagram.com/jitterapp')}
            >
              <Text style={styles.socialIcon}>📷</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => Linking.openURL('https://tiktok.com/@jitterapp')}
            >
              <Text style={styles.socialIcon}>🎵</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
  },
  title: {
    ...Theme.fonts.bigTitle,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.xl,
  },
  section: {
    marginHorizontal: Theme.spacing.lg,
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
  editInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Theme.spacing.md,
  },
  editInputLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  editInputIcon: {
    fontSize: 24,
    marginRight: Theme.spacing.md,
  },
  editInputTitle: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    marginBottom: 2,
  },
  editInputSubtitle: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    fontSize: 13,
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
  setupButton: {
    backgroundColor: Theme.colors.primaryBlue,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.medium,
  },
  setupButtonText: {
    ...Theme.fonts.button,
    color: Theme.colors.white,
    fontSize: 15,
  },
  notificationRow: {
    flexDirection: 'column',
  },
  notificationRowEnabled: {
    backgroundColor: Theme.colors.primaryGreen + '10', // Light green background
  },
  notificationContent: {
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
  disableButton: {
    backgroundColor: Theme.colors.accentRed,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.medium,
    alignSelf: 'center',
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  disableButtonText: {
    ...Theme.fonts.button,
    color: Theme.colors.white,
    fontSize: 13,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Theme.spacing.md,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: Theme.spacing.md,
    width: 24,
    textAlign: 'center',
  },
  settingTitle: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
  },
  chevron: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textTertiary,
    fontSize: 20,
    fontWeight: '300',
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.divider,
    marginLeft: Theme.spacing.md + 24 + Theme.spacing.md, // Icon width + margins
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Theme.colors.cardBg,
    borderWidth: 1,
    borderColor: Theme.colors.cardStroke,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: Theme.spacing.sm,
  },
  socialIcon: {
    fontSize: 24,
  },
  bottomSpacing: {
    height: Theme.spacing.xxl,
  },
}); 