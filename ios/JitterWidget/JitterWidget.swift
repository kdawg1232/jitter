//
//  JitterWidget.swift
//  JitterWidget
//
//  Created by Karthik Digavalli on 7/19/25.
//

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
        .description("Track your caffeine intake and crash risk with quick timer functionality")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
