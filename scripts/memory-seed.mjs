import { createHash } from "node:crypto";
import { initialWorld } from "../lib/simulation.ts";
const digest = (s) => createHash("sha256").update(s).digest("hex").slice(0, 24);
export function seedMemory(store, config) {
  const world = initialWorld();
  config.forEach((p, i) =>
    store.seed({
      id: p.id,
      name: p.name,
      mode: "live",
      objective: p.objective || null,
      scope: p.taskTitle,
      notes: [
        {
          id: "origin",
          text: "Imported task identity from the existing watched-project configuration. Codex observation does not provide execution control.",
        },
      ],
      constraints: [
        {
          id: "unverified",
          text: "Do not infer completed project work from a finished Codex turn or an existing file.",
        },
      ],
      agents: [
        {
          id: "codex:" + p.id,
          name: world.agents[i % world.agents.length].name,
          mode: "observer",
          role: p.taskTitle,
        },
      ],
      tasks: [],
    }),
  );
  world.projects.forEach((p) =>
    store.seed({
      id: "demo:" + p.id,
      name: p.name,
      mode: "demo",
      objective: `Demo adapter: validate a task manifest for ${p.name}. This does not implement the real project.`,
      scope: p.description,
      requirements: ["Use supplied context before the synthetic manifest check."],
      acceptanceCriteria: ["Manifest validation passes and a coordinator reviews the evidence."],
      constraints: [
        {
          id: "demo",
          text: "Synthetic execution only. Do not modify real project files or claim real deliverables.",
        },
      ],
      agents: world.agents.map((a) => ({
        id: "demo:" + a.id,
        name: a.name,
        role: a.type,
        mode: "demo",
      })),
      tasks: p.tasks.map((t, j) => ({
        ...t,
        projectId: undefined,
        progress: undefined,
        assignedAgentId: undefined,
        status:
          t.status === "completed"
            ? "completed"
            : t.status === "blocked"
              ? "blocked"
              : "not_started",
        source: "demo-fixture",
        owner: null,
        acceptance: ["Manifest contains the correct task and project IDs"],
        requiresApproval: true,
        dependencies: j === 3 ? [p.tasks[2].id] : [],
        blocker:
          t.status === "blocked"
            ? "Demo environment access is pending. Resolve access to continue."
            : null,
        verification: t.status === "completed" ? "accepted_demo_fixture" : "unverified",
        acceptanceRecord:
          t.status === "completed"
            ? {
                at: "2026-09-09T00:00:00Z",
                by: "demo-fixture",
                approval: "seeded_demo_baseline",
                artifacts: [{ label: "Existing demo baseline", ref: "demo-fixture:" + t.id }],
                note: "Preserved completed status from the original mock data; not real project evidence.",
              }
            : null,
      })),
    }),
  );
}
export function reconcileObservations(store, observation) {
  for (const observed of observation.projects) {
    let p;
    try {
      p = store.get(observed.id);
    } catch {
      p = store.seed({
        id: observed.id,
        name: observed.name,
        mode: "live",
        scope: observed.taskTitle,
        notes: [
          {
            text: "Automatically discovered local Codex task. Observed work still requires verification.",
          },
        ],
        agents: [
          {
            id: "codex:" + observed.id,
            name: observed.name + " builder",
            mode: "observer",
            role: observed.taskTitle,
          },
        ],
        tasks: [],
      });
    }
    const candidates = observed.plan.map((t) => ({
      id: "observed:" + digest(observed.id + ":" + (observed.turnId || "legacy") + ":" + t.title),
      title: t.title,
      owner: "codex:" + observed.id,
      reportedStatus: t.status,
      acceptance: [],
      summary:
        "Imported from an observed Codex plan; execution and completion have not been verified.",
    }));
    if (
      !candidates.length &&
      ["completed", "inProgress", "failed", "interrupted"].includes(observed.turnStatus)
    ) {
      const identity =
        observed.turnId ||
        (observed.turnStatus === "completed"
          ? String(observed.lastAt)
          : "latest-unidentified-turn");
      candidates.push({
        id: "observed-turn:" + digest(observed.id + ":" + identity),
        title: observed.taskTitle || observed.name + " observed work",
        owner: "codex:" + observed.id,
        reportedStatus:
          observed.turnStatus === "completed"
            ? "completed"
            : observed.turnStatus === "inProgress"
              ? "in progress"
              : "failed",
        acceptance: [],
        summary:
          observed.summary ||
          observed.stage ||
          "Observed turn; completion not independently verified.",
        blocker: ["failed", "interrupted"].includes(observed.turnStatus)
          ? "Observed turn failed or was interrupted. Inspect the original Codex task."
          : null,
      });
    }
    const additions = candidates.filter((t) => {
      const existing = p.tasks.find((x) => x.id === t.id);
      return !existing || existing.reportedStatus !== t.reportedStatus;
    });
    if (additions.length)
      store.command(
        p.id,
        { id: "reconciler", role: "reconciler" },
        "reconcile",
        { tasks: additions },
        {
          revision: p.revision,
          key: "observation:" + p.revision + ":" + digest(JSON.stringify(additions)),
        },
      );
  }
}
