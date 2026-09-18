import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { DatabaseSync } from "node:sqlite";
import { discoverProjects } from "./project-discovery.mjs";
import { MemoryStore } from "./memory-store.mjs";
import { reconcileObservations } from "./memory-seed.mjs";
test("discovery finds new root tasks, preserves configured hubs, and excludes helpers and archives", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "savannah-discovery-"));
  const db = new DatabaseSync(path.join(dir, "state_5.sqlite"));
  try {
    db.exec(
      "CREATE TABLE threads(id TEXT,title TEXT,source TEXT,agent_path TEXT,archived INTEGER,has_user_event INTEGER,created_at INTEGER)",
    );
    const add = (id, source = "vscode", archived = 0, user = 1) =>
      db
        .prepare("INSERT INTO threads VALUES(?,?,?,NULL,?,?,1)")
        .run(id, id, source, archived, user);
    add("known");
    add("old");
    add("helper", '{"subagent":{}}');
    add("archived", "vscode", 1);
    add("empty", "vscode", 0, 0);
    const config = [{ id: "known", name: "Custom title", taskTitle: "Original" }];
    assert.deepEqual(
      discoverProjects(config, dir).map((p) => p.id),
      ["known", "old"],
    );
    assert.equal(discoverProjects(config, dir)[0].name, "Custom title");
    add("new");
    assert.ok(discoverProjects(config, dir).some((p) => p.id === "new"));
    const store = new MemoryStore(path.join(dir, "memory.sqlite"));
    try {
      reconcileObservations(store, {
        projects: [
          {
            id: "new",
            name: "New project",
            taskTitle: "New task",
            plan: [],
            turnStatus: "unknown",
          },
        ],
      });
      assert.equal(store.get("new").agents[0].mode, "observer");
      store.command(
        "new",
        { id: "local-user", role: "coordinator" },
        "set_visibility",
        { hidden: true },
        { revision: 1, key: "hide-project-1" },
      );
      reconcileObservations(store, {
        projects: [
          {
            id: "new",
            name: "New project",
            taskTitle: "New task",
            plan: [],
            turnStatus: "unknown",
          },
        ],
      });
      assert.equal(store.get("new").hidden, true);
    } finally {
      store.close();
    }
  } finally {
    db.close();
    for (const file of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, file));
    fs.rmdirSync(dir);
  }
});
