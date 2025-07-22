import Foundation
import WidgetKit

@objc(JitterWidgetCenter)
public class JitterWidgetCenter: NSObject {
    /// Reloads the timelines for the main Jitter widget.
    @objc public static func reloadTimeline() {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadTimelines(ofKind: "JitterWidget")
        }
    }
}