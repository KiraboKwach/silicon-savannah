import test from "node:test";
import assert from "node:assert/strict";
import { initialWorld } from "../lib/simulation.ts";
import {
  inspectionChoice,
  planRoute,
  segmentClear,
  hubPosition,
} from "../lib/visual-navigation.ts";
import { constructionState } from "../lib/construction-visuals.ts";
test("one associated available inspector; busy/offline excluded; business state unchanged", () => {
  const w = initialWorld();
  w.agents[0].status = "working";
  w.agents[1].currentProjectId = "p0";
  w.agents[2].status = "offline";
  const before = JSON.stringify(w);
  const chosen = inspectionChoice(
    w.agents,
    w.projects[0],
    w.projects,
    new Map(w.agents.map((a, i) => [a.id, hubPosition(a.id, i)])),
  );
  assert.equal(chosen.agentId, "a1");
  assert.equal(JSON.stringify(w), before);
  assert.equal(
    inspectionChoice(
      w.agents.map((a) => ({ ...a, status: "working" })),
      w.projects[0],
      w.projects,
      new Map(),
    ),
    null,
  );
});
test("routes detour around footprints and reject occupied destinations", () => {
  const obstacles = [{ left: 40, right: 60, top: 20, bottom: 80 }];
  const route = planRoute({ x: 10, y: 50 }, { x: 90, y: 50 }, obstacles);
  assert.ok(route.length > 80);
  let p = { x: 10, y: 50 };
  for (const q of route.points) {
    assert.ok(segmentClear(p, q, obstacles));
    p = q;
  }
  assert.equal(planRoute({ x: 10, y: 50 }, { x: 50, y: 50 }, obstacles), null);
});
test("only evidence-accepted completion reveals structure, including reload", () => {
  const p = initialWorld().projects[0];
  const t = { id: "t", status: "completed", verification: "unverified", acceptanceRecord: null };
  assert.equal(constructionState(p, { tasks: [t] }).complete, false);
  const memory = {
    tasks: [{ ...t, verification: "accepted", acceptanceRecord: { at: "historical" } }],
  };
  assert.equal(constructionState(p, memory).complete, true);
  assert.equal(constructionState(p, JSON.parse(JSON.stringify(memory))).progress, 100);
  assert.equal(constructionState(p).known, false);
});

test("never borrows another project agent when owner is unavailable", () => {
  const w = initialWorld();
  w.agents.forEach((a, i) => {
    a.currentProjectId = w.projects[i % w.projects.length].id;
    a.status = "idle";
  });
  const owner = w.agents[0];
  const agents = w.agents.slice(0, w.projects.length);
  for (const status of ["working", "offline", "unknown"]) {
    owner.status = status;
    assert.equal(inspectionChoice(agents, w.projects[0], w.projects, new Map()), null);
  }
  owner.status = "idle";
  assert.equal(inspectionChoice(agents, w.projects[0], w.projects, new Map()).agentId, owner.id);
  assert.equal(
    inspectionChoice(agents, w.projects[1], w.projects, new Map()).agentId,
    agents[1].id,
  );
  owner.currentProjectId = "unassigned";
  assert.equal(inspectionChoice(agents, w.projects[0], w.projects, new Map()), null);
});

test("blocked and waiting owners can observe without changing operational state", () => {
  const w = initialWorld();
  const owner = { ...w.agents[0], currentProjectId: w.projects[0].id };
  for (const status of ["blocked", "waiting"]) {
    owner.status = status;
    const before = JSON.stringify(owner);
    assert.equal(inspectionChoice([owner], w.projects[0], w.projects, new Map()).agentId, owner.id);
    assert.equal(JSON.stringify(owner), before);
  }
});
