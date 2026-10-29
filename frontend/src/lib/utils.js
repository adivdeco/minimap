import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a 24h "HH:mm" time string or Date/ISO string to 12h "hh:mm AM/PM" format.
 * Examples:
 *   "06:00" -> "6:00 AM"
 *   "11:00" -> "11:00 AM"
 *   "16:00" -> "4:00 PM"
 *   "21:00" -> "9:00 PM"
 *   "22:00" -> "10:00 PM"
 *   "00:00" -> "12:00 AM"
 */
export function formatTime12h(time) {
  if (!time) return '';
  if (time instanceof Date) {
    return time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  const str = String(time).trim();
  if (str.includes('T') || str.includes('Z')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    }
  }
  const match = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return str;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Formats a time range into 12-hour AM/PM format.
 * Example: "16:00", "21:00" -> "4:00 PM – 9:00 PM"
 */
export function formatTimeRange12h(startTime, endTime) {
  if (!startTime && !endTime) return '';
  if (!startTime) return formatTime12h(endTime);
  if (!endTime) return formatTime12h(startTime);
  return `${formatTime12h(startTime)} – ${formatTime12h(endTime)}`;
}
