import { Platform } from "react-native";
import type { HealthProvider, DateRange } from "./HealthProvider";
import type { PermissionRequest, PermissionResponse } from "./permissions";
import type { DailySteps } from "./models/steps";
import type { GlucoseSample } from "./models/glucose";
import { HealthError } from "./models/common";
import { iosHealthKitProvider } from "./providers/iosHealthKit";
import { androidHealthConnectProvider } from "./providers/androidHealthConnect";

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
  request: PermissionRequest
): Promise<PermissionResponse> => {
  return getProvider().ensurePermissions(request);
};

const getPermissionStatus = async (
  request: PermissionRequest
): Promise<PermissionResponse> => {
  return getProvider().getPermissionStatus(request);
};

const readDailySteps = async (range: DateRange): Promise<DailySteps[]> => {
  return getProvider().readDailySteps(range);
};

const readGlucoseSamples = async (
  range: DateRange
): Promise<GlucoseSample[]> => {
  return getProvider().readGlucoseSamples(range);
};

export const HealthLayer = {
  ensurePermissions,
  getPermissionStatus,
  readDailySteps,
  readGlucoseSamples,
};

export type { PermissionRequest, PermissionResponse } from "./permissions";
export type { DailySteps } from "./models/steps";
export type { GlucoseSample } from "./models/glucose";
export type { DateRange } from "./HealthProvider";
export {
  HealthError,
  normalizeError,
  getUserMessage,
} from "./models/common";
export { sumDailySteps } from "./models/steps";
export { getDateRangeForLastDays } from "./utils/dateRange";
export { safeStringify } from "./utils/safeStringify";
