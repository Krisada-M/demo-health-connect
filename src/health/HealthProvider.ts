import type { PermissionRequest, PermissionResponse } from "./permissions";
import type { DailySteps } from "./models/steps";
import type { GlucoseSample } from "./models/glucose";

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface HealthProvider {
  ensurePermissions(request: PermissionRequest): Promise<PermissionResponse>;
  getPermissionStatus(request: PermissionRequest): Promise<PermissionResponse>;
  readDailySteps(range: DateRange): Promise<DailySteps[]>;
  readGlucoseSamples(range: DateRange): Promise<GlucoseSample[]>;
}
