import type { MemoryProject } from "./memory";
import type { Project } from "./simulation";
export function constructionState(project: Project, memory?: MemoryProject) {
  const tasks = memory?.tasks || [];
  const accepted = tasks.filter(
    (t) => t.status === "completed" && t.verification === "accepted" && !!t.acceptanceRecord,
  );
  const complete = tasks.length > 0 && accepted.length === tasks.length;
  return {
    tasks,
    accepted,
    complete,
    known: !!memory && tasks.length > 0,
    progress: tasks.length ? Math.round((accepted.length / tasks.length) * 100) : null,
    blocked:
      project.status === "blocked" ||
      tasks.some((t) => t.status === "blocked" || t.status === "failed"),
  };
}
/** Stable task-to-section mapping shared by selection and construction artwork. */
export function componentIndex(
  taskId: string | undefined,
  project: Project,
  memory: MemoryProject | undefined,
  count: number,
) {
  const recorded = memory?.tasks.findIndex((t) => t.id === taskId) ?? -1;
  const observed = project.tasks.findIndex((t) => t.id === taskId);
  return Math.max(0, recorded >= 0 ? recorded : observed) % count;
}
