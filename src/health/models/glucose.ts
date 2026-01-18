export type GlucoseUnit = "mg/dL" | "mmol/L";

export interface GlucoseSample {
  id: string;
  valueMgdl: number;
  originalValue: number;
  originalUnit: GlucoseUnit;
  measuredAtISO: string;
  source?: string;
}

export const toMgdl = (value: number, unit: GlucoseUnit): number =>
  unit === "mg/dL" ? value : value * 18;
