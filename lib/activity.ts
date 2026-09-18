import type { LiveProject } from "./live";
export function duration(ms: number) {
  const minutes = Math.floor(Math.max(0, ms) / 60000);
  if (minutes < 1) return "less than a minute";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ${minutes % 60}m` : `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
export function activityLabel(project: LiveProject, now: number) {
  if (project.status === "working") return "Working now";
  if (project.status === "offline") return "Offline · last known activity";
  if (project.status === "blocked") return "Needs attention";
  if (project.status !== "idle" || !project.lastAt) return "Activity unknown";
  return `Idle for ${duration(now - (project.idleSince || project.lastAt))}`;
}
