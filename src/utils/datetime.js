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
  const currentDate = new Date();
  const formattedDate = `${currentDate.getFullYear()}-${String(
    currentDate.getMonth() + 1
  ).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
  return formattedDate;
}


module.exports = { getCurrentWeekStartDate, getCurrentDate, formatDate };