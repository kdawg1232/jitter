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
  Image,
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
  const [widgetsEnabled, setWidgetsEnabled] = useState(false);

  useEffect(() => {
    loadUserProfile();
    checkNotificationStatus();
    checkWidgetStatus();
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

  const checkWidgetStatus = async () => {
    try {
      const enabled = await WidgetService.areWidgetsEnabled();
      setWidgetsEnabled(enabled);
      console.log('[SettingsScreen] 📱 Widget status checked:', enabled);
    } catch (error) {
      console.error('Error checking widget status:', error);
    }
  };

  const handleNotificationSetup = async () => {
    try {
      console.log('[SettingsScreen] 🔔 Starting notification setup...');
      
      const setupSuccessful = await NotificationService.setupNotifications();
      
      if (setupSuccessful) {
        setNotificationsEnabled(true);
        
        // Send setup notification instead of popups
        await NotificationService.scheduleSetupNotification();
        
        // Force refresh status after a brief delay to ensure persistence
        setTimeout(() => {
          checkNotificationStatus();
        }, 1000);
        
        console.log('[SettingsScreen] ✅ Notifications enabled successfully');
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

      const setupSuccessful = await WidgetService.setupWidgets();
      
      if (setupSuccessful) {
        setWidgetsEnabled(true);
        
        // Get widget data to show in success message
        const widgetData = await WidgetService.getWidgetData();
        
        Alert.alert(
          'Widget Setup',
          `Your Jitter widget is ready! 🎉\n\nCurrent Status:\n• Focus Score: ${widgetData?.caffScore || 0}\n• Caffeine Level: ${widgetData?.currentCaffeineLevel || 0}mg\n\nTo add the widget:\n1. Long-press your home screen\n2. Tap the "+" button\n3. Search for "Jitter"\n4. Select your preferred widget size`,
          [{ text: 'Got it!' }]
        );
        
        // Force refresh status after a brief delay to ensure persistence
        setTimeout(() => {
          checkWidgetStatus();
        }, 1000);
        
        console.log('[SettingsScreen] ✅ Widgets enabled successfully');
      } else {
        Alert.alert(
          'Setup Error',
          'Unable to set up your widget. Please make sure you have some drink data and try again.',
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

  const handleWidgetDisable = async () => {
    try {
      console.log('[SettingsScreen] 🔇 Disabling widgets...');
      
      Alert.alert(
        'Disable Widgets?',
        'Your home screen widget will no longer receive updates. You can re-enable this anytime.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Disable', style: 'destructive', onPress: async () => {
            await WidgetService.disableWidgets();
            setWidgetsEnabled(false);
            console.log('[SettingsScreen] ✅ Widgets disabled');
          }}
        ]
      );
    } catch (error) {
      console.error('[SettingsScreen] ❌ Error disabling widgets:', error);
      Alert.alert(
        'Error',
        'There was an error disabling widgets. Please try again.',
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
    icon?: string;
    iconSource?: any;
    title: string;
    onPress: () => void;
    showArrow?: boolean;
  }> = ({ icon, iconSource, title, onPress, showArrow = true }) => (
    <TouchableOpacity style={styles.settingRow} onPress={onPress}>
      <View style={styles.settingRowLeft}>
        {iconSource ? (
          <Image source={iconSource} style={styles.settingIconImage} />
        ) : (
          <Text style={styles.settingIcon}>{icon}</Text>
        )}
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
                <Image source={require('../../assets/profileicon.png')} style={styles.editInputIconImage} />
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
            <View style={[
              styles.widgetRow,
              widgetsEnabled && styles.widgetRowEnabled
            ]}>
              <TouchableOpacity 
                style={styles.widgetContent} 
                onPress={widgetsEnabled ? undefined : handleWidgetSetup}
                disabled={widgetsEnabled}
              >
                <View style={styles.widgetLeft}>
                  <View style={[
                    styles.widgetIndicator, 
                    widgetsEnabled && styles.widgetIndicatorEnabled
                  ]} />
                  <Image source={require('../../assets/phoneicon.png')} style={styles.widgetIconImage} />
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
                  <View style={styles.setupButton}>
                    <Text style={styles.setupButtonText}>set up</Text>
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
                  <Image source={require('../../assets/phoneicon.png')} style={styles.notificationIconImage} />
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
                    <Text style={styles.enableButtonText}>enable</Text>
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
        </View>

        {/* Support & Feedback Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>support & feedback</Text>
          <View style={styles.card}>
            <SettingRow
              iconSource={require('../../assets/questionicon.png')}
              title="help & support"
              onPress={handleHelpSupport}
            />
            <View style={styles.divider} />
            <SettingRow
              iconSource={require('../../assets/lightbulbicon.png')}
              title="feature requests"
              onPress={handleFeatureRequests}
            />
            <View style={styles.divider} />
            <SettingRow
              iconSource={require('../../assets/reviewicon.png')}
              title="leave a review"
              onPress={handleLeaveReview}
            />
            <View style={styles.divider} />
            <SettingRow
              iconSource={require('../../assets/mailicon.png')}
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
              iconSource={require('../../assets/privacypolicyicon.png')}
              title="privacy policy"
              onPress={handlePrivacyPolicy}
            />
            <View style={styles.divider} />
            <SettingRow
              iconSource={require('../../assets/termsofserviceicon.png')}
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
              onPress={() => Linking.openURL('https://x.com/thejitterapp')}
            >
              <Text style={styles.socialIcon}>𝕏</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => Linking.openURL('https://www.instagram.com/thejitterapp/')}
            >
              <Image source={require('../../assets/instagramrealreal.png')} style={styles.socialIconImage} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => Linking.openURL('https://www.tiktok.com/@thejitterapp')}
            >
              <Image source={require('../../assets/tiktokrealreal.png')} style={styles.socialIconImage} />
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
  editInputIconImage: {
    width: 24,
    height: 24,
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
    flexDirection: 'column',
  },
  widgetRowEnabled: {
    backgroundColor: Theme.colors.primaryGreen + '10', // Light green background
  },
  widgetContent: {
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
  widgetIconImage: {
    width: 24,
    height: 24,
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
  notificationIconImage: {
    width: 24,
    height: 24,
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
  settingIconImage: {
    width: 20,
    height: 20,
    marginRight: Theme.spacing.md,
    marginLeft: 2, // Center align with text icons
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
    textAlign: 'center',
  },
  socialIconImage: {
    width: 24,
    height: 24,
  },
  bottomSpacing: {
    height: Theme.spacing.xxl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  headerDisableButton: {
    backgroundColor: Theme.colors.accentRed,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.medium,
    alignSelf: 'center',
    marginTop: -2,
  },
  headerDisableButtonText: {
    ...Theme.fonts.button,
    color: Theme.colors.white,
    fontSize: 13,
  },
}); 