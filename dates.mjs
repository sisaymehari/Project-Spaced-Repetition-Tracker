/**
 * Date calculation utilities for spaced repetition
 * All dates are handled in UTC to avoid timezone/DST issues
 */

/**
 * Add a specific number of days to a date
 * @param {Date} date - The starting date
 * @param {number} days - Number of days to add
 * @returns {Date} - New date with days added
 */
export function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Add a specific number of months to a date
 * @param {Date} date - The starting date
 * @param {number} months - Number of months to add
 * @returns {Date} - New date with months added
 */
export function addMonths(date, months) {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

/**
 * Add a specific number of years to a date
 * @param {Date} date - The starting date
 * @param {number} years - Number of years to add
 * @returns {Date} - New date with years added
 */
export function addYears(date, years) {
  const result = new Date(date);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
}

/**
 * Calculate all revision dates for a topic based on spaced repetition intervals
 * @param {string} dateString - The start date in YYYY-MM-DD format
 * @returns {Date[]} - Array of revision dates (1 week, 1 month, 3 months, 6 months, 1 year)
 */
export function calculateRevisionDates(dateString) {
  // Parse date as UTC to avoid timezone issues
  const startDate = new Date(dateString + "T00:00:00.000Z");

  return [
    addDays(startDate, 7), // 1 week
    addMonths(startDate, 1), // 1 month
    addMonths(startDate, 3), // 3 months
    addMonths(startDate, 6), // 6 months
    addYears(startDate, 1), // 1 year
  ];
}

/**
 * Format a date for display
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string (e.g., "26th July 2026")
 */
export function formatDate(date) {
  const day = date.getUTCDate();
  const month = date.toLocaleDateString("en-GB", {
    month: "long",
    timeZone: "UTC",
  });
  const year = date.getUTCFullYear();

  // Add ordinal suffix to day
  const ordinal = getOrdinalSuffix(day);

  return `${day}${ordinal} ${month} ${year}`;
}

/**
 * Get ordinal suffix for a number (st, nd, rd, th)
 * @param {number} num - The number
 * @returns {string} - The ordinal suffix
 */
function getOrdinalSuffix(num) {
  if (num >= 11 && num <= 13) {
    return "th";
  }

  const lastDigit = num % 10;
  switch (lastDigit) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/**
 * Get today's date as a UTC date at midnight
 * @returns {Date} - Today's date in UTC
 */
export function getTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/**
 * Check if a date is in the future (compared to today UTC)
 * @param {Date} date - The date to check
 * @returns {boolean} - True if the date is in the future
 */
export function isFutureDate(date) {
  const today = getTodayUTC();
  return date >= today;
}

/**
 * Get today's date in YYYY-MM-DD format for date input default value
 * @returns {string} - Today's date as string
 */
export function getTodayString() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}
