# Jitter iOS Widget Implementation Guide

## Overview
This guide walks through creating a native iOS widget that displays Jitter scores and provides drink tracking functionality with interactive buttons and timer display.

## Widget Requirements
- Display focus score and crash score
- "Add Drink" button that starts sipping timer
- Real-time timer display during sipping
- Green checkmark button to complete and open app
- Deep linking to pass drink data to main app

## Step 1: Create Widget Extension Target

### In Xcode (after development build completes):

1. **Open iOS project**:
   ```bash
   cd ios
   open Jitter.xcworkspace
   ```

2. **Add Widget Extension**:
   - File → New → Target
   - Choose "Widget Extension"
   - Product Name: "JitterWidget"
   - Language: Swift
   - Use Core Data: No
   - Include Configuration Intent: Yes

3. **Configure App Groups**:
   - Select main app target → Capabilities → App Groups
   - Add group: `group.com.karthikdigavalli.jitter.shared`
   - Repeat for widget target

## Step 2: Widget Data Models

Create `WidgetData.swift` in the widget target:

```swift
import Foundation

struct JitterWidgetData: Codable {
    let crashRiskScore: Int
    let focusScore: Int
    let currentCaffeineLevel: Int
    let lastDrinkTime: String?
    let lastDrinkName: String?
    let lastUpdated: String
    let riskLevel: String
    let userId: String
    
    // Timer state
    let isTimerActive: Bool?
    let timerStartTime: String?
    let elapsedSeconds: Int?
}

struct DrinkSession: Codable {
    let id: String
    let startTime: Date
    let isActive: Bool
    let elapsedSeconds: Int
}
```

## Step 3: Data Sharing Service

Create `WidgetDataManager.swift`:

```swift
import Foundation

class WidgetDataManager {
    static let shared = WidgetDataManager()
    private let suiteName = "group.com.karthikdigavalli.jitter.shared"
    
    private var userDefaults: UserDefaults? {
        UserDefaults(suiteName: suiteName)
    }
    
    func getWidgetData() -> JitterWidgetData? {
        guard let defaults = userDefaults,
              let data = defaults.data(forKey: "jitter_widget_data"),
              let widgetData = try? JSONDecoder().decode(JitterWidgetData.self, from: data) else {
            return nil
        }
        return widgetData
    }
    
    func saveWidgetData(_ data: JitterWidgetData) {
        guard let defaults = userDefaults,
              let encoded = try? JSONEncoder().encode(data) else {
            return
        }
        defaults.set(encoded, forKey: "jitter_widget_data")
    }
    
    func startDrinkSession() -> DrinkSession {
        let session = DrinkSession(
            id: UUID().uuidString,
            startTime: Date(),
            isActive: true,
            elapsedSeconds: 0
        )
        saveDrinkSession(session)
        return session
    }
    
    func getDrinkSession() -> DrinkSession? {
        guard let defaults = userDefaults,
              let data = defaults.data(forKey: "active_drink_session"),
              let session = try? JSONDecoder().decode(DrinkSession.self, from: data) else {
            return nil
        }
        return session
    }
    
    func saveDrinkSession(_ session: DrinkSession) {
        guard let defaults = userDefaults,
              let encoded = try? JSONEncoder().encode(session) else {
            return
        }
        defaults.set(encoded, forKey: "active_drink_session")
    }
    
    func clearDrinkSession() {
        userDefaults?.removeObject(forKey: "active_drink_session")
    }
}
```

## Step 4: Widget Views

Create `JitterWidgetView.swift`:

```swift
import SwiftUI
import WidgetKit

struct JitterWidgetView: View {
    let data: JitterWidgetData?
    let session: DrinkSession?
    
    var body: some View {
        if let session = session, session.isActive {
            TimerView(session: session, data: data)
        } else {
            ScoresView(data: data)
        }
    }
}

struct ScoresView: View {
    let data: JitterWidgetData?
    
    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 16) {
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
            
            Button(intent: StartDrinkIntent()) {
                HStack {
                    Image(systemName: "plus.circle.fill")
                    Text("Add Drink")
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(20)
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
    }
    
    private var riskColor: Color {
        guard let risk = data?.crashRiskScore else { return .gray }
        if risk >= 71 { return .red }
        if risk >= 31 { return .orange }
        return .green
    }
}

struct TimerView: View {
    let session: DrinkSession
    let data: JitterWidgetData?
    
    private var elapsedTime: String {
        let totalSeconds = Int(Date().timeIntervalSince(session.startTime))
        let hours = totalSeconds / 3600
        let minutes = (totalSeconds % 3600) / 60
        let seconds = totalSeconds % 60
        
        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
    }
    
    var body: some View {
        VStack(spacing: 12) {
            Text("Sipping in progress")
                .font(.headline)
                .foregroundColor(.blue)
            
            Text(elapsedTime)
                .font(.system(size: 32, weight: .bold, design: .monospaced))
                .foregroundColor(.primary)
            
            Button(intent: CompleteDrinkIntent(sessionId: session.id)) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.green)
            }
            .buttonStyle(PlainButtonStyle())
            
            Text("Tap ✓ to complete")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
    }
}

struct ScoreCard: View {
    let title: String
    let score: Int
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            Text("\(score)")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(8)
    }
}
```

## Step 5: Widget Intents

Create `WidgetIntents.swift`:

