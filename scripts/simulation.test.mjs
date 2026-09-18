import test from "node:test";
import assert from "node:assert/strict";
import { initialWorld } from "../lib/simulation.ts";
import { demoWorld } from "../lib/memory.ts";
const fixture = () => {
  const w = initialWorld();
  return w.projects.map((p) => ({
    ...p,
    mode: "demo",
    revision: 1,
    updatedAt: new Date().toISOString(),
    summary: { total: 4, completed: 0, progress: 0, review: 0, active: 1, blocked: 0 },
    tasks: p.tasks.map((t, i) => ({
      ...t,
      status: i === 0 ? "in_progress" : "not_started",
      owner: i === 0 ? "demo:a0" : null,
      results: [],
      handoffs: [],
    })),
    runs: [
      {
        id: "r",
        taskId: p.tasks[0].id,
        status: "active",
        agentId: "demo:a0",
        startedAt: new Date().toISOString(),
      },
    ],
    events: [],
  }));
};
test("map derivation and animation frames never mutate authoritative tasks", () => {
  const data = fixture(),
    before = structuredClone(data);
  for (let i = 0; i < 100; i++) demoWorld(data, true, true);
  assert.deepEqual(data, before);
  assert.equal(data[0].tasks[0].status, "in_progress");
  assert.equal(demoWorld(data, true, true).projects[0].progress, 0);
});
test("offline or stale execution cannot keep the working animation running", () => {
  const data = fixture();
  assert.equal(demoWorld(data, true, true).agents[0].status, "working");
  assert.equal(demoWorld(data, false, true).agents[0].status, "offline");
  data[0].runs[0].startedAt = "2020-01-01";
  assert.equal(demoWorld(data, true, true).agents[0].status, "waiting");
  assert.equal(demoWorld(fixture(), true, false).agents[0].status, "waiting");
});
test("original mock baseline remains five projects, ten builders, twenty tasks", () => {
  const w = initialWorld();
  assert.equal(w.projects.length, 5);
  assert.equal(w.agents.length, 10);
  assert.equal(w.projects.flatMap((p) => p.tasks).length, 20);
});
