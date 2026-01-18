import { NativeModules, Platform } from "react-native";
import {
  initialize,
  insertRecords,
  readRecords,
  requestPermission,
  deleteRecordsByUuids,
} from "react-native-health-connect";
const AppleHealthKit = NativeModules.AppleHealthKit;

export interface StepData {
  summary: string;
  raw: any;
}

const isIOS = Platform.OS === "ios";
const isAndroid = Platform.OS === "android";

export const writeStepData = async (
  steps: number,
  startTime: string,
  endTime: string
): Promise<void> => {
  if (isIOS) {
    return new Promise((resolve, reject) => {
      const options = {
        type: "StepCount",
        value: steps,
        startDate: startTime,
        endDate: endTime,
      };

      AppleHealthKit.saveSteps(options, (error: string) => {
        if (error) {
          console.error("[HealthClient] iOS Write Error:", error);
          reject(new Error(error));
        } else {
          console.log("[HealthClient] iOS Write Success");
          resolve();
        }
      });
    });
  } else if (isAndroid) {
    const record = {
      recordType: "Steps" as const,
      count: steps,
      startTime: startTime,
      endTime: endTime,
    };

    try {
      await insertRecords([record]);
      console.log("[HealthClient] Android Write Success");
    } catch (error) {
      console.error("[HealthClient] Android Write Error:", error);
      throw error;
    }
  }
};

export const clearStepData = async (): Promise<void> => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);

  if (isIOS) {
    return new Promise((resolve, reject) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      AppleHealthKit.deleteSamples(options, "StepCount", (error: string) => {
        if (error) {
          console.error("[HealthClient] iOS Clear Error:", error);
          reject(new Error(error));
        } else {
          console.log("[HealthClient] iOS Clear Success");
          resolve();
        }
      });
    });
  } else if (isAndroid) {
    try {
      const result = await readRecords("Steps", {
        timeRangeFilter: {
          operator: "between",
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      if (result.records.length > 0) {
        const recordIds = result.records.map((record: any) => record.metadata.id);
        await deleteRecordsByUuids("Steps", recordIds, []);
        console.log("[HealthClient] Android Clear Success - Deleted records");
      } else {
        console.log("[HealthClient] Android Clear - No records found");
      }
    } catch (error) {
      console.error("[HealthClient] Android Clear Error:", error);
      throw error;
    }
  }
};

export const requestPermissions = async (): Promise<void> => {
  if (isIOS) {
    return new Promise((resolve, reject) => {
      const permissions = {
        permissions: {
          read: ["StepCount"],
          write: ["StepCount"], // Optional but requested
        },
      };

      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        if (error) {
          console.error("[HealthClient] iOS Init Error:", error);
          reject(new Error(error));
        } else {
          console.log("[HealthClient] iOS Init Success");
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
      console.log("[HealthClient] Android Health Connect initialized");
    }

    // Request permissions
    await requestPermission([
      { accessType: "read", recordType: "Steps" },
      { accessType: "write", recordType: "Steps" },
      { accessType: "read", recordType: "ActiveCaloriesBurned" },
      { accessType: "read", recordType: "Distance" },
      { accessType: "read", recordType: "BackgroundAccessPermission" },
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
        (err: object, results: any[]) => {
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
    const result = await readRecords("Steps", {
      timeRangeFilter: {
        operator: "between",
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      },
    });

    return {
      summary: `Android:  steps in last 7 days`,
      raw: result,
    };
  }

  return { summary: "Platform not supported", raw: null };
};

export const safeStringify = (obj: any): string => {
  try {
    const str = JSON.stringify(obj, null, 2);
    if (str.length > 3000) {
      return str.substring(0, 3000) + "... (truncated)";
    }
    return str;
  } catch (e) {
    return "[Error stringifying object]";
  }
};
//ActiveCaloriesBurned. Distance,Steps
