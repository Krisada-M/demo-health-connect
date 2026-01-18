/*
 * @deprecated Use HealthLayer from "src/health/HealthLayer".
 * This file is a thin compatibility wrapper to avoid breaking legacy imports.
 */
import {
  HealthLayer,
  getDateRangeForLastDays,
  safeStringify,
  sumDailySteps,
} from "./HealthLayer";
import { HealthError } from "./models/common";

export interface StepData {
  summary: string;
  raw: unknown;
}

export const requestPermissions = async (): Promise<void> => {
  await HealthLayer.ensurePermissions({
    steps: { read: true, write: true },
    bloodGlucose: { read: true },
  });
};

export const readSteps7d = async (): Promise<StepData> => {
  const range = getDateRangeForLastDays(7);
  const daily = await HealthLayer.readDailySteps(range);
  const total = sumDailySteps(daily);

  return {
    summary: `Steps (7d): ${total}`,
    raw: daily,
  };
};

export const writeStepData = async (): Promise<void> => {
  throw new HealthError(
    "NOT_AVAILABLE",
    "writeStepData is deprecated and not supported by HealthLayer"
  );
};

export const clearStepData = async (): Promise<void> => {
  throw new HealthError(
    "NOT_AVAILABLE",
    "clearStepData is deprecated and not supported by HealthLayer"
  );
};

export { safeStringify };
