import {
  initialize,
  requestPermission,
  type Permission,
} from "react-native-health-connect";
import type { DateRange, HealthProvider } from "../HealthProvider";
import { HealthError, normalizeError } from "../models/common";
import type { DailyActivitySummary, HourlyActivitySummary } from "../models/activity";
import type { DailySteps, HourlySteps } from "../models/steps";
import {
  aggregatePermissionStatus,
  type PermissionRequest,
  type PermissionResponse,
  type PermissionStatus,
} from "../permissions";
import { getLocalDayRanges, getLocalHourRanges } from "../utils/dateRange";

const isHealthConnectAvailable = async (): Promise<boolean> =>
  initialize();

const getRequestedMetrics = (request: PermissionRequest) =>
  Boolean(
    request.steps?.read ||
      request.steps?.write ||
      request.activeCaloriesBurned?.read ||
      request.activeCaloriesBurned?.write ||
      request.distance?.read ||
      request.distance?.write,
  );

const buildPermissionResponse = (
  request: PermissionRequest,
  state: PermissionStatus[keyof PermissionStatus],
): PermissionResponse => {
  const perMetric: PermissionStatus = {};

  if (request.steps?.read || request.steps?.write) {
    perMetric.steps = state;
  }
  if (request.activeCaloriesBurned?.read || request.activeCaloriesBurned?.write) {
    perMetric.activeCaloriesBurned = state;
  }
  if (request.distance?.read || request.distance?.write) {
    perMetric.distance = state;
  }

  return {
    status: aggregatePermissionStatus(perMetric),
    perMetric,
  };
};

const ensurePermissions = async (
  request: PermissionRequest,
): Promise<PermissionResponse> => {
  if (!(await isHealthConnectAvailable())) {
    return buildPermissionResponse(request, "not_available");
  }

  const permissions: Permission[] = [];

  if (request.steps?.read) {
    permissions.push({ accessType: "read", recordType: "Steps" });
  }
  if (request.steps?.write) {
    permissions.push({ accessType: "write", recordType: "Steps" });
  }
  if (request.activeCaloriesBurned?.read) {
    permissions.push({ accessType: "read", recordType: "ActiveCaloriesBurned" });
  }
  if (request.activeCaloriesBurned?.write) {
    permissions.push({ accessType: "write", recordType: "ActiveCaloriesBurned" });
  }
  if (request.distance?.read) {
    permissions.push({ accessType: "read", recordType: "Distance" });
  }
  if (request.distance?.write) {
    permissions.push({ accessType: "write", recordType: "Distance" });
  }

  if (permissions.length === 0) {
    return buildPermissionResponse(request, "unknown");
  }

  try {
    await requestPermission(permissions);
    return buildPermissionResponse(request, "granted");
  } catch (error) {
    const info = normalizeError(error);
    throw new HealthError(
      info.code === "UNKNOWN" ? "PERMISSION_DENIED" : info.code,
      info.message,
    );
  }
};

const getPermissionStatus = async (
  request: PermissionRequest,
): Promise<PermissionResponse> => {
  if (!getRequestedMetrics(request)) {
    return buildPermissionResponse(request, "unknown");
  }

  if (!(await isHealthConnectAvailable())) {
    return buildPermissionResponse(request, "not_available");
  }

  // Best-effort: Health Connect permission status API may vary by version.
  return buildPermissionResponse(request, "unknown");
};

const readDailySteps = async (range: DateRange): Promise<DailySteps[]> => {
  const ranges = getLocalDayRanges(range.startDate, range.endDate);

  // Mock data - total steps per day
  const mockDailySteps = ranges.map((day) => 8500); // Mock 8500 steps per day

  return ranges.map((day, index) => ({
    date: day.date,
    steps: mockDailySteps[index] || 0,
    startISO: day.start.toISOString(),
    endISO: day.end.toISOString(),
  }));
};

const readDailyActivity = async (
  range: DateRange,
): Promise<DailyActivitySummary[]> => {
  const ranges = getLocalDayRanges(range.startDate, range.endDate);

  // Mock data - total calories and distance per day
  const mockCalories = ranges.map((day) => 1800); // Mock 1800 kcal per day
  const mockDistance = ranges.map((day) => 10000); // Mock 10km per day

  return ranges.map((day, index) => ({
    date: day.date,
    activeCaloriesBurned: mockCalories[index] || 0,
    distance: mockDistance[index] || 0,
    startISO: day.start.toISOString(),
    endISO: day.end.toISOString(),
  }));
};

const readHourlySteps = async (range: DateRange): Promise<HourlySteps[]> => {
  const day = range.startDate;
  const ranges = getLocalHourRanges(day);

  // Mock data
  const mockSteps = [1200, 800, 500, 300, 200, 100, 50, 0, 0, 0, 0, 0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200];

  return ranges.map((hour, index) => ({
    date: hour.date,
    hour: hour.hour,
    steps: mockSteps[index] || 0,
    startISO: hour.start.toISOString(),
    endISO: hour.end.toISOString(),
  }));
};

const readHourlyActivity = async (
  range: DateRange,
): Promise<HourlyActivitySummary[]> => {
  const day = range.startDate;
  const ranges = getLocalHourRanges(day);

  // Mock data
  const mockCalories = [50, 30, 20, 10, 5, 0, 0, 0, 0, 0, 0, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
  const mockDistance = [500, 300, 200, 100, 50, 0, 0, 0, 0, 0, 0, 0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200];

  return ranges.map((hour, index) => ({
    date: hour.date,
    hour: hour.hour,
    activeCaloriesBurned: mockCalories[index] || 0,
    distance: mockDistance[index] || 0,
    startISO: hour.start.toISOString(),
    endISO: hour.end.toISOString(),
  }));
};

export const androidHealthConnectProvider: HealthProvider = {
  ensurePermissions,
  getPermissionStatus,
  readDailySteps,
  readDailyActivity,
  readHourlySteps,
  readHourlyActivity,
};
