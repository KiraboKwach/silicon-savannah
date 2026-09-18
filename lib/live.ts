import type { MemoryProject, SharedIdea } from "./memory";
import type { World, Task, AgentStatus } from "./simulation";
import { initialWorld, home } from "./simulation";
export type WorkSignal = {
  kind: string;
  label: string;
  files: string[];
  question: string | null;
  testResult: string | null;
};
export type LiveProject = {
  id: string;
  name: string;
  taskTitle: string;
  signal?: WorkSignal;
  initiative?: {
    status: string;
    startedAt: string;
    finishedAt?: string;
    stage: string;
    report: string | null;
  } | null;
  publicLinks?: { label: string; url: string; description: string }[];
  status: string;
  stage: string;
  summary?: string;
  lastAt: number;
  idleSince?: number | null;
  codexUrl?: string;
  activity?: { sessions: number; averageIdleMs: number | null };
  progress: number | null;
  stale?: boolean;
  turnStatus?: string;
  steps: { id: string; title: string; status: string; time: number }[];
  plan: { id: string; title: string; status: string }[];
};
export type LiveSnapshot = {
  connected: boolean;
  source: string;
  observedAt: string;
  memory?: MemoryProject[];
  exchange?: SharedIdea[];
  projects: LiveProject[];
  catalog?: (LiveProject & { hidden?: boolean })[];
};
export function liveWorld(snapshot: LiveSnapshot): World {
  const w = initialWorld();
  w.agents = w.agents.slice(0, snapshot.projects.length);
  w.projects = snapshot.projects.map((live, i) => {
    const base = w.projects[i];
    const tasks: Task[] = live.plan.map((t) => ({
      id: t.id,
      projectId: base.id,
      title: t.title,
      description: "Reported by the agent’s task plan.",
      status: t.status as Task["status"],
      progress: t.status === "completed" ? 100 : 0,
    }));
    const busy = live.status === "working";
    const a = w.agents[i];
    a.name = ["Nia", "Kito", "Amani", "Zuri", "Jabari"][i];
    a.type = live.taskTitle;
    a.status = (
      !snapshot.connected || live.status === "offline"
        ? "offline"
        : live.stale || live.status === "unknown"
          ? "unknown"
          : busy
            ? "working"
            : live.status === "blocked"
              ? "blocked"
              : live.status === "waiting"
                ? "waiting"
                : "idle"
    ) as AgentStatus;
    a.currentProjectId = base.id;
    a.position = busy ? { x: base.position.x - 88, y: base.position.y + 5 } : home(i);
    return {
      ...base,
      name: live.name,
      description: live.taskTitle,
      tasks,
      progress: snapshot.memory?.find((p) => p.id === live.id)?.summary.progress ?? 0,
      status: busy ? "in progress" : live.status === "blocked" ? "blocked" : "not started",
      assignedAgents: busy ? [a.id] : [],
    };
  });
  w.events = snapshot.projects
    .filter((p) => p.summary)
    .sort((a, b) => b.lastAt - a.lastAt)
    .map((p) => `${p.name}: ${p.stage}`);
  return w;
}
