import AppIntents
import WidgetKit

// MARK: - Start Drink Intent
@available(iOS 18.0, *)
struct StartDrinkIntent: AppIntent {
    static var title: LocalizedStringResource = "Start Drink Timer"
    static var description = IntentDescription("Starts the drink timer in the widget")
    static var openAppWhenRun: Bool = false
    
    func perform() async throws -> some IntentResult {
        print("[StartDrinkIntent] 🚀 Starting drink timer from widget")
        
        do {
            let session = WidgetDataManager.shared.startDrinkSession()
            
            // Reload widget timelines to show timer
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadTimelines(ofKind: "JitterWidget")
            }
            
            print("[StartDrinkIntent] ✅ Timer started: \(session.id)")
            
            return .result(dialog: "Drink timer started! ⏱️")
        } catch {
            print("[StartDrinkIntent] ❌ Failed to start timer: \(error)")
            return .result(dialog: "Failed to start timer")
        }
    }
}

// MARK: - Complete Drink Intent
@available(iOS 18.0, *)
struct CompleteDrinkIntent: AppIntent {
    static var title: LocalizedStringResource = "Complete Drink"
    static var description = IntentDescription("Completes the drink and opens the app")
    static var openAppWhenRun: Bool = true
    
    @Parameter(title: "Session ID")
    var sessionId: String
    
    init() {
        self.sessionId = ""
    }
    
    init(sessionId: String) {
        self.sessionId = sessionId
    }
    
    func perform() async throws -> some IntentResult {
        print("[CompleteDrinkIntent] ✅ Completing drink session: \(sessionId)")
        
        do {
            // Clear the active session
            WidgetDataManager.shared.clearDrinkSession()
            
            // Open main app with drink completion data
            guard let url = URL(string: "jitter://complete-drink?sessionId=\(sessionId)") else {
                throw IntentError.invalidURL
            }
            
            // Use proper iOS 18+ URL opening
            if #available(iOS 18.0, *) {
                try await OpenURLIntent(url).perform()
            }
            
            // Reload widget to show scores view
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadTimelines(ofKind: "JitterWidget")
            }
            
            print("[CompleteDrinkIntent] 📱 Opening app with URL: \(url)")
            
            return .result(dialog: "Opening Jitter to complete your drink! ☕")
        } catch {
            print("[CompleteDrinkIntent] ❌ Failed to complete drink: \(error)")
            return .result(dialog: "Failed to complete drink")
        }
    }
}

// MARK: - Supporting Types
enum IntentError: Error {
    case invalidURL
}