```swift
import AppIntents
import WidgetKit

@available(iOS 17.0, *)
struct StartDrinkIntent: AppIntent {
    static var title: LocalizedStringResource = "Start Drink Timer"
    
    func perform() async throws -> some IntentResult {
        let session = WidgetDataManager.shared.startDrinkSession()
        
        // Reload widget timelines to show timer
        WidgetCenter.shared.reloadTimelines(ofKind: "JitterWidget")
        
        return .result()
    }
}

@available(iOS 17.0, *)
struct CompleteDrinkIntent: AppIntent {
    static var title: LocalizedStringResource = "Complete Drink"
    
    @Parameter(title: "Session ID")
    var sessionId: String
    
    init() {
        self.sessionId = ""
    }
    
    init(sessionId: String) {
        self.sessionId = sessionId
    }
    
    func perform() async throws -> some IntentResult {
        // Clear the active session
        WidgetDataManager.shared.clearDrinkSession()
        
        // Open main app with drink completion data
        let url = URL(string: "jitter://complete-drink?sessionId=\(sessionId)")!
        await OpenURLIntent(url).perform()
        
        // Reload widget to show scores view
        WidgetCenter.shared.reloadTimelines(ofKind: "JitterWidget")
        
        return .result()
    }
}
```

## Step 6: Widget Timeline Provider

Create `JitterWidgetProvider.swift`:

```swift
import WidgetKit
import SwiftUI

struct JitterWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> JitterWidgetEntry {
        JitterWidgetEntry(
            date: Date(),
            data: JitterWidgetData(
                crashRiskScore: 42,
                focusScore: 78,
                currentCaffeineLevel: 85,
                lastDrinkTime: nil,
                lastDrinkName: nil,
                lastUpdated: Date().ISO8601String(),
                riskLevel: "medium",
                userId: "preview",
                isTimerActive: false,
                timerStartTime: nil,
                elapsedSeconds: nil
            ),
            session: nil
        )
    }
    
    func getSnapshot(in context: Context, completion: @escaping (JitterWidgetEntry) -> Void) {
        let data = WidgetDataManager.shared.getWidgetData()
        let session = WidgetDataManager.shared.getDrinkSession()
        let entry = JitterWidgetEntry(date: Date(), data: data, session: session)
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<JitterWidgetEntry>) -> Void) {
        let currentDate = Date()
        let data = WidgetDataManager.shared.getWidgetData()
        let session = WidgetDataManager.shared.getDrinkSession()
        
        var entries: [JitterWidgetEntry] = []
        
        if let session = session, session.isActive {
            // During active timer: update every 10 seconds for 30 minutes max
            for i in 0..<180 { // 30 minutes * 6 updates per minute
                let entryDate = Calendar.current.date(byAdding: .second, value: i * 10, to: currentDate)!
                let entry = JitterWidgetEntry(date: entryDate, data: data, session: session)
                entries.append(entry)
            }
        } else {
            // Normal state: update every 5 minutes
            for i in 0..<12 { // Next hour
                let entryDate = Calendar.current.date(byAdding: .minute, value: i * 5, to: currentDate)!
                let entry = JitterWidgetEntry(date: entryDate, data: data, session: session)
                entries.append(entry)
            }
        }
        
        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
}

struct JitterWidgetEntry: TimelineEntry {
    let date: Date
    let data: JitterWidgetData?
    let session: DrinkSession?
}
```

## Step 7: Main Widget Configuration

Update `JitterWidget.swift`:

```swift
import WidgetKit
import SwiftUI

@main
struct JitterWidget: Widget {
    let kind: String = "JitterWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: JitterWidgetProvider()) { entry in
            JitterWidgetView(data: entry.data, session: entry.session)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Jitter Dashboard")
        .description("Track your caffeine intake and crash risk")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
```

## Step 8: React Native Bridge Updates

Update your `WidgetService.ts` to write to App Groups:

```typescript
// Add this method to WidgetService
static async updateNativeWidgetData(widgetData: WidgetData): Promise<void> {
  try {
    // This will be called from native iOS code to write to App Groups
    // The development build will include native modules for this
    console.log('[WidgetService] 📱 Updating native widget data');
    
    // For now, we'll store in AsyncStorage
    // In the native implementation, this will write to App Groups UserDefaults
    await this.setItem(this.WIDGET_DATA_KEY, JSON.stringify(widgetData));
  } catch (error) {
    console.error('[WidgetService] ❌ Error updating native widget data:', error);
  }
}
```

## Step 9: Deep Linking Setup

Add URL scheme to `app.json`:

```json
{
  "expo": {
    "scheme": "jitter",
    "ios": {
      "bundleIdentifier": "com.karthikdigavalli.jitter",
      "supportsTablet": true,
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false,
        "CFBundleURLTypes": [
          {
            "CFBundleURLName": "jitter",
            "CFBundleURLSchemes": ["jitter"]
          }
        ]
      }
    }
  }
}
```

## Implementation Timeline

1. **Wait for EAS build** (10-15 minutes)
2. **Download and install** development build on device
3. **Open in Xcode** and add widget extension target (15 minutes)
4. **Implement widget code** following above steps (45 minutes)
5. **Test widget functionality** on device (15 minutes)

## Widget Behavior

- **Default**: Shows focus score, crash score, "Add Drink" button
- **Timer Active**: Shows elapsed time and green checkmark
- **Completion**: Opens app with drink session data for final recording

The widget will update every 10 seconds during timer mode and every 5 minutes in normal mode, with iOS controlling the actual update frequency.

## Next Steps

Once your EAS build completes, we'll:
1. Set up the widget extension in Xcode
2. Implement the Swift code above
3. Test the widget functionality
4. Handle the deep linking in your React Native app

Would you like me to prepare the React Native deep linking handler while we wait for the build? 