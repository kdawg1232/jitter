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
} from 'react-native';
import { Theme } from '../theme/colors';
import { StorageService } from '../services/StorageService';
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

  useEffect(() => {
    loadUserProfile();
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

  const handleWidgetSetup = () => {
    Alert.alert(
      'Widget Setup',
      'Widget setup functionality coming soon!',
      [{ text: 'OK' }]
    );
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
                  <Text style={styles.widgetTitle}>widget not set up</Text>
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