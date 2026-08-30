const LAGOS_TZ = "Africa/Lagos";

export function toLagosTime(isoString: string, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-NG", {
    timeZone: LAGOS_TZ,
    ...options,
  });
}

export function toLagosDate(isoString: string): string {
  return toLagosTime(isoString, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function toLagosDateTime(isoString: string): string {
  return toLagosTime(isoString, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
