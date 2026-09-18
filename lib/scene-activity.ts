import type { MemoryProject } from "./memory";
import type { LiveProject } from "./live";
export function acceptedTaskIds(project?: MemoryProject) {
  return new Set(
    (project?.tasks || [])
      .filter(
        (t) => t.status === "completed" && t.verification === "accepted" && !!t.acceptanceRecord,
      )
      .map((t) => t.id),
  );
}
export function newlyAccepted(before: Set<string> | undefined, after: Set<string>) {
  return !!before && [...after].some((id) => !before.has(id));
}
export function activityCaption(project: LiveProject, connected: boolean) {
  if (!connected || project.status === "offline") return "Disconnected · last observed state";
  if (project.stale || project.status === "unknown") return "Activity unknown · check connection";
  if (
    project.status !== "working" &&
    project.initiative?.status === "completed" &&
    project.initiative.report &&
    Date.parse(project.initiative.finishedAt || "") >= project.lastAt
  )
    return "Next-task review ready";
  if (project.status === "blocked" || project.signal?.kind === "attention")
    return "Needs your input · inspect project";
  if (project.status === "working")
    return project.signal?.label || project.stage || "Observed work in progress";
  return project.stage || "Available for the next task";
}
