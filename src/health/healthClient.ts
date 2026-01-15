import { Platform } from 'react-native';
import AppleHealthKit, {
  HealthKitPermissions
} from 'react-native-health';
import {
  initialize,
  readRecords,
  requestPermission
} from 'react-native-health-connect';

export interface StepData {
  summary: string;
  raw: any;
}

const isIOS = Platform.OS === 'ios';
const isAndroid = Platform.OS === 'android';

export const requestPermissions = async (): Promise<void> => {
  if (isIOS) {
    return new Promise((resolve, reject) => {
      const permissions: HealthKitPermissions = {
        permissions: {
          read: [AppleHealthKit.Constants.Permissions.StepCount],
          write: [AppleHealthKit.Constants.Permissions.StepCount], // Optional but requested
        },
      };

      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        if (error) {
          console.error('[HealthClient] iOS Init Error:', error);
          reject(new Error(error));
        } else {
          console.log('[HealthClient] iOS Init Success');
          resolve();
        }
      });
    });
  } else if (isAndroid) {
    const isInitialized = await initialize();
    if (!isInitialized) {
        // This might happen if Health Connect is not available on the device
        // but initialize() usually returns true if the SDK is integrated.
        // It's safer to just proceed to requestPermission.
        console.log('[HealthClient] Android Health Connect initialized');
    }

    // Request permissions
    await requestPermission([
      { accessType: 'read', recordType: 'Steps' },
      // { accessType: 'write', recordType: 'Steps' }, 
    ]);
  }
};

export const readSteps7d = async (): Promise<StepData> => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 7);

  if (isIOS) {
    return new Promise((resolve, reject) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      AppleHealthKit.getDailyStepCountSamples(
        options,
        (err: Object, results: Array<any>) => {
          if (err) {
            reject(err);
            return;
          }
          
          const totalSteps = results.reduce((acc, curr) => acc + curr.value, 0);
          resolve({
            summary: `iOS: ${totalSteps} steps in last 7 days`,
            raw: results,
          });
        }
      );
    });
  } else if (isAndroid) {
    const result = await readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      },
    });

  
    
    return {
      summary: `Android:  steps in last 7 days`,
      raw: result,
    };
  }

  return { summary: 'Platform not supported', raw: null };
};

export const safeStringify = (obj: any): string => {
  try {
    const str = JSON.stringify(obj, null, 2);
    if (str.length > 3000) {
      return str.substring(0, 3000) + '... (truncated)';
    }
    return str;
  } catch (e) {
    return '[Error stringifying object]';
  }
};
