import {
  initialize,
  readRecords,
  requestPermission,
  type Permission,
  type RecordType,
} from "react-native-health-connect";
import type { DateRange, HealthProvider } from "../HealthProvider";
import { HealthError, normalizeError } from "../models/common";
import type { DailyActivitySummary } from "../models/activity";
import type { DailySteps } from "../models/steps";
import {
  aggregatePermissionStatus,
  type PermissionRequest,
  type PermissionResponse,
  type PermissionStatus,
} from "../permissions";
import { getLocalDateKey, getLocalDayRanges } from "../utils/dateRange";

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
  const isInitialized = await initialize();
  if (!isInitialized) {
    return buildPermissionResponse(request, "not_available");
  }

  const permissions: Permission[] = [];
  const addPermission = (
    accessType: "read" | "write",
    recordType: RecordType,
  ) => permissions.push({ accessType, recordType });

  if (request.steps?.read) {
    addPermission("read", "Steps");
  }
  if (request.steps?.write) {
    addPermission("write", "Steps");
  }
  if (request.activeCaloriesBurned?.read) {
    addPermission("read", "ActiveCaloriesBurned");
  }
  if (request.activeCaloriesBurned?.write) {
    addPermission("write", "ActiveCaloriesBurned");
  }
  if (request.distance?.read) {
    addPermission("read", "Distance");
  }
  if (request.distance?.write) {
    addPermission("write", "Distance");
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
  const isInitialized = await initialize();
  if (!isInitialized) {
    return buildPermissionResponse(request, "not_available");
  }

  if (
    !request.steps?.read &&
    !request.steps?.write &&
    !request.activeCaloriesBurned?.read &&
    !request.activeCaloriesBurned?.write &&
    !request.distance?.read &&
    !request.distance?.write
  ) {
    return buildPermissionResponse(request, "unknown");
  }

  // Best-effort: Health Connect permission status API may vary by version.
  return buildPermissionResponse(request, "unknown");
};

const readDailySteps = async (range: DateRange): Promise<DailySteps[]> => {
  const isInitialized = await initialize();
  if (!isInitialized) {
    throw new HealthError("NOT_AVAILABLE", "Health Connect not available");
  }

  const ranges = getLocalDayRanges(range.startDate, range.endDate);
  const totals = new Map(ranges.map((day) => [day.date, 0]));

  let result: { records?: unknown[] };
  try {
    result = await readRecords("Steps", {
      timeRangeFilter: {
        operator: "between",
        startTime: range.startDate.toISOString(),
        endTime: range.endDate.toISOString(),
      },
    });
  } catch (error) {
    const info = normalizeError(error);
    throw new HealthError(info.code, info.message);
  }

  if (!result.records || result.records.length === 0) {
    throw new HealthError("NO_DATA", "No step data available");
  }

  for (const record of result.records as {
    startTime?: string;
    endTime?: string;
    count?: number;
  }[]) {
    const time = record.startTime ?? record.endTime;
    if (!time) {
      continue;
    }
    const dayKey = getLocalDateKey(new Date(time));
    const current = totals.get(dayKey) ?? 0;
    totals.set(dayKey, current + Number(record.count ?? 0));
  }

  return ranges.map((day) => ({
    date: day.date,
    steps: Math.round(totals.get(day.date) ?? 0),
    startISO: day.start.toISOString(),
    endISO: day.end.toISOString(),
  }));
};

const readDailyActivity = async (
  range: DateRange,
): Promise<DailyActivitySummary[]> => {
  const isInitialized = await initialize();
  if (!isInitialized) {
    throw new HealthError("NOT_AVAILABLE", "Health Connect not available");
  }

  const ranges = getLocalDayRanges(range.startDate, range.endDate);
  const totals = new Map(
    ranges.map((day) => [day.date, { calories: 0, distance: 0 }]),
  );

  let caloriesResult: { records?: unknown[] };
  try {
    caloriesResult = await readRecords("ActiveCaloriesBurned", {
      timeRangeFilter: {
        operator: "between",
        startTime: range.startDate.toISOString(),
        endTime: range.endDate.toISOString(),
      },
    });
  } catch (error) {
    const info = normalizeError(error);
    throw new HealthError(info.code, info.message);
  }

  let distanceResult: { records?: unknown[] };
  try {
    distanceResult = await readRecords("Distance", {
      timeRangeFilter: {
        operator: "between",
        startTime: range.startDate.toISOString(),
        endTime: range.endDate.toISOString(),
      },
    });
  } catch (error) {
    const info = normalizeError(error);
    throw new HealthError(info.code, info.message);
  }

  const caloriesRecords = (caloriesResult.records ?? []) as {
    startTime?: string;
    endTime?: string;
    energy?: { inKilocalories?: number; inCalories?: number };
  }[];

  const distanceRecords = (distanceResult.records ?? []) as {
    startTime?: string;
    endTime?: string;
    distance?: { inMeters?: number; inKilometers?: number };
  }[];

  if (caloriesRecords.length === 0 && distanceRecords.length === 0) {
    throw new HealthError("NO_DATA", "No activity data available");
  }

  for (const record of caloriesRecords) {
    const time = record.startTime ?? record.endTime;
    if (!time) {
      continue;
    }
    const dayKey = getLocalDateKey(new Date(time));
    const current = totals.get(dayKey) ?? { calories: 0, distance: 0 };
    const calories = Number(
      record.energy?.inKilocalories ?? record.energy?.inCalories ?? 0,
    );
    totals.set(dayKey, {
      calories: current.calories + calories,
      distance: current.distance,
    });
  }

  for (const record of distanceRecords) {
    const time = record.startTime ?? record.endTime;
    if (!time) {
      continue;
    }
    const dayKey = getLocalDateKey(new Date(time));
    const current = totals.get(dayKey) ?? { calories: 0, distance: 0 };
    const distanceMeters = Number(
      record.distance?.inMeters ??
        (record.distance?.inKilometers ?? 0) * 1000,
    );
    totals.set(dayKey, {
      calories: current.calories,
      distance: current.distance + distanceMeters,
    });
  }

  return ranges.map((day) => {
    const summary = totals.get(day.date) ?? { calories: 0, distance: 0 };
    return {
      date: day.date,
      activeCaloriesBurned: Math.round(summary.calories),
      distance: Math.round(summary.distance),
      startISO: day.start.toISOString(),
      endISO: day.end.toISOString(),
    };
  });
};

export const androidHealthConnectProvider: HealthProvider = {
  ensurePermissions,
  getPermissionStatus,
  readDailySteps,
  readDailyActivity,
};
