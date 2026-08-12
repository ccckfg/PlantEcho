export interface LocalTimeContext {
  timezone: string;
  localTime: string;
  timeOfDay: "morning" | "day" | "evening" | "night";
  minuteOfDay: number;
}

export const normalizeIanaTimezone = (value: string | undefined): string | null => {
  const timezone = value?.trim();
  if (!timezone) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date(0));
    return timezone;
  } catch {
    return null;
  }
};

const timeOfDay = (hour: number): LocalTimeContext["timeOfDay"] => {
  if (hour < 6) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "day";
  if (hour < 22) return "evening";
  return "night";
};

export const localTimeContext = (
  date: Date,
  requestedTimezone: string | undefined,
  fallbackTimezone: string
): LocalTimeContext => {
  const timezone = normalizeIanaTimezone(requestedTimezone) ??
    normalizeIanaTimezone(fallbackTimezone) ??
    "UTC";
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  );
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  return {
    timezone,
    localTime: `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`,
    timeOfDay: timeOfDay(hour),
    minuteOfDay: hour * 60 + minute
  };
};

export const clockMinutes = (clock: string): number => {
  const [hour, minute] = clock.split(":").map(Number);
  return hour * 60 + minute;
};

export const isMinuteInWindow = (
  minuteOfDay: number,
  startClock: string,
  endClock: string
): boolean => {
  const start = clockMinutes(startClock);
  const end = clockMinutes(endClock);
  if (start === end) return true;
  return start < end
    ? minuteOfDay >= start && minuteOfDay < end
    : minuteOfDay >= start || minuteOfDay < end;
};
