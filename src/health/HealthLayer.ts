import { Platform } from "react-native";
import type { DateRange, HealthProvider } from "./HealthProvider";
import { HealthError } from "./models/common";
import type { DailySteps } from "./models/steps";
import type { PermissionRequest, PermissionResponse } from "./permissions";
import { androidHealthConnectProvider } from "./providers/androidHealthConnect";
import { iosHealthKitProvider } from "./providers/iosHealthKit";

const getProvider = (): HealthProvider => {
  if (Platform.OS === "ios") {
    return iosHealthKitProvider;
  }
  if (Platform.OS === "android") {
    return androidHealthConnectProvider;
  }

  throw new HealthError("NOT_AVAILABLE", "Health platform not supported");
};

const ensurePermissions = async (
  request: PermissionRequest,
): Promise<PermissionResponse> => {
  return getProvider().ensurePermissions(request);
};

const getPermissionStatus = async (
  request: PermissionRequest,
): Promise<PermissionResponse> => {
  return getProvider().getPermissionStatus(request);
};

const readDailySteps = async (range: DateRange): Promise<DailySteps[]> => {
  return getProvider().readDailySteps(range);
};

export const HealthLayer = {
  ensurePermissions,
  getPermissionStatus,
  readDailySteps,
};

export type { DateRange } from "./HealthProvider";
export { getUserMessage, HealthError, normalizeError } from "./models/common";
export type { GlucoseSample } from "./models/glucose";
export { sumDailySteps } from "./models/steps";
export type { DailySteps } from "./models/steps";
export type { PermissionRequest, PermissionResponse } from "./permissions";
export { getDateRangeForLastDays } from "./utils/dateRange";
export { safeStringify } from "./utils/safeStringify";

