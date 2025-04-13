// client/src/utils/time.js
import { DateTime } from "luxon";

export const formatUKDateTime = (value, withSeconds = true) => {
  try {
    const dt = DateTime.fromISO(value, { zone: "utc" }); // Treat as UTC
    return dt.setZone("Europe/London").toFormat(
      withSeconds ? "dd/MM/yyyy HH:mm:ss" : "dd/MM/yyyy HH:mm"
    );
  } catch {
    return "Invalid time";
  }
};
