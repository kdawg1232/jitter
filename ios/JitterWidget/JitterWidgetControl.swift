//
//  JitterWidgetControl.swift
//  JitterWidget
//
//  Created by Karthik Digavalli on 7/19/25.
//

import AppIntents
import SwiftUI
import WidgetKit

@available(iOS 18.0, *)
struct JitterWidgetControl: ControlWidget {
    static let kind: String = "com.karthikdigavalli.jitter.JitterWidget"

    var body: some ControlWidgetConfiguration {
        AppIntentControlConfiguration(
            kind: Self.kind,
            provider: Provider()
        ) { value in
            ControlWidgetToggle(
                "Start Timer",
                isOn: value.isRunning,
                action: StartTimerIntent(value.name)
            ) { isRunning in
                Label(isRunning ? "On" : "Off", systemImage: "timer")
            }
        }
        .displayName("Timer")
        .description("A timer control for tracking caffeine intake.")
    }
}

@available(iOS 18.0, *)
extension JitterWidgetControl {
    struct Value {
        var isRunning: Bool
        var name: String
    }

    struct Provider: AppIntentControlValueProvider {
        func previewValue(configuration: TimerConfiguration) -> Value {
            JitterWidgetControl.Value(isRunning: false, name: configuration.timerName)
        }

        func currentValue(configuration: TimerConfiguration) async throws -> Value {
            // Check if there's an active drink session
            let session = WidgetDataManager.shared.getDrinkSession()
            let isRunning = session?.isActive ?? false
            return JitterWidgetControl.Value(isRunning: isRunning, name: configuration.timerName)
        }
    }
}

@available(iOS 18.0, *)
struct TimerConfiguration: ControlConfigurationIntent {
    static let title: LocalizedStringResource = "Timer Name Configuration"

    @Parameter(title: "Timer Name", default: "Caffeine Timer")
    var timerName: String
}

@available(iOS 18.0, *)
struct StartTimerIntent: SetValueIntent {
    static let title: LocalizedStringResource = "Start a timer"

    @Parameter(title: "Timer Name")
    var name: String

    @Parameter(title: "Timer is running")
    var value: Bool

    init() {
        self.name = ""
        self.value = false
    }

    init(_ name: String) {
        self.name = name
        self.value = true
    }

    func perform() async throws -> some IntentResult {
        // Start or stop the timer based on the value
        if value {
            // Start the timer
            let sessionId = UUID().uuidString
            let session = WidgetDataManager.shared.startDrinkSession()
            print("[StartTimerIntent] ✅ Timer started: \(session.id)")
        } else {
            // Stop the timer
            WidgetDataManager.shared.clearDrinkSession()
            print("[StartTimerIntent] ⏹️ Timer stopped")
        }
        
        // Reload widget timelines
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadTimelines(ofKind: "JitterWidget")
        }
        
        return .result()
    }
}
