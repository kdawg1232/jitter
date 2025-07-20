import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Theme } from '../theme/colors';

interface HelpSupportScreenProps {
  onBack: () => void;
}

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    question: "i want to report a bug",
    answer: "If you've found a bug, please contact us at support@jitterapp.com with details about what happened and your device model. We'll get it fixed as soon as possible!"
  },
  {
    question: "why is my health score so low?",
    answer: "Your health score is based on sleep quality, caffeine intake timing, and focus patterns. Try consuming caffeine earlier in the day and maintaining consistent sleep to improve your score."
  },
  {
    question: "how do i customize my goal?",
    answer: "You can set custom caffeine limits and sleep goals in the Settings tab. Tap on your current goals to edit them and set personalized targets that work for your lifestyle."
  },
  {
    question: "why are there data loading issues in the app?",
    answer: "Data loading issues usually resolve by refreshing the app. If problems continue, check your internet connection and restart the app. Contact support if issues persist."
  },
  {
    question: "i have a feature request",
    answer: "We love hearing your ideas! Send feature requests to feedback@jitterapp.com. We prioritize the most requested features and regularly update the app with improvements."
  }
];

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({ onBack }) => {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>help & support</Text>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>frequently asked questions</Text>
          <View style={styles.faqContainer}>
            {FAQ_DATA.map((faq, index) => (
              <View key={index} style={styles.faqItem}>
                <TouchableOpacity
                  style={styles.faqQuestion}
                  onPress={() => toggleFAQ(index)}
                >
                  <Text style={styles.questionText}>{faq.question}</Text>
                  <Text style={styles.expandIcon}>
                    {expandedFAQ === index ? '−' : '+'}
                  </Text>
                </TouchableOpacity>
                
                {expandedFAQ === index && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.answerText}>{faq.answer}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Founder Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>from the founder</Text>
          <View style={styles.founderContainer}>
            <Text style={styles.founderMessage}>
              this is just the beginning for jitter. we're constantly working to improve our caffeine metabolism algorithm and will incorporate the features that are wanted most. your feedback drives our development, so keep those suggestions coming!
              {'\n\n'}
              thank you for choosing jitter to optimize your caffeine intake and cognitive performance. together, we're building something truly special.
            </Text>
            
            <Text style={styles.founderSignature}>-founder, jitter</Text>
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
  header: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.sm,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: Theme.spacing.sm,
    marginLeft: -Theme.spacing.sm,
  },
  backText: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.primaryBlue,
    fontSize: 18,
  },
  scrollView: {
    flex: 1,
  },
  title: {
    ...Theme.fonts.bigTitle,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
  },
  section: {
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.xl,
  },
  sectionHeader: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.md,
  },
  faqContainer: {
    backgroundColor: Theme.colors.cardBg,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: Theme.colors.cardStroke,
    overflow: 'hidden',
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.divider,
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.md,
  },
  questionText: {
    ...Theme.fonts.body,
    color: Theme.colors.textPrimary,
    flex: 1,
    fontWeight: '500',
  },
  expandIcon: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textSecondary,
    fontSize: 20,
    fontWeight: '300',
    marginLeft: Theme.spacing.md,
  },
  faqAnswer: {
    backgroundColor: Theme.colors.canvas,
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
  },
  answerText: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    lineHeight: 20,
  },
  founderContainer: {
    backgroundColor: Theme.colors.cardBg,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: Theme.colors.cardStroke,
    padding: Theme.spacing.lg,
  },
  founderMessage: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: Theme.spacing.lg,
  },
  founderSignature: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  bottomSpacing: {
    height: Theme.spacing.xxl,
  },
}); 