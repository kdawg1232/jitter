# iOS Native Bridge for Widget Data Sharing

## Overview
This native module enables React Native to write widget data to iOS App Groups, allowing the widget to display real-time Jitter scores and timer information.

## App Groups Setup

### 1. Configure App Groups in Apple Developer Portal
1. Go to [developer.apple.com](https://developer.apple.com)
2. Certificates, Identifiers & Profiles → Identifiers
3. Select your App ID (`com.karthikdigavalli.jitter`)
4. Enable "App Groups" capability
5. Create new App Group: `group.com.karthikdigavalli.jitter.shared`

### 2. Enable App Groups in Xcode
1. Select main app target → Signing & Capabilities
2. Add "App Groups" capability
3. Add group: `group.com.karthikdigavalli.jitter.shared`
4. Repeat for widget extension target

## Native Module Implementation

### Create `JitterWidgetBridge.h`
```objc
#import <React/RCTBridgeModule.h>

@interface JitterWidgetBridge : NSObject <RCTBridgeModule>
@end
```

### Create `JitterWidgetBridge.m`
```objc
#import "JitterWidgetBridge.h"
#import <WidgetKit/WidgetKit.h>

@implementation JitterWidgetBridge

RCT_EXPORT_MODULE(JitterWidgetBridge);

RCT_EXPORT_METHOD(updateWidgetData:(NSDictionary *)widgetData
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSString *suiteName = @"group.com.karthikdigavalli.jitter.shared";
    NSUserDefaults *sharedDefaults = [[NSUserDefaults alloc] initWithSuiteName:suiteName];
    
    if (sharedDefaults) {
        // Convert widget data to JSON
        NSError *error;
        NSData *jsonData = [NSJSONSerialization dataWithJSONObject:widgetData
                                                           options:0
                                                             error:&error];
        
        if (error) {
            reject(@"JSON_ERROR", @"Failed to serialize widget data", error);
            return;
        }
        
        // Store in App Groups UserDefaults
        [sharedDefaults setObject:jsonData forKey:@"jitter_widget_data"];
        [sharedDefaults synchronize];
        
        // Reload widget timelines
        if (@available(iOS 14.0, *)) {
            [WidgetCenter.sharedCenter reloadTimelineForKind:@"JitterWidget"];
        }
        
        resolve(@{@"success": @YES});
    } else {
        reject(@"APP_GROUPS_ERROR", @"Failed to access App Groups", nil);
    }
}

RCT_EXPORT_METHOD(startWidgetTimer:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSString *suiteName = @"group.com.karthikdigavalli.jitter.shared";
    NSUserDefaults *sharedDefaults = [[NSUserDefaults alloc] initWithSuiteName:suiteName];
    
    if (sharedDefaults) {
        NSDictionary *session = @{
            @"id": sessionId,
            @"startTime": @([[NSDate date] timeIntervalSince1970]),
            @"isActive": @YES
        };
        
        NSError *error;
        NSData *jsonData = [NSJSONSerialization dataWithJSONObject:session
                                                           options:0
                                                             error:&error];
        
        if (error) {
            reject(@"JSON_ERROR", @"Failed to serialize session data", error);
            return;
        }
        
        [sharedDefaults setObject:jsonData forKey:@"active_drink_session"];
        [sharedDefaults synchronize];
        
        if (@available(iOS 14.0, *)) {
            [WidgetCenter.sharedCenter reloadTimelineForKind:@"JitterWidget"];
        }
        
        resolve(@{@"success": @YES, @"sessionId": sessionId});
    } else {
        reject(@"APP_GROUPS_ERROR", @"Failed to access App Groups", nil);
    }
}

RCT_EXPORT_METHOD(clearWidgetTimer:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSString *suiteName = @"group.com.karthikdigavalli.jitter.shared";
    NSUserDefaults *sharedDefaults = [[NSUserDefaults alloc] initWithSuiteName:suiteName];
    
    if (sharedDefaults) {
        [sharedDefaults removeObjectForKey:@"active_drink_session"];
        [sharedDefaults synchronize];
        
        if (@available(iOS 14.0, *)) {
            [WidgetCenter.sharedCenter reloadTimelineForKind:@"JitterWidget"];
        }
        
        resolve(@{@"success": @YES});
    } else {
        reject(@"APP_GROUPS_ERROR", @"Failed to access App Groups", nil);
    }
}

@end
```

## React Native TypeScript Module

### Create `src/native/JitterWidgetBridge.ts`
```typescript
import { NativeModules } from 'react-native';

interface JitterWidgetBridgeInterface {
  updateWidgetData(widgetData: any): Promise<{success: boolean}>;
  startWidgetTimer(sessionId: string): Promise<{success: boolean; sessionId: string}>;
  clearWidgetTimer(): Promise<{success: boolean}>;
}

const { JitterWidgetBridge } = NativeModules;

export default JitterWidgetBridge as JitterWidgetBridgeInterface;
```

## Integration with WidgetService

### Update `WidgetService.ts`
```typescript
import JitterWidgetBridge from '../native/JitterWidgetBridge';

export class WidgetService {
  // ... existing code ...

  /**
   * Updates widget data using native bridge to App Groups
   */
  static async updateWidgetData(userId: string): Promise<void> {
    try {
      console.log('[WidgetService] 🔄 Updating widget data for user:', userId);
      
      // ... existing data calculation ...
      
      const widgetData: WidgetData = {
        // ... existing widget data creation ...
      };
      
      // Store in AsyncStorage (existing)
      await StorageService.setItem(this.WIDGET_DATA_KEY, JSON.stringify(widgetData));
      
      // Update native widget via App Groups
      if (JitterWidgetBridge) {
        try {
          await JitterWidgetBridge.updateWidgetData(widgetData);
          console.log('[WidgetService] ✅ Native widget data updated via App Groups');
        } catch (error) {
          console.error('[WidgetService] ❌ Failed to update native widget:', error);
        }
      }
      
    } catch (error) {
      console.error('[WidgetService] ❌ Error updating widget data:', error);
    }
  }

  /**
   * Start widget timer via native bridge
   */
  static async startWidgetTimer(): Promise<string | null> {
    try {
      if (JitterWidgetBridge) {
        const sessionId = Date.now().toString();
        const result = await JitterWidgetBridge.startWidgetTimer(sessionId);
        console.log('[WidgetService] ⏱️ Widget timer started:', result);
        return result.sessionId;
      }
      return null;
    } catch (error) {
      console.error('[WidgetService] ❌ Error starting widget timer:', error);
      return null;
    }
  }

  /**
   * Clear widget timer via native bridge
   */
  static async clearWidgetTimer(): Promise<void> {
    try {
      if (JitterWidgetBridge) {
        await JitterWidgetBridge.clearWidgetTimer();
        console.log('[WidgetService] ✅ Widget timer cleared');
      }
    } catch (error) {
      console.error('[WidgetService] ❌ Error clearing widget timer:', error);
    }
  }
}
```

## Widget Swift Code Updates

### Update `WidgetDataManager.swift` to read from App Groups
```swift
class WidgetDataManager {
    static let shared = WidgetDataManager()
    private let suiteName = "group.com.karthikdigavalli.jitter.shared"
    
    private var userDefaults: UserDefaults? {
        UserDefaults(suiteName: suiteName)
    }
    
    func getWidgetData() -> JitterWidgetData? {
        guard let defaults = userDefaults,
              let data = defaults.data(forKey: "jitter_widget_data") else {
            return nil
        }
        
        do {
            let widgetData = try JSONDecoder().decode(JitterWidgetData.self, from: data)
            return widgetData
        } catch {
            print("Failed to decode widget data: \(error)")
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
                return nil
            }
            
            let startTime = Date(timeIntervalSince1970: startTimeInterval)
            let elapsedSeconds = Int(Date().timeIntervalSince(startTime))
            
            return DrinkSession(
                id: id,
                startTime: startTime,
                isActive: isActive,
                elapsedSeconds: elapsedSeconds
            )
        } catch {
            print("Failed to decode session data: \(error)")
            return nil
        }
    }
}
```

## Testing the Integration

### 1. Test Widget Data Updates
```typescript
// In your React Native app
import { WidgetService } from '../services';

// Test updating widget data
await WidgetService.updateWidgetData('test-user-id');
```

### 2. Test Timer Functions
```typescript
// Start timer from app
const sessionId = await WidgetService.startWidgetTimer();

// Clear timer from app
await WidgetService.clearWidgetTimer();
```

### 3. Test Deep Linking
```typescript
// Generate test URL
const testUrl = DeepLinkService.generateTestUrl('complete-drink', {
  sessionId: '12345'
});

// Test the URL: jitter://complete-drink?sessionId=12345
```

## Deployment Steps

1. **Add native bridge files** to iOS project in Xcode
2. **Configure App Groups** in both targets
3. **Add widget extension** following the Swift guide
4. **Test on device** (widgets don't work in simulator)
5. **Verify data flow**: React Native → App Groups → Widget

## Troubleshooting

- **Widget not updating**: Check App Groups configuration
- **Data not appearing**: Verify JSON serialization/deserialization
- **Deep links not working**: Check URL scheme configuration
- **Build errors**: Ensure proper iOS deployment target (15.1+)

The complete implementation will allow your widget to display real-time Jitter scores and provide interactive timer functionality with seamless integration back to your React Native app! 