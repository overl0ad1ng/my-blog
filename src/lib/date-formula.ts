import { MILLISECONDS_PER_DAY } from "./date-utils";

export type DateInput = string | Date;

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const beijingDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Shanghai",
  calendar: "gregory",
  numberingSystem: "latn",
  era: "short",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

function daysInMonth(year: number, month: number): number {
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function parseDate(input: DateInput): CalendarDate {
  const date = input instanceof Date ? parseBeijingDate(input) : parseCalendarDate(input);
  const { year, month, day } = date;

  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new RangeError("Invalid calendar date.");
  }

  return date;
}

function parseBeijingDate(input: Date): CalendarDate {
  if (!Number.isFinite(input.getTime())) throw new RangeError("Invalid Date input.");
  const parts = beijingDate.formatToParts(input);
  if (parts.some((part) => part.type === "era" && part.value === "BC")) {
    throw new RangeError("Date year must be between 0001 and 9999.");
  }

  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function parseCalendarDate(input: string): CalendarDate {
  const match = /^(\d{4})([/-])(\d{2})\2(\d{2})$/.exec(input);
  if (!match) throw new RangeError("Date must use YYYY/MM/DD or YYYY-MM-DD format.");
  return { year: Number(match[1]), month: Number(match[3]), day: Number(match[4]) };
}

// UTC is used only to count calendar days, so time of day and DST cannot affect the difference.
function dayNumber({ year, month, day }: CalendarDate): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getTime() / MILLISECONDS_PER_DAY;
}

class DateDifference {
  private readonly start: CalendarDate;
  private readonly end: CalendarDate;
  private readonly sign: number;

  constructor(from: DateInput, to: DateInput) {
    const first = parseDate(from);
    const second = parseDate(to);
    this.sign = dayNumber(first) > dayNumber(second) ? -1 : 1;

    [this.start, this.end] = this.sign === 1 ? [first, second] : [second, first];
  }

  private completeUnits(unit: "year" | "month"): number {
    const years = this.end.year - this.start.year;
    let units = unit === "year" ? years : years * 12 + this.end.month - this.start.month;
    const month = unit === "year" ? this.start.month : this.end.month;

    const anniversary = {
      year: this.end.year,
      month,
      day: Math.min(this.start.day, daysInMonth(this.end.year, month)),
    };

    if (dayNumber(anniversary) > dayNumber(this.end)) units -= 1;

    return units === 0 ? 0 : this.sign * units;
  }

  /** Complete calendar years; an anniversary beyond a month's end uses its last day. */
  get toYear(): number {
    return this.completeUnits("year");
  }

  /** Complete calendar months, with the same month-end rule as toYear. */
  get toMonth(): number {
    return this.completeUnits("month");
  }

  /** Signed calendar days, ignoring time of day. */
  get toDay(): number {
    return this.sign * (dayNumber(this.end) - dayNumber(this.start));
  }
}

export class DateFormula {
  readonly now: Date;

  constructor(now: Date = new Date()) {
    this.now = new Date(now.getTime());
  }

  fromTo(from: DateInput, to: DateInput): DateDifference {
    return new DateDifference(from, to);
  }
}
