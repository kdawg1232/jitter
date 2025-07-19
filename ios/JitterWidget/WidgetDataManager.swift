import Foundation
import os.log
import WidgetKit

class WidgetDataManager {
    static let shared = WidgetDataManager()
    private let suiteName = "group.com.karthikdigavalli.jitter.shared"
    private let logger = Logger(subsystem: "com.karthikdigavalli.jitter", category: "WidgetDataManager")
    
    private var userDefaults: UserDefaults? {
        UserDefaults(suiteName: suiteName)
    }
    
    func getWidgetData() -> JitterWidgetData? {
        guard let defaults = userDefaults,
              let data = defaults.data(forKey: "jitter_widget_data") else {
            logger.info("No widget data found in App Groups")
            return nil
        }
        
        do {
            let widgetData = try JSONDecoder().decode(JitterWidgetData.self, from: data)
            logger.info("✅ Widget data loaded: Focus=\(widgetData.focusScore), Crash=\(widgetData.crashRiskScore)")
            return widgetData
        } catch {
            logger.error("❌ Failed to decode widget data: \(error.localizedDescription)")
            return nil
        }
    }
    
    func getDrinkSession() -> DrinkSession? {
        guard let defaults = userDefaults,
              let data = defaults.data(forKey: "active_drink_session") else {
            return nil
        }
        
        do {
            // Parse the session data from React Native
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            
            guard let id = json?["id"] as? String,
                  let startTimeInterval = json?["startTime"] as? TimeInterval,
                  let isActive = json?["isActive"] as? Bool else {
                logger.error("❌ Invalid session data format")
                return nil
            }
            
            let startTime = Date(timeIntervalSince1970: startTimeInterval)
            
            let session = DrinkSession(
                id: id,
                startTime: startTime,
                isActive: isActive
            )
            
            logger.info("⏱️ Active session found: \(session.formattedTime)")
            return session
        } catch {
            logger.error("❌ Failed to decode session data: \(error.localizedDescription)")
            return nil
        }
    }
    
    func startDrinkSession() -> DrinkSession {
        let session = DrinkSession(
            id: UUID().uuidString,
            startTime: Date(),
            isActive: true
        )
        saveDrinkSession(session)
        return session
    }
    
    private func saveDrinkSession(_ session: DrinkSession) {
        guard let defaults = userDefaults else { return }
        
        let sessionData: [String: Any] = [
            "id": session.id,
            "startTime": session.startTime.timeIntervalSince1970,
            "isActive": session.isActive
        ]
        
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: sessionData)
            defaults.set(jsonData, forKey: "active_drink_session")
            defaults.synchronize()
            logger.info("✅ Session saved: \(session.id)")
        } catch {
            logger.error("❌ Failed to save session: \(error.localizedDescription)")
        }
    }
    
    func clearDrinkSession() {
        userDefaults?.removeObject(forKey: "active_drink_session")
        userDefaults?.synchronize()
        logger.info("🗑️ Session cleared")
    }
} 