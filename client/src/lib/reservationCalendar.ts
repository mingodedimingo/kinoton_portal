import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ko } from "date-fns/locale";

export type ReservationView = "day" | "week" | "month";

export const RESERVATION_OPEN_HOUR = 8;
export const RESERVATION_CLOSE_HOUR = 18;
export const RESERVATION_SLOT_MINUTES = 30;

const WEEK_OPTIONS = { weekStartsOn: 1 as const };

export function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function fromDateKey(value: string) {
  return parseISO(value);
}

export function getReservationRange(view: ReservationView, anchorDate: Date) {
  if (view === "day") {
    const key = toDateKey(anchorDate);
    return { startDate: key, endDate: key };
  }

  if (view === "week") {
    return {
      startDate: toDateKey(startOfWeek(anchorDate, WEEK_OPTIONS)),
      endDate: toDateKey(endOfWeek(anchorDate, WEEK_OPTIONS)),
    };
  }

  return {
    startDate: toDateKey(startOfWeek(startOfMonth(anchorDate), WEEK_OPTIONS)),
    endDate: toDateKey(endOfWeek(endOfMonth(anchorDate), WEEK_OPTIONS)),
  };
}

export function getReservationDays(view: ReservationView, anchorDate: Date) {
  const range = getReservationRange(view, anchorDate);
  return eachDayOfInterval({
    start: fromDateKey(range.startDate),
    end: fromDateKey(range.endDate),
  });
}

export function moveReservationAnchor(
  view: ReservationView,
  anchorDate: Date,
  amount: number
) {
  if (view === "day") return addDays(anchorDate, amount);
  if (view === "week") return addWeeks(anchorDate, amount);
  return addMonths(anchorDate, amount);
}

export function formatReservationRange(
  view: ReservationView,
  anchorDate: Date
) {
  const { startDate, endDate } = getReservationRange(view, anchorDate);
  const start = fromDateKey(startDate);
  const end = fromDateKey(endDate);

  if (view === "day")
    return format(anchorDate, "yyyy년 M월 d일 (EEE)", { locale: ko });
  if (view === "week") {
    if (format(start, "yyyy-MM") === format(end, "yyyy-MM")) {
      return `${format(start, "yyyy년 M월 d일", { locale: ko })} – ${format(end, "d일", { locale: ko })}`;
    }
    return `${format(start, "yyyy년 M월 d일", { locale: ko })} – ${format(end, "M월 d일", { locale: ko })}`;
  }
  return format(anchorDate, "yyyy년 M월", { locale: ko });
}

export function timeToMinutes(time: string) {
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function minutesToTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function getTimelinePosition(time: string) {
  const start = RESERVATION_OPEN_HOUR * 60;
  const end = RESERVATION_CLOSE_HOUR * 60;
  const minutes = Math.min(Math.max(timeToMinutes(time), start), end);
  return ((minutes - start) / (end - start)) * 100;
}

export function getTimelineSelection(offsetX: number, width: number) {
  const start = RESERVATION_OPEN_HOUR * 60;
  const end = RESERVATION_CLOSE_HOUR * 60;
  const raw =
    start +
    (Math.max(0, Math.min(offsetX, width)) / Math.max(width, 1)) *
      (end - start);
  const snapped =
    Math.floor(raw / RESERVATION_SLOT_MINUTES) * RESERVATION_SLOT_MINUTES;
  const startMinutes = Math.min(
    Math.max(snapped, start),
    end - RESERVATION_SLOT_MINUTES
  );
  const endMinutes = Math.min(startMinutes + 60, end);
  return {
    startTime: minutesToTime(startMinutes),
    endTime: minutesToTime(endMinutes),
  };
}

export { isSameDay, isSameMonth };
