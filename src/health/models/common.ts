export type HealthErrorCode =
  | "NOT_AVAILABLE"
  | "PERMISSION_DENIED"
  | "NO_DATA"
  | "UNKNOWN";

export interface HealthErrorInfo {
  code: HealthErrorCode;
  message: string;
}

export class HealthError extends Error {
  code: HealthErrorCode;

  constructor(code: HealthErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const normalizeMessage = (message: string): HealthErrorCode => {
  const text = message.toLowerCase();
  if (text.includes("permission") || text.includes("not authorized")) {
    return "PERMISSION_DENIED";
  }
  if (text.includes("not available") || text.includes("unavailable")) {
    return "NOT_AVAILABLE";
  }
  if (text.includes("no data") || text.includes("empty")) {
    return "NO_DATA";
  }
  return "UNKNOWN";
};

export const normalizeError = (error: unknown): HealthErrorInfo => {
  if (error instanceof HealthError) {
    return { code: error.code, message: error.message };
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    const possibleCode = (error as { code?: string }).code;
    if (
      possibleCode === "NOT_AVAILABLE" ||
      possibleCode === "PERMISSION_DENIED" ||
      possibleCode === "NO_DATA" ||
      possibleCode === "UNKNOWN"
    ) {
      return {
        code: possibleCode,
        message: (error as { message?: string }).message || possibleCode,
      };
    }
  }

  if (typeof error === "string") {
    return { code: normalizeMessage(error), message: error };
  }

  if (error instanceof Error) {
    return { code: normalizeMessage(error.message), message: error.message };
  }

  return { code: "UNKNOWN", message: "Unknown error" };
};

export const getUserMessage = (info: HealthErrorInfo): string => {
  switch (info.code) {
    case "NOT_AVAILABLE":
      return "Health data is not available on this device.";
    case "PERMISSION_DENIED":
      return "Permission denied. Please enable Health permissions and try again.";
    case "NO_DATA":
      return "No health data found for the selected range.";
    default:
      return "Something went wrong while reading health data.";
  }
};
