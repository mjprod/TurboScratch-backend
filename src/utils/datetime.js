function getCurrentWeekStartDate() {
  const now = new Date();
  const options = {
    timeZone: "Australia/Sydney",
    hour12: false,
    weekday: "short",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  };

  const parts = new Intl.DateTimeFormat("en-AU", options)
    .formatToParts(now)
    .reduce((acc, { type, value }) => ({ ...acc, [type]: value }), {});

  const year = parseInt(parts.year, 10);
  const month = parseInt(parts.month, 10) - 1;
  const day = parseInt(parts.day, 10);
  const hour = parseInt(parts.hour, 10);
  const minute = parseInt(parts.minute, 10);
  const second = parseInt(parts.second, 10);

  const monday = new Date(year, month, day, hour, minute, second);
  const weekdayMapping = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekDay = weekdayMapping[parts.weekday];
  const diff = weekDay === 0 ? -6 : 1 - weekDay;

  monday.setDate(monday.getDate() + diff)
  return monday.toISOString().split("T")[0];
}

module.exports = { getCurrentWeekStartDate };