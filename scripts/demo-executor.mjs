import { createHash, randomUUID } from "node:crypto";
// A deliberately limited executable adapter, separate from avatar movement.
// Its output is a checked manifest, never a claim that project software was built.
export class DemoExecutor {
  constructor(store) {
    this.store = store;
    this.running = false;
    this.speed = 1;
    this.executions = new Map();
  }
  setRunning(value) {
    this.running = value;
  }
  actor(id, projectId) {
    return { id, role: "agent", projectId };
  }
  change(p, actor, operation, input, key = randomUUID()) {
    return this.store.command(p.id, actor, operation, input, { revision: p.revision, key });
  }
  step() {
    if (!this.running) return;
    for (let p of this.store.list("demo")) {
      for (const t of p.tasks.filter((t) => t.status === "in_progress")) {
        const run = p.runs.findLast((r) => r.taskId === t.id && r.status === "active");
        if (!run) continue;
        let execution = this.executions.get(run.id);
        if (!execution) {
          const supplied = this.change(p, this.actor(t.owner, p.id), "refresh_context", {
            taskId: t.id,
            runId: run.id,
          });
          p = supplied.project;
          execution = { due: Date.now() + 6000 / this.speed, context: supplied.context };
          this.executions.set(run.id, execution);
        }
        if (Date.now() < execution.due) continue;
        if (run.instructionsRevision !== p.instructionsRevision) {
          const supplied = this.change(p, this.actor(t.owner, p.id), "refresh_context", {
            taskId: t.id,
            runId: run.id,
          });
          p = supplied.project;
          execution.context = supplied.context;
        }
        const manifest = {
          projectId: execution.context.projectId,
          taskId: execution.context.taskId,
          contextRevision: execution.context.revision,
          constraints: execution.context.constraints,
        };
        const passed = manifest.projectId === p.id && manifest.taskId === t.id;
        const checksum = createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
        p = this.change(
          p,
          this.actor(t.owner, p.id),
          "result",
          {
            taskId: t.id,
            runId: run.id,
            outcome: passed ? "done" : "failed",
            attempted:
              "Demo adapter read its supplied context and generated a synthetic task manifest.",
            changed: "Generated and checked a demo manifest. No real project files were changed.",
            checks: [
              {
                name: "Manifest contains the correct task and project IDs",
                result: passed ? "passed" : "failed",
              },
            ],
            artifacts: [{ label: "Synthetic manifest checksum", ref: "demo:sha256:" + checksum }],
            remaining: "Human review of this demo result.",
            nextAction: "Review the manifest evidence and accept or leave it in review.",
            reason: passed ? null : "Demo manifest IDs did not match.",
          },
          "demo-result:" + run.id,
        ).project;
        this.executions.delete(run.id);
      }
      for (const t of p.tasks.filter(
        (t) => t.status === "assigned" && t.source === "demo-fixture",
      )) {
        const agent = p.agents.find((a) => a.id === t.owner);
        if (agent?.mode !== "demo") continue;
        try {
          p = this.change(p, this.actor(t.owner, p.id), "start", { taskId: t.id }).project;
        } catch {
          /* Dependency or revision change: refresh next iteration. */
        }
      }
      for (const t of p.tasks.filter(
        (t) =>
          t.status === "not_started" &&
          t.dependencies.every((id) => p.tasks.find((d) => d.id === id)?.status === "completed"),
      )) {
        const busy = new Set(
          this.store
            .list("demo")
            .flatMap((p) =>
              p.tasks
                .filter((t) => ["assigned", "in_progress"].includes(t.status))
                .map((t) => t.owner),
            ),
        );
        const agent = p.agents.find((a) => a.mode === "demo" && !busy.has(a.id));
        if (!agent) break;
        try {
          p = this.change(p, this.actor(agent.id, p.id), "claim", { taskId: t.id }).project;
        } catch {
          /* Safe conflict; another client may have claimed it. */
        }
      }
    }
  }
}
