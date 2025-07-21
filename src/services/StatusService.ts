export type StatusTrend = 'rising' | 'declining' | 'stable';

/**
 * Result returned by the status calculator.
 */
export interface StatusResult {
  text: string;
  trend: StatusTrend;
  /**
   * Whether the pulsing dot should be shown next to the status text.
   */
  showDot: boolean;
}

/**
 * Calculate the human-readable status string and trend based on the current
 * CaffScore and its difference from the previous score.
 *
 * The logic is a direct extraction of the implementation that originally lived
 * inside `HomeScreen.tsx` so that it can be reused by background tasks (and any
 * other future callers) without duplicating code.
 *
 * @param currentScore      The freshly calculated CaffScore.
 * @param prevScore         The previous CaffScore that we are comparing
 *                          against. This should be whatever was saved on the
 *                          previous run so trends can be detected correctly.
 * @param currentStatusText The status text that was shown to the user before
 *                          this new calculation. This is necessary so that we
 *                          can keep the previous text when the score did not
 *                          change noticeably.
 */
export const calculateStatus = (
  currentScore: number,
  prevScore: number,
  currentStatusText: string,
): StatusResult => {
  const scoreDifference = currentScore - prevScore;
  const epsilon = 0.0001; // Treat values within this range as unchanged

  // If score doesn't change significantly, preserve previous status exactly
  if (Math.abs(scoreDifference) < epsilon) {
    return {
      text: currentStatusText,
      trend: 'stable',
      showDot: true, // Always show pulsing dot in the UI
    };
  }

  // Define score ranges
  const isLowRange = currentScore < 25;
  const isMediumRange = currentScore >= 25 && currentScore < 80;
  const isHighRange = currentScore >= 80;

  let newText = '';
  let trend: StatusTrend = 'stable';
  let showDot = true;

  // Handle zero score specifically
  if (currentScore === 0) {
    newText = 'No active caffeine detected';
    trend = 'stable';
    showDot = true; // Always show pulsing dot
  }
  // Rising trend
  else if (scoreDifference > 0) {
    trend = 'rising';
    if (isLowRange) {
      newText = 'Caffeine being absorbed';
    } else if (isMediumRange) {
      newText = 'Caffeine levels rising';
    } else if (isHighRange) {
      newText = 'Peak caffeine effect active';
    }
  }
  // Declining trend
  else if (scoreDifference < 0) {
    trend = 'declining';
    if (isLowRange) {
      newText = 'Effects wearing off';
    } else if (isMediumRange) {
      newText = 'Caffeine leaving your system';
    } else if (isHighRange) {
      newText = 'Caffeine leaving your system';
    }
  }

  return { text: newText, trend, showDot };
}; 