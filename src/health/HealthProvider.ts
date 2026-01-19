import type { DailyActivitySummary, HourlyActivitySummary } from "./models/activity";
import type { DailySteps, HourlySteps } from "./models/steps";
import type { PermissionRequest, PermissionResponse } from "./permissions";

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface HealthProvider {
  ensurePermissions(request: PermissionRequest): Promise<PermissionResponse>;
  getPermissionStatus(request: PermissionRequest): Promise<PermissionResponse>;
  readDailySteps(range: DateRange): Promise<DailySteps[]>;
  readDailyActivity(range: DateRange): Promise<DailyActivitySummary[]>;
  readHourlySteps(range: DateRange): Promise<HourlySteps[]>;
  readHourlyActivity(range: DateRange): Promise<HourlyActivitySummary[]>;
}
