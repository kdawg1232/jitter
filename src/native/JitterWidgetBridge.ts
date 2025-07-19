import { NativeModules } from 'react-native';

interface JitterWidgetBridgeInterface {
  updateWidgetData(widgetData: any): Promise<{success: boolean}>;
  startWidgetTimer(sessionId: string): Promise<{success: boolean; sessionId: string}>;
  clearWidgetTimer(): Promise<{success: boolean}>;
}

const { JitterWidgetBridge } = NativeModules;

export default JitterWidgetBridge as JitterWidgetBridgeInterface; 