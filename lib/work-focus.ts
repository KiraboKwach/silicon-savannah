import type { LiveProject } from "./live";
import type { MemoryProject } from "./memory";
export function workFocus(project: LiveProject, memory?: MemoryProject) {
  const active = project.status === "working";
  const step = project.plan.find((t) => t.status === "in progress");
  const task = memory?.tasks.find(
    (t) => ["assigned", "in_progress"].includes(t.status) && t.source !== "codex-observation",
  );
  const plain = (text: string) => text.replace(/[#*`]/g, "").replace(/\s+/g, " ").trim();
  return {
    label: active ? "Being built now" : "Latest reported work",
    text: plain(
      (active ? step?.title || task?.title : undefined) ||
        project.summary ||
        project.plan.at(-1)?.title ||
        (active
          ? "Agent is working; a specific task has not been reported yet."
          : "No work details reported yet."),
    ),
    review: !memory?.summary.total
      ? "No tracked work"
      : !memory.summary.completed
        ? "Not reviewed yet"
        : `${memory.summary.completed}/${memory.summary.total} reviewed complete`,
  };
}
