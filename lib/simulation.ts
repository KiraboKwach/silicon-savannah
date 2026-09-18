export type TaskStatus =
  | "not started"
  | "in progress"
  | "blocked"
  | "completed"
  | "assigned"
  | "in review"
  | "in_review"
  | "failed"
  | "cancelled";
export type AgentStatus =
  | "idle"
  | "assigned"
  | "moving"
  | "working"
  | "completed"
  | "blocked"
  | "unknown"
  | "waiting"
  | "offline";
export type Position = { x: number; y: number };
export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  progress: number;
  assignedAgentId?: string;
};
export type Project = {
  id: string;
  name: string;
  description: string;
  position: Position;
  color: string;
  tasks: Task[];
  progress: number;
  status: TaskStatus;
  assignedAgents: string[];
};
export type Agent = {
  id: string;
  name: string;
  type: string;
  status: AgentStatus;
  currentProjectId?: string;
  currentTaskId?: string;
  position: Position;
  destination?: Position;
  clock: number;
  color: string;
};
export type World = { projects: Project[]; agents: Agent[]; events: string[]; tick: number };
const names = [
  "Nia",
  "Kito",
  "Amani",
  "Zuri",
  "Jabari",
  "Imani",
  "Baraka",
  "Neema",
  "Sifa",
  "Taji",
];
const roles = [
  "Frontend builder",
  "Systems architect",
  "QA guardian",
  "UI designer",
  "API engineer",
  "Data specialist",
  "Security guardian",
  "Mobile builder",
  "Release coordinator",
  "Research scout",
];
const colors = ["#ff7855", "#eab85c", "#58ceba", "#b7a0ed", "#71b3e8"];
export function home(i: number): Position {
  return { x: 390 + (i % 5) * 40, y: 514 + Math.floor(i / 5) * 40 };
}
export function reconcile(w: World): World {
  w.projects.forEach((p) => {
    p.progress = Math.round(p.tasks.reduce((s, t) => s + t.progress, 0) / p.tasks.length);
    p.status = p.tasks.every((t) => t.status === "completed")
      ? "completed"
      : p.tasks.some((t) => t.status === "blocked")
        ? "blocked"
        : p.tasks.some((t) => t.status === "in progress")
          ? "in progress"
          : "not started";
    p.assignedAgents = w.agents
      .filter(
        (a) => a.currentProjectId === p.id && ["assigned", "moving", "working"].includes(a.status),
      )
      .map((a) => a.id);
  });
  return w;
}
export function initialWorld(): World {
  const specs = [
    [
      "Market Garden",
      "Sample project: a neighbourhood produce marketplace.",
      230,
      205,
      ["Market data pipeline", "Portfolio experience", "Voice-note routing", "Release validation"],
    ],
    [
      "Studio Tools",
      "Sample project: a toolkit for independent creators.",
      510,
      145,
      ["Brand and design system", "Trading dashboard", "Order workflow", "Broker integration"],
    ],
    [
      "Trail Guide",
      "A travel companion for itineraries, tickets and memories.",
      790,
      230,
      ["Itinerary builder", "Booking wallet", "Travel journal", "Offline access"],
    ],
    [
      "Community Hub",
      "Sample project: events and shared spaces.",
      825,
      470,
      ["Service catalogue", "Preview experience", "Load testing", "Performance review"],
    ],
    [
      "Nairobi innovation lab",
      "Demo project: a shared home for the next generation of ideas.",
      175,
      470,
      ["Site foundation", "Collaboration rooms", "Energy monitoring", "Launch readiness"],
    ],
  ] as const;
  const projects: Project[] = specs.map((s, i) => ({
    id: "p" + i,
    name: s[0],
    description: s[1],
    position: { x: s[2], y: s[3] },
    color: colors[i],
    tasks: s[4].map((title, j) => ({
      id: `p${i}t${j}`,
      projectId: "p" + i,
      title,
      description:
        j === 3
          ? "Verify quality and prepare the project for delivery."
          : "Build and validate this part of the project.",
      status: j < i % 3 ? "completed" : i === 3 && j === 2 ? "blocked" : "not started",
      progress: j < i % 3 ? 100 : 0,
    })),
    progress: 0,
    status: "not started",
    assignedAgents: [],
  }));
  return reconcile({
    projects,
    agents: characterRoster(),
    events: ["Coordination hub ready. Choose a task or run the demo."],
    tick: 0,
  });
}

/** Shared identity roster for the scene and development art review; no task fixtures. */
export function characterRoster(): Agent[] {
  return names.map((name, i) => ({
    id: "a" + i,
    name,
    type: roles[i],
    status: "idle",
    position: home(i),
    clock: 0,
    color: colors[i % 5],
  }));
}
