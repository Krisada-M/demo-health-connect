import type { DailyActivitySummary } from "./models/activity";
import type { DailySteps } from "./models/steps";
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
}
