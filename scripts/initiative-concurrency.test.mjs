import test from "node:test";
import assert from "node:assert/strict";
import { InitiativeRunner } from "./initiative-runner.mjs";
test("parallel reviews only block duplicate project IDs", () => {
  const runner = Object.create(InitiativeRunner.prototype);
  runner.children = new Map([["project-a", { pid: 123 }]]);
  let reached = false;
  runner.store = {
    get(id) {
      reached = id;
      throw Error("Reached independent project validation");
    },
  };
  assert.throws(() => runner.start("project-a", "review"), /already has a review/);
  assert.equal(reached, false);
  assert.throws(() => runner.start("project-b", "review"), /independent project validation/);
  assert.equal(reached, "project-b");
  assert.equal(runner.children.has("project-a"), true);
});
