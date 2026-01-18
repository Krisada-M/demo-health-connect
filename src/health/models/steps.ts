export interface DailySteps {
  date: string;
  steps: number;
  startISO: string;
  endISO: string;
}

export const sumDailySteps = (days: DailySteps[]): number =>
  days.reduce((total, day) => total + day.steps, 0);
