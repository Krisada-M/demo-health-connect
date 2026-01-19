import { Platform } from "react-native";
import type { DateRange, HealthProvider } from "./HealthProvider";
import { HealthError } from "./models/common";
import type { DailyActivitySummary, HourlyActivitySummary } from "./models/activity";
import type { DailySteps, HourlySteps } from "./models/steps";
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

const readDailyActivity = async (
  range: DateRange,
): Promise<DailyActivitySummary[]> => {
  return getProvider().readDailyActivity(range);
};

const readHourlySteps = async (range: DateRange): Promise<HourlySteps[]> => {
  return getProvider().readHourlySteps(range);
};

const readHourlyActivity = async (
  range: DateRange,
): Promise<HourlyActivitySummary[]> => {
  return getProvider().readHourlyActivity(range);
};

export const HealthLayer = {
  ensurePermissions,
  getPermissionStatus,
  readDailySteps,
  readDailyActivity,
  readHourlySteps,
  readHourlyActivity,
};

export type { DateRange } from "./HealthProvider";
export { getUserMessage, HealthError, normalizeError } from "./models/common";
export { sumActiveCalories, sumDistance, sumHourlyActiveCalories, sumHourlyDistance } from "./models/activity";
export type { DailyActivitySummary, HourlyActivitySummary } from "./models/activity";
export { sumDailySteps, sumHourlySteps } from "./models/steps";
export type { DailySteps, HourlySteps } from "./models/steps";
export type { PermissionRequest, PermissionResponse } from "./permissions";
export { getDateRangeForLastDays } from "./utils/dateRange";
export { safeStringify } from "./utils/safeStringify";

