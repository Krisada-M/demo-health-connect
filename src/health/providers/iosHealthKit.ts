import AppleHealthKit, {
  type ObjectTypeIdentifier,
  type SampleTypeIdentifierWriteable,
} from "@kingstinct/react-native-healthkit";
import type { DateRange, HealthProvider } from "../HealthProvider";
import { HealthError, normalizeError } from "../models/common";
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

  return {
    status: aggregatePermissionStatus(perMetric),
    perMetric,
  };
};

const ensurePermissions = async (
  request: PermissionRequest,
): Promise<PermissionResponse> => {
  if (!AppleHealthKit?.isHealthDataAvailable) {
    return buildPermissionResponse(request, "not_available");
  }

  const isAvailable = await AppleHealthKit.isHealthDataAvailable(); // VERIFY IN DOCS
  if (!isAvailable) {
    return buildPermissionResponse(request, "not_available");
  }

  const toRead: ObjectTypeIdentifier[] = [];
  const toShare: SampleTypeIdentifierWriteable[] = [];

  if (request.steps?.read) {
    toRead.push("HKQuantityTypeIdentifierStepCount");
  }

  if (request.steps?.write) {
    toShare.push("HKQuantityTypeIdentifierStepCount");
  }

  if (toRead.length === 0 && toShare.length === 0) {
    return buildPermissionResponse(request, "unknown");
  }

  try {
    await AppleHealthKit.requestAuthorization({ toRead, toShare });
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
  if (!AppleHealthKit?.isHealthDataAvailable) {
    return buildPermissionResponse(request, "not_available");
  }

  if (!request.steps?.read && !request.steps?.write) {
    return buildPermissionResponse(request, "unknown");
  }

  const isAvailable = AppleHealthKit.isHealthDataAvailable();
  if (!isAvailable) {
    return buildPermissionResponse(request, "not_available");
  }

  // Best-effort: HealthKit permission status APIs vary by library.
  return buildPermissionResponse(request, "unknown");
};

const readDailySteps = async (range: DateRange): Promise<DailySteps[]> => {
  if (!AppleHealthKit?.queryQuantitySamples) {
    throw new HealthError("NOT_AVAILABLE", "HealthKit not available");
  }

  const ranges = getLocalDayRanges(range.startDate, range.endDate);
  const totals = new Map(ranges.map((day) => [day.date, 0]));

  let results: readonly unknown[];
  try {
    results = await AppleHealthKit.queryQuantitySamples(
      "HKQuantityTypeIdentifierStepCount",
      {
        limit: 0,
        filter: {
          date: {
            startDate: range.startDate,
            endDate: range.endDate,
          },
        },
      },
    );
  } catch (error) {
    const info = normalizeError(error);
    throw new HealthError(info.code, info.message);
  }

  if (results.length === 0) {
    throw new HealthError("NO_DATA", "No step data available");
  }

  for (const sample of results) {
    const raw = sample as {
      startDate?: Date | string;
      endDate?: Date | string;
      value?: number;
      quantity?: { value?: number; unit?: string } | number;
    };
    const startDate = raw.startDate ?? raw.endDate;
    if (!startDate) {
      continue;
    }
    const value = Number(
      typeof raw.quantity === "number"
        ? raw.quantity
        : (raw.quantity?.value ?? raw.value ?? 0),
    );
    const dayKey = getLocalDateKey(new Date(startDate));
    const current = totals.get(dayKey) ?? 0;
    totals.set(dayKey, current + value);
  }

  return ranges.map((day) => ({
    date: day.date,
    steps: Math.round(totals.get(day.date) ?? 0),
    startISO: day.start.toISOString(),
    endISO: day.end.toISOString(),
  }));
};

export const iosHealthKitProvider: HealthProvider = {
  ensurePermissions,
  getPermissionStatus,
  readDailySteps,
};
