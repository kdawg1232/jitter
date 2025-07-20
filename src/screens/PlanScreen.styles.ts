import { StyleSheet, Dimensions } from 'react-native';
import { Theme } from '../theme/colors';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
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
    marginBottom: Theme.spacing.lg,
  },
  sectionTitle: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    textTransform: 'lowercase',
  },
  sessionsContainer: {
    marginTop: Theme.spacing.xs,
  },
  sectionDate: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textTertiary,
    textTransform: 'lowercase',
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
  sessionTimeAndDate: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    fontWeight: '500',
  },
  sessionDate: {
    ...Theme.fonts.caption,
    color: Theme.colors.textTertiary,
    marginBottom: Theme.spacing.xs,
  },
  sessionImportance: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
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
    padding: Theme.spacing.lg,
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
    marginBottom: Theme.spacing.sm,
  },
  importanceOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  importanceOption: {
    flex: 0.3,
    backgroundColor: Theme.colors.cardBg,
    borderRadius: Theme.borderRadius.small,
    paddingVertical: Theme.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.divider,
  },
  importanceSelected: {
    backgroundColor: Theme.colors.primaryBlue,
    borderColor: Theme.colors.primaryBlue,
  },
  importanceText: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
  },
  importanceTextSelected: {
    color: Theme.colors.white,
    fontWeight: '600',
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
  // Safe time and warning styles
  safeTimeCard: {
    backgroundColor: Theme.colors.cardBg,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    marginTop: Theme.spacing.md,
    alignItems: 'center',
  },
  safeTimeLabel: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    textTransform: 'lowercase',
    marginBottom: Theme.spacing.xs,
  },
  safeTimeValue: {
    ...Theme.fonts.sectionHeading,
    color: Theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Theme.spacing.xs,
  },
  safeTimeSubtext: {
    ...Theme.fonts.caption,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
  sleepWarning: {
    backgroundColor: '#FFF9C4', // Light yellow background
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    marginTop: Theme.spacing.md,
    alignItems: 'center',
  },
  sleepWarningText: {
    ...Theme.fonts.body,
    color: '#F57C00', // Amber text
    fontWeight: '500',
    textAlign: 'center',
  },
  noSessionsContainer: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
  },
  noSessionsText: {
    ...Theme.fonts.body,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
}); 