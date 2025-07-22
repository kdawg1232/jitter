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
                CaffScoreView(data: data)
            }
        }
        .widgetAccentable() // iOS 17+ - Allow accent color customization
    }
}

struct CaffScoreView: View {
    let data: JitterWidgetData?
    
    var body: some View {
        VStack(spacing: 6) {
            // Mascot
            HStack {
                Spacer()
                Image("jitter-mascot")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 45, height: 54)
                Spacer()
            }
            
            // CaffScore Number - Use placeholder if no data
            Text("\(data?.caffScore ?? 54)")
                .font(.system(size: 32, weight: .heavy, design: .rounded))
                .foregroundStyle(Color.primary)
            
            // Progress Bar
            GeometryReader { geometry in
                RoundedRectangle(cornerRadius: 3)
                    .fill(Color(red: 0.902, green: 0.859, blue: 1.0)) // #E6DBFF
                    .frame(height: 4)
                    .overlay(
                        HStack {
                            RoundedRectangle(cornerRadius: 3)
                                .fill(progressBarColor)
                                .frame(width: geometry.size.width * progressPercentage, height: 4)
                            Spacer(minLength: 0)
                        }
                    )
            }
            .frame(height: 4)
            
            // CaffScore Label
            Text("CaffScore")
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(Color(red: 0.431, green: 0.416, blue: 0.498)) // #6E6A7F
                .textCase(.lowercase)
            
            // Status Text - Always show something
            Text(getStatusText())
                .font(.system(size: 8, weight: .medium))
                .foregroundStyle(Color(red: 0.431, green: 0.416, blue: 0.498)) // #6E6A7F
                .multilineTextAlignment(.center)
                .lineLimit(2)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(red: 0.953, green: 0.925, blue: 1.0)) // #F3ECFF
        )
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Jitter CaffScore: \(data?.caffScore ?? 54)")
    }
    
    private var progressPercentage: CGFloat {
        let score = CGFloat(data?.caffScore ?? 54)
        return min(score / 100.0, 1.0)
    }
    
    private var progressBarColor: Color {
        let score = data?.caffScore ?? 54
        switch score {
        case 80...:
            return Color(red: 0.184, green: 0.741, blue: 0.376) // #2FBD60 - Primary Green
        case 50...79:
            return Color(red: 0.373, green: 0.439, blue: 1.0)   // #5F70FF - Primary Blue
        case 25...49:
            return Color(red: 1.0, green: 0.835, blue: 0.420)   // #FFD56B - Accent Orange
        default:
            return Color(red: 1.0, green: 0.294, blue: 0.294)   // #FF4B4B - Accent Red
        }
    }
    
    private func getStatusText() -> String {
        let score = data?.caffScore ?? 54
        
        // Always return a status, even for placeholder
        switch score {
        case 80...:
            return "Peak caffeine effect active"
        case 50...79:
            return "Moderate caffeine boost"
        case 25...49:
            return "Effects wearing off"
        case 1...24:
            return "Minimal caffeine effect"
        default:
            return "No active caffeine detected"
        }
    }
}

struct TimerView: View {
    let session: DrinkSession
    let data: JitterWidgetData?
    
    var body: some View {
        VStack(spacing: 8) {
            // Sipping Header with mascot
            HStack {
                Spacer()
                Image("jitter-mascot")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 30, height: 36)
                Spacer()
            }
            
            // Sipping text
            HStack(spacing: 4) {
                Image(systemName: "cup.and.saucer.fill")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(Color(red: 0.373, green: 0.439, blue: 1.0)) // #5F70FF
                Text("Sipping in progress")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Color(red: 0.373, green: 0.439, blue: 1.0)) // #5F70FF
            }
            .symbolEffect(.pulse.byLayer, options: .repeating)
            
            // Timer Display
            Text(session.formattedTime)
                .font(.system(size: 20, weight: .bold, design: .monospaced))
                .foregroundStyle(.primary)
                .contentTransition(.numericText())
                .accessibilityLabel("Timer: \(session.formattedTime)")
            
            // Checkmark Button - iOS 18+ interactive
            if #available(iOS 18.0, *) {
                Button(intent: CompleteDrinkIntent(sessionId: session.id)) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 28, weight: .medium))
                        .foregroundStyle(.white)
                        .background(
                            Circle()
                                .fill(Color(red: 0.184, green: 0.741, blue: 0.376)) // #2FBD60
                        )
                        .symbolEffect(.bounce, value: session.elapsedSeconds)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Complete drink")
                .accessibilityHint("Double tap to finish tracking and open the app")
            }
            
            // Instruction Text
            Text("Tap ✓ to complete")
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(Color(red: 0.431, green: 0.416, blue: 0.498)) // #6E6A7F
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(red: 0.953, green: 0.925, blue: 1.0)) // #F3ECFF
        )
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Drink timer: \(session.formattedTime)")
    }
}

// SwiftUI Previews for development
struct JitterWidgetView_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            JitterWidgetView(data: .placeholder, session: nil)
                .previewContext(WidgetPreviewContext(family: .systemSmall))
                .previewDisplayName("CaffScore Widget")
            
            JitterWidgetView(
                data: .placeholder, 
                session: DrinkSession(id: "preview", startTime: Date().addingTimeInterval(-300), isActive: true)
            )
            .previewContext(WidgetPreviewContext(family: .systemSmall))
            .previewDisplayName("Timer Widget")
        }
    }
} 