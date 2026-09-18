import type { LiveProject } from "./live";
export const STROLL_MS = 24000;
export function chooseStroller(
  projects: LiveProject[],
  lastVisits: Record<string, number>,
  now: number,
) {
  return projects
    .filter(
      (p) =>
        p.status === "idle" &&
        !p.stale &&
        typeof p.idleSince === "number" &&
        now - p.idleSince >= 300000 &&
        now - (lastVisits[p.id] ?? 0) >= 600000,
    )
    .sort(
      (a, b) =>
        (lastVisits[a.id] ?? 0) - (lastVisits[b.id] ?? 0) ||
        (a.idleSince ?? now) - (b.idleSince ?? now),
    )[0];
}
export function strollPhase(elapsed: number): "outbound" | "looking" | "returning" | null {
  return elapsed < 0 || elapsed >= STROLL_MS
    ? null
    : elapsed < 9000
      ? "outbound"
      : elapsed < 15000
        ? "looking"
        : "returning";
}
