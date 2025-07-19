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
    
    static let placeholder = JitterWidgetData(
        crashRiskScore: 42,
        focusScore: 78,
        currentCaffeineLevel: 85,
        lastDrinkTime: nil,
        lastDrinkName: "Coffee",
        lastUpdated: Date().ISO8601String(),
        riskLevel: "medium",
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