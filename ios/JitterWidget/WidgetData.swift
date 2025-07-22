import Foundation

struct JitterWidgetData: Codable {
    let caffScore: Int // This is the CaffScore from React Native
    let currentCaffeineLevel: Int
    let lastDrinkTime: String?
    let lastDrinkName: String?
    let nextOptimalTime: String?
    let lastUpdated: String
    let userId: String
    
    static let placeholder = JitterWidgetData(
        caffScore: 54, // Using 54 as shown in the mascot sketch
        currentCaffeineLevel: 120,
        lastDrinkTime: nil,
        lastDrinkName: "Coffee",
        nextOptimalTime: nil,
        lastUpdated: Date().ISO8601String(),
        userId: "preview"
    )
}

struct DrinkSession: Codable {
    let id: String
    let startTime: Date
    let isActive: Bool
    
    var elapsedSeconds: Int {
        Int(Date().timeIntervalSince(startTime))
    }
    
    var formattedTime: String {
        let totalSeconds = elapsedSeconds
        let hours = totalSeconds / 3600
        let minutes = (totalSeconds % 3600) / 60
        let seconds = totalSeconds % 60
        
        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
    }
}

extension Date {
    func ISO8601String() -> String {
        let formatter = ISO8601DateFormatter()
        return formatter.string(from: self)
    }
} 