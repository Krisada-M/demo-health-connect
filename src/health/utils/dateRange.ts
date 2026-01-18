export interface LocalDayRange {
  date: string;
  start: Date;
  end: Date;
}

const pad = (value: number): string =>
  value < 10 ? `0${value}` : value.toString();

export const getLocalDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const startOfLocalDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const endOfLocalDay = (date: Date): Date =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );

export const getLocalDayRanges = (
  startDate: Date,
  endDate: Date,
): LocalDayRange[] => {
  const ranges: LocalDayRange[] = [];
  let cursor = startOfLocalDay(startDate);
  const end = endOfLocalDay(endDate);

  while (cursor <= end) {
    const dayStart = startOfLocalDay(cursor);
    const dayEnd = endOfLocalDay(cursor);
    ranges.push({
      date: getLocalDateKey(dayStart),
      start: dayStart,
      end: dayEnd,
    });
    cursor = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + 1,
      0,
      0,
      0,
      0,
    );
  }

  return ranges;
};

export const getDateRangeForLastDays = (days: number, endDate = new Date()) => {
  const safeDays = Math.max(1, Math.floor(days));
  const end = endOfLocalDay(endDate);
  const start = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate() - (safeDays - 1),
    0,
    0,
    0,
    0,
  );

  return { startDate: start, endDate: end };
};
