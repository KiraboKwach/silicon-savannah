import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { MemoryStore, projectSummary } from "./memory-store.mjs";

test("100 percent requires every included task to be accepted", () => {
  const tasks = Array.from({ length: 200 }, (_, i) => ({
    status: i === 199 ? "in_review" : "completed",
  }));
  assert.equal(projectSummary({ tasks }).progress, 99);
  tasks[199].status = "completed";
  assert.equal(projectSummary({ tasks }).progress, 100);
  assert.equal(projectSummary({ tasks: [{ status: "cancelled" }] }).progress, null);
});

test("ideas persist, stay scoped, and enter actual runtime context without changing progress", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "savannah-ideas-")),
    file = path.join(dir, "memory.sqlite");
  let store = new MemoryStore(file);
  const coordinator = { id: "local-user", role: "coordinator" },
    agent = { id: "builder-b", role: "agent", projectId: "b" };
  const command = (
    id,
    actor,
    operation,
    input,
    key = randomUUID(),
    revision = store.get(id).revision,
  ) => store.command(id, actor, operation, input, { key, revision });
  try {
    for (const id of ["a", "b", "c"])
      store.seed({
        id,
        name: id,
        mode: "live",
        objective: "Build",
        agents: [{ id: "builder-" + id, mode: "runtime" }],
        tasks: [{ id: "task-" + id, title: "Work", acceptance: ["test"] }],
      });
    store.seed({ id: "demo", name: "Demo", mode: "demo" });
    const input = {
        title: "A useful lesson",
        text: "Keep visual state separate from completion.",
        recipients: ["b"],
      },
      key = randomUUID(),
      revision = store.get("a").revision;
    const published = command("a", coordinator, "share_idea", input, key, revision);
    assert.equal(
      command("a", coordinator, "share_idea", input, key, revision).ideaId,
      published.ideaId,
    );
    assert.equal(store.ideas("live").length, 1);
    assert.equal(store.ideas("live", "c").length, 0);
    assert.equal(store.ideas("live", "b")[0].verification, "proposed");
    assert.throws(
      () => command("a", coordinator, "share_idea", { ...input, recipients: ["demo"] }),
      /same mode/,
    );
    assert.throws(() => command("a", agent, "share_idea", input), /permission/);
    assert.throws(
      () =>
        command("c", coordinator, "reply_idea", {
          ideaId: published.ideaId,
          text: "Not a participant",
        }),
      /not found/,
    );
    const preview = store.getAgentContext("b", agent.id, "task-b");
    assert.equal(preview.crossProjectIdeas[0].id, published.ideaId);
    assert.equal(
      store.ideas("live", "b")[0].suppliedTo.length,
      0,
      "preview must not claim receipt",
    );
    command("b", agent, "claim", { taskId: "task-b" });
    const started = command("b", agent, "start", { taskId: "task-b" });
    assert.equal(started.context.crossProjectIdeas[0].id, published.ideaId);
    assert.equal(store.ideas("live", "b")[0].suppliedTo.length, 1);
    command("b", agent, "reply_idea", {
      ideaId: published.ideaId,
      text: "Useful; I will validate applicability.",
    });
    assert.equal(store.ideas("live", "a")[0].replies[0].author, "builder-b");
    assert.equal(store.get("b").summary.progress, 0);
    store.close();
    store = new MemoryStore(file);
    assert.equal(store.ideas("live", "b")[0].replies.length, 1);
  } finally {
    store.close();
    for (const file of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, file));
    fs.rmdirSync(dir);
  }
});
