// Thailand timezone utilities
// Thailand is UTC+7 (Asia/Bangkok)

const THAILAND_TIMEZONE = "Asia/Bangkok";

export function formatThaiDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    timeZone: THAILAND_TIMEZONE,
    ...options,
  });
}

export function formatThaiTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    timeZone: THAILAND_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...options,
  });
}

export function formatThaiDateTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    timeZone: THAILAND_TIMEZONE,
    ...options,
  });
}

export function formatThaiDateWithTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    timeZone: THAILAND_TIMEZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatThaiRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;

  // Get current time in Thailand
  const nowInThai = new Date().toLocaleString("en-US", { timeZone: THAILAND_TIMEZONE });
  const now = new Date(nowInThai);

  // Get the date in Thailand timezone
  const dateInThai = new Date(d.toLocaleString("en-US", { timeZone: THAILAND_TIMEZONE }));

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(dateInThai.getFullYear(), dateInThai.getMonth(), dateInThai.getDate());

  const timeStr = formatThaiTime(date);

  if (dateOnly.getTime() === today.getTime()) {
    return `Today, ${timeStr}`;
  } else if (dateOnly.getTime() === yesterday.getTime()) {
    return `Yesterday, ${timeStr}`;
  } else {
    return formatThaiDateWithTime(date);
  }
}

export function formatThaiDateKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    timeZone: THAILAND_TIMEZONE,
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function getThaiDateString(): string {
  // Returns today's date in YYYY-MM-DD format in Thailand timezone
  const now = new Date();
  return now.toLocaleDateString("en-CA", { timeZone: THAILAND_TIMEZONE });
}
