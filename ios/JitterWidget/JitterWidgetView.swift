import SwiftUI
import WidgetKit

struct JitterWidgetView: View {
    let data: JitterWidgetData?
    let session: DrinkSession?
    
    var body: some View {
        Group {
            if let session = session, session.isActive {
                TimerView(session: session, data: data)
            } else {
                ScoresView(data: data)
            }
        }
        .widgetAccentable() // iOS 17+ - Allow accent color customization
    }
}

struct ScoresView: View {
    let data: JitterWidgetData?
    
    var body: some View {
        VStack(spacing: 10) {
            // Scores Row
            HStack(spacing: 12) {
                ScoreCard(
                    title: "Focus",
                    score: data?.focusScore ?? 0,
                    color: .blue
                )
                ScoreCard(
                    title: "Crash Risk",
                    score: data?.crashRiskScore ?? 0,
                    color: riskColor
                )
            }
            
            // Add Drink Button - Now available on iOS 18+
            if #available(iOS 18.0, *) {
                Button(intent: StartDrinkIntent()) {
                    HStack(spacing: 6) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 14, weight: .semibold))
                            .imageScale(.medium)
                        Text("Add Drink")
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(.blue.gradient, in: RoundedRectangle(cornerRadius: 20))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Start drink timer")
                .accessibilityHint("Double tap to start tracking your caffeine intake")
            } else {
                // This shouldn't be needed since we're targeting iOS 18+, but keeping for safety
                HStack(spacing: 6) {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 14, weight: .semibold))
                        .imageScale(.medium)
                    Text("Add Drink")
                        .font(.system(size: 14, weight: .semibold))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(.blue.gradient, in: RoundedRectangle(cornerRadius: 20))
            }
        }
        .padding(12)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Jitter Dashboard")
    }
    
    private var riskColor: Color {
        guard let risk = data?.crashRiskScore else { return .secondary }
        switch risk {
        case 71...:
            return .red
        case 31...70:
            return .orange
        default:
            return .green
        }
    }
}

struct TimerView: View {
    let session: DrinkSession
    let data: JitterWidgetData?
    
    var body: some View {
        VStack(spacing: 12) {
            // Sipping Header with animation
            HStack(spacing: 4) {
                Image(systemName: "cup.and.saucer.fill")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.blue)
                Text("Sipping in progress")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.blue)
            }
            .symbolEffect(.pulse.byLayer, options: .repeating)
            
            // Timer Display with better typography
            Text(session.formattedTime)
                .font(.system(size: 28, weight: .bold, design: .monospaced))
                .foregroundStyle(.primary)
                .contentTransition(.numericText())
                .accessibilityLabel("Timer: \(session.formattedTime)")
            
            // Checkmark Button with enhanced design - iOS 18+ interactive
            if #available(iOS 18.0, *) {
                Button(intent: CompleteDrinkIntent(sessionId: session.id)) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 36, weight: .medium))
                        .foregroundStyle(.white)
                        .background(.green.gradient, in: Circle())
                        .symbolEffect(.bounce, value: session.elapsedSeconds)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Complete drink")
                .accessibilityHint("Double tap to finish tracking and open the app")
            } else {
                // This shouldn't be needed since we're targeting iOS 18+, but keeping for safety
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 36, weight: .medium))
                    .foregroundStyle(.white)
                    .background(.green.gradient, in: Circle())
            }
            
            // Instruction Text
            Text("Tap ✓ to complete")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.secondary)
        }
        .padding(12)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Drink timer: \(session.formattedTime)")
    }
}

struct ScoreCard: View {
    let title: String
    let score: Int
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
                .tracking(0.5)
            
            Text("\(score)")
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundStyle(color.gradient)
                .contentTransition(.numericText())
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .padding(.horizontal, 4)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(title): \(score)")
    }
} 