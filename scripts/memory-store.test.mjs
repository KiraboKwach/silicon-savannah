import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { MemoryStore, projectSummary } from "./memory-store.mjs";
const owner = { id: "human", role: "coordinator" },
  agent = (id) => ({ id, role: "agent", projectId: "p" });
function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "savannah-memory-")),
    file = path.join(dir, "memory.sqlite"),
    store = new MemoryStore(file);
  store.seed({
    id: "p",
    name: "Test project",
    objective: "Deliver a verified change",
    constraints: [{ text: "Preserve working behavior" }],
    agents: [
      { id: "a", name: "A", mode: "runtime" },
      { id: "b", name: "B", mode: "runtime" },
    ],
    tasks: [
      {
        id: "done",
        title: "Verified baseline",
        status: "completed",
        summary: "Already checked",
        acceptanceRecord: { by: "human", artifacts: [{ ref: "test:baseline" }] },
      },
      { id: "task", title: "New change", acceptance: ["unit check"] },
      {
        id: "dependent",
        title: "Dependent task",
        dependencies: ["task"],
        acceptance: ["unit check"],
      },
    ],
  });
  return {
    store,
    file,
    cleanup: () => {
      store.close();
      for (const name of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, name));
      fs.rmdirSync(dir);
    },
  };
}
function cmd(store, who, op, input, revision = store.get("p").revision, key = randomUUID()) {
  return store.command("p", who, op, input, { revision, key });
}
function started(store) {
  cmd(store, agent("a"), "claim", { taskId: "task" });
  return cmd(store, agent("a"), "start", { taskId: "task" });
}
function result(runId, overrides = {}) {
  return {
    taskId: "task",
    runId,
    outcome: "done",
    attempted: "Executed test",
    changed: "Implemented change",
    checks: [{ name: "unit check", result: "passed" }],
    artifacts: [{ label: "Test report", ref: "test:report" }],
    remaining: "Review",
    nextAction: "Human review",
    ...overrides,
  };
}
test("1. accepted work survives repeated seeding and cannot be reclaimed", () => {
  const f = setup();
  try {
    const original = f.store.get("p");
    f.store.seed({ id: "p", name: "Overwrite", tasks: [] });
    assert.deepEqual(f.store.get("p"), original);
    assert.throws(() => cmd(f.store, agent("a"), "claim", { taskId: "done" }), /not available/);
  } finally {
    f.cleanup();
  }
});
test("2. execution receives relevant context; display preview does not count as supplied", () => {
  const f = setup();
  try {
    f.store.seed({
      id: "other",
      name: "Private other project",
      objective: "Unrelated secret",
      tasks: [],
    });
    const context = f.store.getAgentContext("p", "a", "task");
    assert.equal(f.store.get("p").runs.length, 0);
    assert.ok(!JSON.stringify(context).includes("Unrelated secret"));
    const r = started(f.store);
    assert.equal(r.context.task.id, "task");
    assert.equal(r.context.completedWork[0].id, "done");
    assert.equal(r.project.runs[0].contextSuppliedAt.length > 0, true);
    assert.equal(r.project.runs[0].context.revision, r.context.revision);
  } finally {
    f.cleanup();
  }
});
test("3. two independent clients cannot claim one exclusive task", () => {
  const f = setup(),
    second = new MemoryStore(f.file);
  try {
    const revision = f.store.get("p").revision;
    cmd(f.store, agent("a"), "claim", { taskId: "task" }, revision);
    assert.throws(
      () => cmd(second, agent("b"), "claim", { taskId: "task" }, revision),
      /State changed/,
    );
    assert.throws(() => cmd(second, agent("b"), "claim", { taskId: "task" }), /not available/);
    assert.equal(second.get("p").tasks[1].owner, "a");
  } finally {
    second.close();
    f.cleanup();
  }
});
test("4. unfinished, blocked or cancelled dependency prevents dependent execution", () => {
  const f = setup();
  try {
    assert.throws(() => cmd(f.store, agent("a"), "claim", { taskId: "dependent" }), /dependency/);
    const run = started(f.store);
    cmd(
      f.store,
      agent("a"),
      "result",
      result(run.runId, { outcome: "blocked", reason: "Access missing" }),
    );
    assert.throws(() => cmd(f.store, agent("b"), "claim", { taskId: "dependent" }), /dependency/);
    cmd(f.store, owner, "cancel", { taskId: "task", reason: "Cancelled" });
    assert.throws(() => cmd(f.store, agent("b"), "claim", { taskId: "dependent" }), /dependency/);
  } finally {
    f.cleanup();
  }
});
test("5. reassignment saves handoff and invalidates former execution", () => {
  const f = setup();
  try {
    const run = started(f.store);
    cmd(f.store, agent("a"), "result", result(run.runId, { outcome: "progress" }));
    cmd(f.store, owner, "reassign", {
      taskId: "task",
      agentId: "b",
      summary: "Code changed; tests pending",
      remaining: "Run integration checks",
      nextAction: "Read latest test report",
    });
    const context = f.store.getAgentContext("p", "b", "task");
    assert.equal(context.handoff.from, "a");
    assert.equal(context.handoff.remaining, "Run integration checks");
    assert.throws(() => cmd(f.store, agent("a"), "result", result(run.runId)), /own/);
    const next = cmd(f.store, agent("b"), "start", { taskId: "task" });
    assert.equal(next.context.handoff.summary, "Code changed; tests pending");
  } finally {
    f.cleanup();
  }
});
test("6. done enters review; evidence, checks, and human approval gate acceptance", () => {
  const f = setup();
  try {
    const run = started(f.store);
    cmd(
      f.store,
      agent("a"),
      "result",
      result(run.runId, { checks: [{ name: "unit check", result: "failed" }] }),
    );
    assert.equal(f.store.get("p").tasks[1].status, "in_review");
    assert.throws(
      () => cmd(f.store, owner, "accept", { taskId: "task", approved: true, note: "Reviewed" }),
      /checks/,
    );
    cmd(f.store, owner, "record_review_evidence", {
      taskId: "task",
      summary: "Reran check successfully",
      checks: [{ name: "unit check", result: "passed" }],
      artifacts: [{ label: "Actual rerun", ref: "test:rerun" }],
    });
    assert.throws(
      () => cmd(f.store, owner, "accept", { taskId: "task", note: "Reviewed" }),
      /approval/,
    );
    assert.throws(
      () =>
        cmd(f.store, agent("a"), "accept", {
          taskId: "task",
          approved: true,
          note: "Self-approved",
        }),
      /Coordinator/,
    );
    cmd(f.store, owner, "accept", {
      taskId: "task",
      approved: true,
      note: "I checked the rerun evidence",
    });
    const t = f.store.get("p").tasks[1];
    assert.equal(t.status, "completed");
    assert.equal(t.results[0].checks[0].result, "failed");
    assert.equal(t.results.length, 2);
  } finally {
    f.cleanup();
  }
});
test("7. shared state and supplied context survive store close/reopen", () => {
  const f = setup();
  try {
    started(f.store);
    const before = f.store.get("p");
    const another = new MemoryStore(f.file);
    assert.deepEqual(another.get("p"), before);
    another.close();
    f.store.close();
    const reopened = new MemoryStore(f.file);
    assert.deepEqual(reopened.get("p"), before);
    reopened.close();
  } finally {
    f.cleanup();
  }
});
test("8. duplicate updates are idempotent; stale writes and reused keys fail", () => {
  const f = setup();
  try {
    const rev = f.store.get("p").revision,
      key = randomUUID();
    const first = cmd(f.store, agent("a"), "claim", { taskId: "task" }, rev, key);
    assert.deepEqual(cmd(f.store, agent("a"), "claim", { taskId: "task" }, rev, key), first);
    assert.equal(f.store.get("p").events.filter((e) => e.type === "assigned").length, 1);
    assert.throws(
      () => cmd(f.store, agent("a"), "claim", { taskId: "dependent" }, rev, key),
      /reused/,
    );
    assert.throws(
      () => cmd(f.store, owner, "add_note", { kind: "notes", text: "Stale" }, rev),
      /State changed/,
    );
  } finally {
    f.cleanup();
  }
});
test("instructions changed mid-run require a new supplied context", () => {
  const f = setup();
  try {
    const run = started(f.store);
    cmd(f.store, owner, "add_note", { kind: "constraints", text: "New constraint" });
    assert.throws(
      () => cmd(f.store, agent("a"), "result", result(run.runId)),
      /instructions changed/,
    );
    cmd(f.store, agent("a"), "refresh_context", { taskId: "task", runId: run.runId });
    cmd(f.store, agent("a"), "result", result(run.runId));
    assert.equal(f.store.get("p").runs[0].contextHistory.length, 2);
  } finally {
    f.cleanup();
  }
});
test("9. completion is derived from accepted tasks and excludes cancellation", () => {
  assert.equal(projectSummary({ tasks: [] }).progress, null);
  assert.equal(projectSummary({ tasks: [{ status: "cancelled" }] }).progress, null);
  assert.equal(
    projectSummary({
      tasks: [{ status: "completed" }, { status: "in_review" }, { status: "cancelled" }],
    }).progress,
    50,
  );
});
test("10. observed Codex tasks cannot be executed by a synthetic adapter", () => {
  const f = setup();
  try {
    cmd(f.store, { id: "reconciler", role: "reconciler" }, "reconcile", {
      tasks: [{ id: "observed", title: "Reported done", reportedStatus: "completed", owner: "a" }],
    });
    const t = f.store.get("p").tasks.find((t) => t.id === "observed");
    assert.equal(t.status, "in_review");
    assert.equal(t.verification, "unverified");
    assert.throws(() => cmd(f.store, agent("a"), "claim", { taskId: "observed" }));
    assert.equal(f.store.getAgentContext("p", "a", "observed").actionable, false);
  } finally {
    f.cleanup();
  }
});
test("runtime credentials are scoped and tokens are not stored as plaintext", () => {
  const f = setup();
  try {
    const token = f.store.issueCredential("p", "a");
    assert.deepEqual(f.store.authenticate(token), agent("a"));
    assert.equal(f.store.authenticate("invalid"), null);
    assert.throws(
      () =>
        f.store.command(
          "p",
          { ...agent("a"), projectId: "wrong" },
          "claim",
          { taskId: "task" },
          { revision: f.store.get("p").revision, key: randomUUID() },
        ),
      /permission/,
    );
  } finally {
    f.cleanup();
  }
});
