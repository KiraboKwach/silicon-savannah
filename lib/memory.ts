import { initialWorld, home, type World, type TaskStatus, type AgentStatus } from "./simulation.ts";
export type Evidence = { label: string; ref: string; verification?: string; id?: string };
export type Check = { name: string; result: "passed" | "failed" | "not_run" };
export type Result = {
  id: string;
  time: string;
  outcome: string;
  attempted: string;
  changed: string;
  remaining: string;
  nextAction: string;
  reason?: string;
  checks: Check[];
  artifacts: Evidence[];
};
export type MemoryTask = {
  id: string;
  title: string;
  status: string;
  owner: string | null;
  source: string;
  dependencies: string[];
  acceptance: string[];
  requiresApproval: boolean;
  verification: string;
  summary: string;
  blocker: string | null;
  nextAction: string | null;
  results: Result[];
  handoffs: {
    time: string;
    from: string;
    to?: string;
    summary: string;
    remaining: string;
    nextAction: string;
  }[];
  acceptanceRecord: unknown;
};
export type SharedIdea = {
  id: string;
  at: string;
  author: string;
  authorRole: string;
  sourceProjectId: string;
  sourceProjectName: string;
  attribution?: string | null;
  sourceTaskTitle: string | null;
  title: string;
  text: string;
  recipients: string[];
  verification: string;
  evidence: Evidence[];
  reference: string | null;
  replies: {
    id: string;
    at: string;
    author: string;
    authorRole: string;
    text: string;
    projectId: string;
    projectName: string;
  }[];
  suppliedTo: { projectId: string; agentId: string; at: string }[];
};
export type Briefing = {
  crossProjectIdeas?: SharedIdea[];
  timestamp: string;
  revision: number;
  objective: string;
  constraints: unknown[];
  task: MemoryTask;
  dependencies: { id: string; title: string; status: string }[];
  relatedWork: { id: string; title: string; owner: string; status: string }[];
  recommendedNextAction: string;
  dataBoundary: string;
  handoff: MemoryTask["handoffs"][number] | null;
};
export type MemoryProject = {
  id: string;
  name: string;
  mode: string;
  objective: string | null;
  scope: string | null;
  requirements: string[];
  acceptanceCriteria: string[];
  decisions: unknown[];
  constraints: unknown[];
  notes: unknown[];
  questions: unknown[];
  artifacts: Evidence[];
  revision: number;
  updatedAt: string;
  instructionsRevision: number;
  tasks: MemoryTask[];
  agents: { id: string; name: string; role: string; mode: string }[];
  runs: {
    id: string;
    taskId: string;
    agentId: string;
    adapter: string;
    status: string;
    context: Briefing;
    contextSuppliedAt: string;
    heartbeatAt?: string;
    startedAt: string;
  }[];
  events: {
    id: string;
    time: string;
    type: string;
    actor: string;
    taskId?: string;
    details: unknown;
  }[];
  summary: {
    total: number;
    completed: number;
    active: number;
    review: number;
    blocked: number;
    progress: number | null;
  };
};
export type MemorySnapshot = {
  projects: MemoryProject[];
  demo: { running: boolean; speed: number };
  synchronizedAt: string;
};
export async function api<T = Record<string, unknown>>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok)
    throw Object.assign(Error(String(data.error || "Unable to update shared memory")), {
      status: response.status,
    });
  return data as T;
}
export function demoWorld(projects: MemoryProject[], online: boolean, running: boolean): World {
  const w = initialWorld();
  w.events = [];
  w.projects = projects.map((p, i) => ({
    ...w.projects[i],
    name: p.name,
    progress: p.summary.progress ?? 0,
    status: (p.summary.review
      ? "in_review"
      : p.summary.active
        ? "in progress"
        : p.summary.blocked
          ? "blocked"
          : p.summary.progress === 100
            ? "completed"
            : "not started") as TaskStatus,
    tasks: p.tasks.map((t) => ({
      id: t.id,
      projectId: "p" + i,
      title: t.title,
      description: t.summary || "Demo manifest execution",
      status: t.status.replaceAll("_", " ") as TaskStatus,
      progress: t.status === "completed" ? 100 : 0,
      assignedAgentId: t.owner?.replace("demo:", ""),
    })),
    assignedAgents: p.tasks
      .filter((t) => t.owner && ["assigned", "in_progress"].includes(t.status))
      .map((t) => t.owner!.replace("demo:", "")),
  }));
  w.agents = w.agents.map((a, i) => {
    const p = projects.find((p) =>
        p.tasks.some(
          (t) =>
            t.owner === "demo:" + a.id &&
            ["assigned", "in_progress", "in_review", "blocked", "failed"].includes(t.status),
        ),
      ),
      t = p?.tasks.find(
        (t) =>
          t.owner === "demo:" + a.id &&
          ["assigned", "in_progress", "in_review", "blocked", "failed"].includes(t.status),
      ),
      pi = p ? projects.indexOf(p) : -1;
    const run = p?.runs.findLast((r) => r.taskId === t?.id && r.status === "active");
    const fresh = run && Date.now() - Date.parse(run.heartbeatAt || run.startedAt) < 15000;
    const status: AgentStatus = !online
      ? "offline"
      : t?.status === "in_progress"
        ? running && fresh
          ? "working"
          : "waiting"
        : t?.status === "assigned"
          ? "moving"
          : t?.status === "in_review"
            ? "waiting"
            : t?.status === "blocked" || t?.status === "failed"
              ? "blocked"
              : "idle";
    return {
      ...a,
      status,
      currentProjectId: p ? "p" + pi : undefined,
      currentTaskId: t?.id,
      position: p
        ? { x: w.projects[pi].position.x - 40 + (i % 3) * 38, y: w.projects[pi].position.y + 60 }
        : home(i),
    };
  });
  w.events = projects
    .flatMap((p) =>
      p.events
        .slice(-3)
        .map((e) => ({ time: e.time, text: p.name + ": " + e.type.replaceAll("_", " ") })),
    )
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 8)
    .map((e) => e.text);
  return w;
}
