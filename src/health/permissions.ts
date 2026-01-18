export type HealthMetric = "steps" | "bloodGlucose";
export type HealthAccess = "read" | "write";

export interface MetricPermissionRequest {
  read?: boolean;
  write?: boolean;
}

export interface PermissionRequest {
  steps?: MetricPermissionRequest;
  bloodGlucose?: MetricPermissionRequest;
}

export type PermissionState =
  | "granted"
  | "denied"
  | "not_available"
  | "unknown";

export interface PermissionStatus {
  steps?: PermissionState;
  bloodGlucose?: PermissionState;
}

export interface PermissionResponse {
  status: PermissionState;
  perMetric: PermissionStatus;
}

export const aggregatePermissionStatus = (
  perMetric: PermissionStatus
): PermissionState => {
  const states = Object.values(perMetric);
  if (states.length === 0) {
    return "unknown";
  }
  if (states.some((state) => state === "not_available")) {
    return "not_available";
  }
  if (states.some((state) => state === "denied")) {
    return "denied";
  }
  if (states.every((state) => state === "granted")) {
    return "granted";
  }
  return "unknown";
};
