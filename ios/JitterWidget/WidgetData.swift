import Foundation

struct JitterWidgetData: Codable {
    // Use Double to allow decoding of both Int and floating-point numbers coming from JSON
    let caffScore: Double // CaffScore from React Native (0-100)
    let currentCaffeineLevel: Double
    let lastDrinkTime: String?
    let lastDrinkName: String?
    let nextOptimalTime: String?
    let lastUpdated: String
    let userId: String
    
    static let placeholder = JitterWidgetData(
        caffScore: 54,
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