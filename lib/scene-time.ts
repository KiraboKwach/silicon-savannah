export const SCENE_TIMEZONE = "Africa/Nairobi";
export function sceneTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SCENE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")!.value),
    minute = parts.find((p) => p.type === "minute")!.value;
  const phase =
    hour >= 6 && hour < 7
      ? "dawn"
      : hour >= 7 && hour < 18
        ? "day"
        : hour >= 18 && hour < 19
          ? "sunset"
          : "night";
  return {
    phase,
    time: `${String(hour).padStart(2, "0")}:${minute}`,
    label: { dawn: "Dawn", day: "Daylight", sunset: "Sunset", night: "Night" }[phase],
  };
}
