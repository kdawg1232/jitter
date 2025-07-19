//
//  JitterWidgetLiveActivity.swift
//  JitterWidget
//
//  Created by Karthik Digavalli on 7/19/25.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct JitterWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct JitterWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: JitterWidgetAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack {
                Text("Hello \(context.state.emoji)")
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    Text("Leading")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Trailing")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Bottom \(context.state.emoji)")
                    // more content
                }
            } compactLeading: {
                Text("L")
            } compactTrailing: {
                Text("T \(context.state.emoji)")
            } minimal: {
                Text(context.state.emoji)
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

extension JitterWidgetAttributes {
    fileprivate static var preview: JitterWidgetAttributes {
        JitterWidgetAttributes(name: "World")
    }
}

extension JitterWidgetAttributes.ContentState {
    fileprivate static var smiley: JitterWidgetAttributes.ContentState {
        JitterWidgetAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: JitterWidgetAttributes.ContentState {
         JitterWidgetAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: JitterWidgetAttributes.preview) {
   JitterWidgetLiveActivity()
} contentStates: {
    JitterWidgetAttributes.ContentState.smiley
    JitterWidgetAttributes.ContentState.starEyes
}
