import { test } from "node:test";
import assert from "node:assert/strict";
import { capabilityFor } from "./initiative-capabilities.mjs";
import { InitiativeRunner } from "./initiative-runner.mjs";
test("only explicit supported capabilities are accepted", () => {
  for (const action of ["review", "blockers", "ideas", "tests"])
    assert.ok(capabilityFor(action).instruction);
  for (const invalid of ["constructor", "__proto__", "deploy", null, {}])
    assert.throws(() => capabilityFor(invalid), { status: 400 });
  assert.equal(capabilityFor().label, "Find next task");
});
test("API passes selected capability to runner and preserves origin requirement", async () => {
  const runner = Object.create(InitiativeRunner.prototype);
  let called;
  runner.start = (id, action) => {
    called = { id, action };
    return { status: "running" };
  };
  const response = {
    writeHead(status) {
      this.status = status;
    },
    end(body) {
      this.body = body;
    },
  };
  const req = {
    method: "POST",
    headers: { origin: "http://127.0.0.1:4318", "content-type": "application/json" },
    async *[Symbol.asyncIterator]() {
      yield JSON.stringify({ projectId: "project-a", action: "tests" });
    },
  };
  await runner.handle(req, response, new URL("http://localhost/api/initiative"));
  assert.equal(response.status, 200);
  assert.deepEqual(called, { id: "project-a", action: "tests" });
  called = null;
  await runner.handle(
    { ...req, headers: {} },
    response,
    new URL("http://localhost/api/initiative"),
  );
  assert.equal(response.status, 403);
  assert.equal(called, null);
});
