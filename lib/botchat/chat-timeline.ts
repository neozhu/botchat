const TIMELINE_TIME_ZONE = "UTC";
const TIMELINE_LOCALE = "en-US";

export function getTimelineDayKey(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function formatTimelineDay(date: Date) {
  return new Intl.DateTimeFormat(TIMELINE_LOCALE, {
    timeZone: TIMELINE_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(date);
}
