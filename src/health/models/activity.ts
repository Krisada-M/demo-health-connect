export interface DailyActivitySummary {
  date: string;
  activeCaloriesBurned: number;
  distance: number;
  startISO: string;
  endISO: string;
}

export interface HourlyActivitySummary {
  date: string;
  hour: number;
  activeCaloriesBurned: number;
  distance: number;
  startISO: string;
  endISO: string;
}

export const sumActiveCalories = (days: DailyActivitySummary[]): number =>
  days.reduce((total, day) => total + day.activeCaloriesBurned, 0);

export const sumDistance = (days: DailyActivitySummary[]): number =>
  days.reduce((total, day) => total + day.distance, 0);

export const sumHourlyActiveCalories = (hours: HourlyActivitySummary[]): number =>
  hours.reduce((total, hour) => total + hour.activeCaloriesBurned, 0);

export const sumHourlyDistance = (hours: HourlyActivitySummary[]): number =>
  hours.reduce((total, hour) => total + hour.distance, 0);
