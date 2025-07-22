import WidgetKit
import SwiftUI
import os.log

struct JitterWidgetProvider: TimelineProvider {
    private let logger = Logger(subsystem: "com.karthikdigavalli.jitter", category: "JitterWidgetProvider")
    
    func placeholder(in context: Context) -> JitterWidgetEntry {
        logger.info("📱 Creating placeholder entry")
        return JitterWidgetEntry(
            date: Date(),
            data: .placeholder,
            session: nil
        )
    }
    
    func getSnapshot(in context: Context, completion: @escaping (JitterWidgetEntry) -> Void) {
        logger.info("📸 Creating snapshot entry")
        let data = WidgetDataManager.shared.getWidgetData()
        let session = WidgetDataManager.shared.getDrinkSession()
        
        logger.info("📸 Snapshot data: CaffScore=\(data?.caffScore ?? -1), HasSession=\(session != nil)")
        
        let entry = JitterWidgetEntry(date: Date(), data: data, session: session)
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<JitterWidgetEntry>) -> Void) {
        let currentDate = Date()
        logger.info("⏰ Creating timeline entries at \(currentDate)")
        
        let data = WidgetDataManager.shared.getWidgetData()
        let session = WidgetDataManager.shared.getDrinkSession()
        
        logger.info("⏰ Timeline data: CaffScore=\(data?.caffScore ?? -1), Caffeine=\(data?.currentCaffeineLevel ?? -1)mg, HasSession=\(session != nil)")
        
        if let data = data {
            logger.info("⏰ Data details: LastUpdated=\(data.lastUpdated), UserId=\(data.userId)")
        } else {
            logger.warning("⚠️ No widget data available - using placeholder")
        }
        
        var entries: [JitterWidgetEntry] = []
        var reloadPolicy: TimelineReloadPolicy
        
        if let session = session, session.isActive {
            // During active timer: More efficient updates
            logger.info("⏱️ Creating timer timeline - optimized updates")
            
            // Create entries for the next 30 minutes with smart intervals
            let maxDuration: TimeInterval = 30 * 60 // 30 minutes
            let intervals: [TimeInterval] = [5, 10, 15, 30, 60] // Smart intervals
            
            var currentTime = currentDate
            var intervalIndex = 0
            
            while currentTime.timeIntervalSince(currentDate) < maxDuration && intervalIndex < intervals.count {
                let entry = JitterWidgetEntry(date: currentTime, data: data, session: session)
                entries.append(entry)
                
                // Use shorter intervals for first few updates, then longer
                let interval = intervals[min(intervalIndex, intervals.count - 1)]
                currentTime = currentTime.addingTimeInterval(interval)
                intervalIndex += 1
            }
            
            reloadPolicy = .atEnd
        } else {
            // Normal state: Less frequent updates for better battery life
            logger.info("📊 Creating normal timeline - battery optimized")
            
            // Update every 15 minutes for next 2 hours
            for i in 0..<8 {
                let entryDate = Calendar.current.date(byAdding: .minute, value: i * 15, to: currentDate)!
                let entry = JitterWidgetEntry(date: entryDate, data: data, session: session)
                entries.append(entry)
            }
            
            reloadPolicy = .after(Calendar.current.date(byAdding: .hour, value: 2, to: currentDate)!)
        }
        
        logger.info("⏰ Created \(entries.count) timeline entries with policy: \(String(describing: reloadPolicy))")
        
        let timeline = Timeline(entries: entries, policy: reloadPolicy)
        completion(timeline)
    }
}

struct JitterWidgetEntry: TimelineEntry {
    let date: Date
    let data: JitterWidgetData?
    let session: DrinkSession?
} 