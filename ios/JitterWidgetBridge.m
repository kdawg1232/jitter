#import "JitterWidgetBridge.h"
#import <React/RCTBridgeModule.h>
#if __has_include(<WidgetKit/WidgetKit.h>)
#import <WidgetKit/WidgetKit.h>
#endif
#import <objc/message.h>
#import "Jitter-Swift.h"  // Auto-generated header to expose Swift to ObjC

@implementation JitterWidgetBridge

RCT_EXPORT_MODULE(JitterWidgetBridge);

RCT_EXPORT_METHOD(updateWidgetData:(NSDictionary *)widgetData
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSString *suiteName = @"group.com.karthikdigavalli.jitter.shared";
    NSLog(@"[JitterWidgetBridge] 🔄 Updating widget data with suite: %@", suiteName);
    NSLog(@"[JitterWidgetBridge] 📦 Input data: %@", widgetData);
    
    NSUserDefaults *sharedDefaults = [[NSUserDefaults alloc] initWithSuiteName:suiteName];
    
    if (sharedDefaults) {
        NSLog(@"[JitterWidgetBridge] ✅ Successfully initialized UserDefaults with suite name");
        
        // Convert widget data to JSON
        NSError *error;
        NSData *jsonData = [NSJSONSerialization dataWithJSONObject:widgetData
                                                           options:0
                                                             error:&error];
        
        if (error) {
            NSLog(@"[JitterWidgetBridge] ❌ JSON serialization error: %@", error.localizedDescription);
            reject(@"JSON_ERROR", @"Failed to serialize widget data", error);
            return;
        }
        
        NSLog(@"[JitterWidgetBridge] ✅ JSON serialization successful (%lu bytes)", (unsigned long)jsonData.length);
        
        // Store in App Groups UserDefaults
        [sharedDefaults setObject:jsonData forKey:@"jitter_widget_data"];
        BOOL syncSuccess = [sharedDefaults synchronize];
        
        NSLog(@"[JitterWidgetBridge] 📱 Data stored in App Groups, sync success: %@", syncSuccess ? @"YES" : @"NO");
        
        // Verify data was written by reading it back
        NSData *verifyData = [sharedDefaults dataForKey:@"jitter_widget_data"];
        if (verifyData) {
            NSLog(@"[JitterWidgetBridge] ✅ Verification: Data successfully written (%lu bytes)", (unsigned long)verifyData.length);
            
            // Show the JSON content for debugging
            NSString *jsonString = [[NSString alloc] initWithData:verifyData encoding:NSUTF8StringEncoding];
            NSLog(@"[JitterWidgetBridge] 📄 Stored JSON: %@", jsonString);
        } else {
            NSLog(@"[JitterWidgetBridge] ❌ Verification failed: No data found after write");
        }
        
        // List all keys in App Groups for debugging
        NSDictionary *allData = [sharedDefaults dictionaryRepresentation];
        NSLog(@"[JitterWidgetBridge] 📋 All App Groups keys: %@", [allData allKeys]);
        
        // Reload widget timeline so data shows immediately
#if __has_include(<WidgetKit/WidgetKit.h>)
        if (@available(iOS 14.0, *)) {
            NSLog(@"[JitterWidgetBridge] 🔄 Attempting to reload widget timeline...");
            
            // Use Swift helper to reload widget timeline (avoids Objective-C compatibility issues)
            [JitterWidgetCenter reloadTimeline];
            NSLog(@"[JitterWidgetBridge] ✅ Requested widget timeline reload via Swift helper");
        } else {
            NSLog(@"[JitterWidgetBridge] ⚠️ iOS version < 14.0, widget reload not available");
        }
#else
        NSLog(@"[JitterWidgetBridge] ⚠️ WidgetKit not available at compile time");
#endif
        
        NSLog(@"[JitterWidgetBridge] ✅ Widget data update complete");
        
        resolve(@{@"success": @YES});
    } else {
        NSLog(@"[JitterWidgetBridge] ❌ Failed to initialize UserDefaults with suite: %@", suiteName);
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
        
        NSLog(@"[JitterWidgetBridge] ⏱️ Widget timer started: %@", sessionId);
        
        // Reload widget timeline for timer updates
#if __has_include(<WidgetKit/WidgetKit.h>)
        if (@available(iOS 14.0, *)) {
            [JitterWidgetCenter reloadTimeline];
            NSLog(@"[JitterWidgetBridge] ✅ Requested widget timeline reload for timer start via Swift helper");
        }
#endif
        
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
        
        NSLog(@"[JitterWidgetBridge] ✅ Widget timer cleared");
        
        // Reload widget timeline after clearing timer
#if __has_include(<WidgetKit/WidgetKit.h>)
        if (@available(iOS 14.0, *)) {
            [JitterWidgetCenter reloadTimeline];
            NSLog(@"[JitterWidgetBridge] ✅ Requested widget timeline reload for timer clear via Swift helper");
        }
#endif
        
        resolve(@{@"success": @YES});
    } else {
        reject(@"APP_GROUPS_ERROR", @"Failed to access App Groups", nil);
    }
}

@end 