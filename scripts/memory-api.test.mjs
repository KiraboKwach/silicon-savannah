import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { randomUUID } from "node:crypto";
import { MemoryStore } from "./memory-store.mjs";
import { DemoExecutor } from "./demo-executor.mjs";
import { memoryApi } from "./memory-api.mjs";
test("HTTP runtime context, roles, revisions and result flow use one persistent store", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "savannah-api-")),
    store = new MemoryStore(path.join(dir, "memory.sqlite"));
  store.seed({
    id: "p",
    name: "P",
    mode: "live",
    objective: "Test",
    agents: [{ id: "a", name: "A", mode: "runtime" }],
    tasks: [{ id: "t", title: "T", acceptance: ["check"] }],
  });
  const handler = memoryApi(store, new DemoExecutor(store), () => ({ projects: [] }));
  const server = http.createServer((req, res) => {
    void handler(req, res, new URL(req.url, "http://localhost"));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  async function post(route, body, token, origin) {
    const response = await fetch(url + route, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(origin ? { Origin: url } : {}),
      },
      body: JSON.stringify(body),
    });
    return { status: response.status, value: await response.json() };
  }
  try {
    assert.equal((await post("/api/memory/command", {})).status, 403);
    const credential = await post(
      "/api/memory/token",
      { projectId: "p", agentId: "a" },
      null,
      true,
    );
    assert.equal(credential.status, 200);
    const token = credential.value.token;
    store.seed({ id: "hidden", name: "Private", mode: "live", agents: [], tasks: [] });
    store.command(
      "hidden",
      { id: "local-user", role: "coordinator" },
      "set_visibility",
      { hidden: true },
      { revision: store.get("hidden").revision, key: randomUUID() },
    );
    const browser = await (await fetch(url + "/api/memory")).json();
    assert.equal(
      browser.projects.some((p) => p.id === "hidden"),
      false,
    );
    assert.equal(store.get("hidden").hidden, true);
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.equal(
      (await fetch(url + "/api/memory", { headers: { Authorization: "Bearer " } })).status,
      403,
    );
    const demoOnly = await (await fetch(url + "/api/memory?mode=demo")).json();
    assert.equal(demoOnly.observations, null);
    assert.equal(demoOnly.projects.length, 0);
    const restore = await post(
      "/api/memory/command",
      {
        projectId: "hidden",
        operation: "set_visibility",
        input: { hidden: false },
        revision: store.get("hidden").revision,
        key: randomUUID(),
      },
      null,
      true,
    );
    assert.equal(restore.status, 200);
    assert.equal(store.get("hidden").hidden, false);

    const update = async (op, input, key = randomUUID(), revision = store.get("p").revision) =>
      post("/api/memory/command", { projectId: "p", operation: op, input, key, revision }, token);
    assert.equal((await update("claim", { taskId: "t" })).status, 200);
    const start = await update("start", { taskId: "t" });
    assert.equal(start.value.context.task.id, "t");
    assert.equal(start.value.context.task.status, "assigned");
    assert.equal(store.get("p").runs[0].contextSuppliedAt.length > 0, true);
    const finish = await update("result", {
      taskId: "t",
      runId: start.value.runId,
      outcome: "done",
      attempted: "A real fixture test",
      changed: "Result saved",
      remaining: "Review",
      nextAction: "Approval",
      checks: [{ name: "check", result: "passed" }],
      artifacts: [{ label: "Evidence", ref: "fixture:ok" }],
    });
    assert.equal(finish.value.project.tasks[0].status, "in_review");
    assert.equal(
      (await update("accept", { taskId: "t", approved: true, note: "Self approval" })).status,
      403,
    );
    assert.equal(store.get("p").summary.progress, 0);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    store.close();
    for (const n of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, n));
    fs.rmdirSync(dir);
  }
});
