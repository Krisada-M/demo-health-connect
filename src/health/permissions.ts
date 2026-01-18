export type HealthMetric = "steps";
export type HealthAccess = "read" | "write";

export interface MetricPermissionRequest {
  read?: boolean;
  write?: boolean;
}

export interface PermissionRequest {
  steps?: MetricPermissionRequest;
}

export type PermissionState =
  | "granted"
  | "denied"
  | "not_available"
  | "unknown";

export interface PermissionStatus {
  steps?: PermissionState;
}

export interface PermissionResponse {
  status: PermissionState;
  perMetric: PermissionStatus;
}

export const aggregatePermissionStatus = (
  perMetric: PermissionStatus,
): PermissionState => {
  const states: PermissionState[] = [];
  for (const key in perMetric) {
    if (Object.prototype.hasOwnProperty.call(perMetric, key)) {
      const value = perMetric[key as keyof PermissionStatus];

      if (value) {
        states.push(value);
      }
    }
  }
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
