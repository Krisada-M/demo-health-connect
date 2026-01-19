export interface DailySteps {
  date: string;
  steps: number;
  startISO: string;
  endISO: string;
}

export interface HourlySteps {
  date: string;
  hour: number;
  steps: number;
  startISO: string;
  endISO: string;
}

export const sumDailySteps = (days: DailySteps[]): number =>
  days.reduce((total, day) => total + day.steps, 0);

export const sumHourlySteps = (hours: HourlySteps[]): number =>
  hours.reduce((total, hour) => total + hour.steps, 0);
