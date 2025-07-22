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
        logger.info("🔍 Attempting to read widget data from App Groups...")
        
        guard let defaults = userDefaults else {
            logger.error("❌ Failed to initialize UserDefaults with suite name: \(self.suiteName)")
            return nil
        }
        
        logger.info("✅ UserDefaults initialized successfully")
        
        // List all keys to see what's actually stored
        let allKeys = defaults.dictionaryRepresentation().keys
        logger.info("📋 All keys in App Groups: \(Array(allKeys))")
        
        guard let data = defaults.data(forKey: "jitter_widget_data") else {
            logger.info("❌ No widget data found in App Groups for key 'jitter_widget_data'")
            
            // Check if there's any data at all
            if allKeys.isEmpty {
                logger.info("📭 App Groups UserDefaults is completely empty")
            } else {
                logger.info("📦 App Groups contains \(allKeys.count) keys but not 'jitter_widget_data'")
            }
            return nil
        }
        
        logger.info("✅ Found widget data in App Groups (\(data.count) bytes)")
        
        // Try to convert to string to see the raw JSON
        if let jsonString = String(data: data, encoding: .utf8) {
            logger.info("📄 Raw JSON data: \(jsonString)")
        }
        
        do {
            let widgetData = try JSONDecoder().decode(JitterWidgetData.self, from: data)
            logger.info("✅ Widget data decoded successfully: CaffScore=\(widgetData.caffScore), Caffeine=\(widgetData.currentCaffeineLevel)mg, UserId=\(widgetData.userId)")
            return widgetData
        } catch {
            logger.error("❌ Failed to decode widget data: \(error.localizedDescription)")
            logger.error("❌ Decoding error details: \(String(describing: error))")
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