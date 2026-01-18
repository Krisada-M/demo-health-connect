import {
  initialize,
  readRecords,
  requestPermission,
} from "react-native-health-connect";
import type { HealthProvider, DateRange } from "../HealthProvider";
import type { DailySteps } from "../models/steps";
import type { GlucoseSample, GlucoseUnit } from "../models/glucose";
import {
  HealthError,
  normalizeError,
} from "../models/common";
import {
  aggregatePermissionStatus,
  type PermissionRequest,
  type PermissionResponse,
  type PermissionStatus,
} from "../permissions";
import { getLocalDayRanges, getLocalDateKey } from "../utils/dateRange";
import { toMgdl } from "../models/glucose";

const buildPermissionResponse = (
  request: PermissionRequest,
  state: PermissionStatus[keyof PermissionStatus]
): PermissionResponse => {
  const perMetric: PermissionStatus = {};

  if (request.steps?.read || request.steps?.write) {
    perMetric.steps = state;
  }

  if (request.bloodGlucose?.read || request.bloodGlucose?.write) {
    perMetric.bloodGlucose = state;
  }

  return {
    status: aggregatePermissionStatus(perMetric),
    perMetric,
  };
};

const normalizeUnit = (unit: unknown): GlucoseUnit => {
  const text = String(unit ?? "mg/dL").toLowerCase();
  return text.includes("mmol") ? "mmol/L" : "mg/dL";
};

const ensurePermissions = async (
  request: PermissionRequest
): Promise<PermissionResponse> => {
  const isInitialized = await initialize();
  if (!isInitialized) {
    return buildPermissionResponse(request, "not_available");
  }

  const permissions: { accessType: "read" | "write"; recordType: string }[] = [];

  if (request.steps?.read) {
    permissions.push({ accessType: "read", recordType: "Steps" });
  }
  if (request.steps?.write) {
    permissions.push({ accessType: "write", recordType: "Steps" });
  }
  if (request.bloodGlucose?.read) {
    permissions.push({ accessType: "read", recordType: "BloodGlucose" });
  }
  if (request.bloodGlucose?.write) {
    permissions.push({ accessType: "write", recordType: "BloodGlucose" });
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
      info.message
    );
  }
};

const getPermissionStatus = async (
  request: PermissionRequest
): Promise<PermissionResponse> => {
  const isInitialized = await initialize();
  if (!isInitialized) {
    return buildPermissionResponse(request, "not_available");
  }

  if (
    !request.steps?.read &&
    !request.steps?.write &&
    !request.bloodGlucose?.read &&
    !request.bloodGlucose?.write
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

  for (const record of result.records as Array<{
    startTime?: string;
    endTime?: string;
    count?: number;
  }>) {
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

const readGlucoseSamples = async (
  range: DateRange
): Promise<GlucoseSample[]> => {
  const isInitialized = await initialize();
  if (!isInitialized) {
    throw new HealthError("NOT_AVAILABLE", "Health Connect not available");
  }

  let result: { records?: unknown[] };
  try {
    result = await readRecords("BloodGlucose", {
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
    throw new HealthError("NO_DATA", "No glucose data available");
  }

  return (result.records as Array<{
    level?: number;
    value?: number;
    unit?: string;
    time?: string;
    startTime?: string;
    endTime?: string;
    metadata?: { id?: string; dataOrigin?: { packageName?: string } };
  }>).map((record, index) => {
    const originalValue = Number(record.level ?? record.value ?? 0);
    const originalUnit = normalizeUnit(record.unit);
    const time = record.time ?? record.startTime ?? record.endTime;
    const measuredAtISO = time
      ? new Date(time).toISOString()
      : range.startDate.toISOString();

    return {
      id: record.metadata?.id ?? `${measuredAtISO}-${index}`,
      valueMgdl: toMgdl(originalValue, originalUnit),
      originalValue,
      originalUnit,
      measuredAtISO,
      source: record.metadata?.dataOrigin?.packageName,
    };
  });
};

export const androidHealthConnectProvider: HealthProvider = {
  ensurePermissions,
  getPermissionStatus,
  readDailySteps,
  readGlucoseSamples,
};
