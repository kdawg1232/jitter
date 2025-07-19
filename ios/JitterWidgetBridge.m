#import "JitterWidgetBridge.h"
#import <React/RCTBridgeModule.h>

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
        
        NSLog(@"[JitterWidgetBridge] ✅ Widget data updated in App Groups");
        
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
        
        NSLog(@"[JitterWidgetBridge] ⏱️ Widget timer started: %@", sessionId);
        
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
        
        resolve(@{@"success": @YES});
    } else {
        reject(@"APP_GROUPS_ERROR", @"Failed to access App Groups", nil);
    }
}

@end 