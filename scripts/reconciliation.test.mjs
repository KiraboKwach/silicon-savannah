import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { MemoryStore } from "./memory-store.mjs";
import { reconcileObservations } from "./memory-seed.mjs";
test("planless existing turns reconcile idempotently and completed reports enter review", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "savannah-reconcile-"));
  const store = new MemoryStore(path.join(dir, "state.sqlite"));
  try {
    store.seed({
      id: "p",
      name: "Existing",
      tasks: [],
      agents: [{ id: "codex:p", mode: "observer" }],
    });
    const observed = {
      projects: [
        {
          id: "p",
          name: "Existing",
          taskTitle: "Original task title",
          plan: [],
          turnId: "turn1",
          turnStatus: "inProgress",
          summary: "Currently checking",
          lastAt: 100,
        },
      ],
    };
    reconcileObservations(store, observed);
    const first = store.get("p");
    assert.equal(first.tasks[0].owner, "codex:p");
    assert.equal(first.tasks[0].status, "in_progress");
    reconcileObservations(store, observed);
    assert.equal(store.get("p").revision, first.revision);
    observed.projects[0].turnStatus = "completed";
    observed.projects[0].summary = "Checks reported complete";
    reconcileObservations(store, observed);
    const next = store.get("p");
    assert.equal(next.tasks.length, 1);
    assert.equal(next.tasks[0].status, "in_review");
    assert.equal(next.summary.completed, 0);
    assert.equal(next.tasks[0].summary, "Checks reported complete");
    reconcileObservations(store, observed);
    assert.equal(store.get("p").revision, next.revision);
  } finally {
    store.close();
    for (const n of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, n));
    fs.rmdirSync(dir);
  }
});
