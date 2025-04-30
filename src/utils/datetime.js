function getCurrentWeekStartDate() {
  const now = new Date();
  weekDay = now.getDay();
  const diff = (weekDay === 0) ? -6 : 1 - weekDay;
  const monday = new Date(now);
  monday.setDate(monday.getDate() + diff)
  return formatDate(monday);
}
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentDate() {
  const now = new Date();
  const sydneyDate = new Date(
    now.toLocaleString("en-US", { timeZone: "Australia/Sydney" })
  );
  const formattedDate = `${sydneyDate.getFullYear()}-${String(
    sydneyDate.getMonth() + 1
  ).padStart(2, "0")}-${String(sydneyDate.getDate()).padStart(2, "0")}`;
  return formattedDate;
}

/**
 * Convert a Date object representing a Sydney-local datetime
 * into the equivalent UTC datetime string (YYYY-MM-DD HH:mm:ss).
 *
 * @param {Date} dateObj - JavaScript Date representing a Sydney-local datetime.
 * @returns {string} UTC datetime in 'YYYY-MM-DD HH:mm:ss' format.
 */
function convertSydneyLocalDateToUTC(dateObj) {
  // Build UTC components directly from the Date object
  const pad = (n) => String(n).padStart(2, '0');
  const year = dateObj.getUTCFullYear();
  const month = pad(dateObj.getUTCMonth() + 1);
  const day = pad(dateObj.getUTCDate());
  const hours = pad(dateObj.getUTCHours());
  const minutes = pad(dateObj.getUTCMinutes());
  const seconds = pad(dateObj.getUTCSeconds());
  const sydneyDate = new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}`);

  return sydneyDate.toISOString();
}

function getCurrentWeek(startDate) {
  const campaignStart = new Date(startDate);
  const today = new Date();

  const daysSinceStart = Math.floor(
    (today - campaignStart) / (1000 * 60 * 60 * 24)
  );
  return Math.floor(daysSinceStart / 7) + 1;
}

function getTotalWeeks(startDate, endDate) {
  const campaignStart = new Date(startDate);
  const campaignEnd = new Date(endDate);

  const diffDays = Math.ceil(
    (campaignEnd - campaignStart) / (1000 * 60 * 60 * 24)
  );
  return Math.floor(diffDays / 7);
}

module.exports = {
  getCurrentWeekStartDate,
  getCurrentDate,
  formatDate,
  convertSydneyLocalDateToUTC,
  getTotalWeeks,
  getCurrentWeek
};