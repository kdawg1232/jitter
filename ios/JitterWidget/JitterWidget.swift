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
                .containerBackground(Color(red: 0.953, green: 0.925, blue: 1.0), for: .widget) // #F3ECFF
        }
        .configurationDisplayName("Jitter CaffScore")
        .description("See your real-time caffeine focus score and track drink consumption")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
