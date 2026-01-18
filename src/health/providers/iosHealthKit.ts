import AppleHealthKit, {
  type ObjectTypeIdentifier,
  type SampleTypeIdentifierWriteable,
} from "@kingstinct/react-native-healthkit";
import type { DateRange, HealthProvider } from "../HealthProvider";
import { HealthError, normalizeError } from "../models/common";
import type { GlucoseSample, GlucoseUnit } from "../models/glucose";
import { toMgdl } from "../models/glucose";
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
  if (request.bloodGlucose?.read) {
    toRead.push("HKQuantityTypeIdentifierBloodGlucose");
  }
  if (request.bloodGlucose?.write) {
    toShare.push("HKQuantityTypeIdentifierBloodGlucose");
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

  if (
    !request.steps?.read &&
    !request.steps?.write &&
    !request.bloodGlucose?.read &&
    !request.bloodGlucose?.write
  ) {
    return buildPermissionResponse(request, "unknown");
  }

  const isAvailable = await AppleHealthKit.isHealthDataAvailable(); // VERIFY IN DOCS
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

const readGlucoseSamples = async (
  range: DateRange,
): Promise<GlucoseSample[]> => {
  if (!AppleHealthKit?.queryQuantitySamples) {
    throw new HealthError("NOT_AVAILABLE", "HealthKit not available");
  }

  let results: readonly unknown[];
  try {
    results = await AppleHealthKit.queryQuantitySamples(
      "HKQuantityTypeIdentifierBloodGlucose",
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
    throw new HealthError("NO_DATA", "No glucose data available");
  }

  return results.map((sample, index) => {
    const raw = sample as {
      id?: string;
      uuid?: string;
      value?: number;
      unit?: string;
      startDate?: Date | string;
      endDate?: Date | string;
      quantity?: { value?: number; unit?: string } | number;
      source?: { bundleIdentifier?: string; name?: string };
    };
    const quantityUnit =
      typeof raw.quantity === "number"
        ? raw.unit
        : (raw.quantity?.unit ?? raw.unit);
    const originalUnit = normalizeUnit(quantityUnit);
    const originalValue = Number(
      typeof raw.quantity === "number"
        ? raw.quantity
        : (raw.quantity?.value ?? raw.value ?? 0),
    );
    const measuredAtISO = raw.startDate
      ? new Date(raw.startDate).toISOString()
      : raw.endDate
        ? new Date(raw.endDate).toISOString()
        : range.startDate.toISOString();

    return {
      id: raw.id ?? raw.uuid ?? `${measuredAtISO}-${index}`,
      valueMgdl: toMgdl(originalValue, originalUnit),
      originalValue,
      originalUnit,
      measuredAtISO,
      source: raw.source?.name ?? raw.source?.bundleIdentifier,
    };
  });
};

export const iosHealthKitProvider: HealthProvider = {
  ensurePermissions,
  getPermissionStatus,
  readDailySteps,
  readGlucoseSamples,
};
