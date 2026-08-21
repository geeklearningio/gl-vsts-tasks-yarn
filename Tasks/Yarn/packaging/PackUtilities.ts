// Placed as a separate file for the purpose of unit testing
const utcTimezone: string = "utc";
const localTimezone: string = "local";

export function getNowDateString(timezone: string): string {
  if (timezone === utcTimezone) {
    return getUtcDateString(new Date());
  }

  if (timezone === localTimezone) {
    return getLocalDateString(new Date());
  }

  throw new Error("Internal error: Unknown timezone");
}

export function getUtcDateString(now: Date): string {
  const year: string = "" + now.getUTCFullYear();
  const month: string = getTwoDigitNumberString(now.getUTCMonth() + 1); // Month is zero-based, so adding one
  const date: string = getTwoDigitNumberString(now.getUTCDate());
  const hours: string = getTwoDigitNumberString(now.getUTCHours());
  const minutes: string = getTwoDigitNumberString(now.getUTCMinutes());
  const seconds: string = getTwoDigitNumberString(now.getUTCSeconds());

  return `${year}${month}${date}-${hours}${minutes}${seconds}`;
}

export function getLocalDateString(now: Date): string {
  const year: string = "" + now.getFullYear();
  const month: string = getTwoDigitNumberString(now.getMonth() + 1); // Month is zero-based, so adding one
  const date: string = getTwoDigitNumberString(now.getDate());
  const hours: string = getTwoDigitNumberString(now.getHours());
  const minutes: string = getTwoDigitNumberString(now.getMinutes());
  const seconds: string = getTwoDigitNumberString(now.getSeconds());

  return `${year}${month}${date}-${hours}${minutes}${seconds}`;
}

function getTwoDigitNumberString(number: number): string {
  return number < 10 ? "0" + number : "" + number;
}
