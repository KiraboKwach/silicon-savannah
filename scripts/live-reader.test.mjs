import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTurn, readLegacy, sessionActivity } from "./live-reader.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
test("idle clock uses completion time and never labels stale activity idle", () => {
  const now = Date.now();
  assert.equal(
    normalizeTurn({ status: "completed", completed_at: (now - 60000) / 1000 }, [], now).idleSince,
    now - 60000,
  );
  assert.equal(normalizeTurn({ status: "inProgress", started_at: 1 }, [], now).idleSince, null);
});
test("recent session statistics exclude old sessions and unfinished gaps", () => {
  const now = 40 * 86400000;
  const result = sessionActivity(
    [
      { started_at: 1, completed_at: 2 },
      { started_at: now / 1000 - 300, completed_at: now / 1000 - 240 },
      { started_at: now / 1000 - 120, completed_at: null },
      { started_at: now / 1000 - 60, completed_at: null },
    ],
    now,
  );
  assert.deepEqual(result, { sessions: 3, averageIdleMs: 120000 });
  assert.deepEqual(sessionActivity([], now), { sessions: 0, averageIdleMs: null });
});
test("live turn is working and unknown project progress is never invented", () => {
  const now = Date.now();
  const p = normalizeTurn(
    { status: "inProgress", started_at: now / 1000 },
    [
      {
        time: now,
        item: {
          type: "commandExecution",
          id: "c",
          status: "inProgress",
          command: "private command",
          aggregatedOutput: "secret",
        },
      },
    ],
    now,
  );
  assert.equal(p.status, "working");
  assert.equal(p.progress, null);
  assert.equal(p.stage, "Running a command");
  assert.ok(!JSON.stringify(p).includes("secret"));
  assert.ok(!JSON.stringify(p).includes("private command"));
});
test("completed turn becomes idle; stale active state becomes unknown", () => {
  assert.equal(
    normalizeTurn({ status: "completed", completed_at: Date.now() / 1000 }, []).status,
    "idle",
  );
  assert.equal(normalizeTurn({ status: "inProgress", started_at: 1 }, []).status, "unknown");
});
test("plan completion reflects only explicit reported steps", () => {
  const p = normalizeTurn({ status: "inProgress", started_at: Date.now() / 1000 }, [
    {
      time: Date.now(),
      item: {
        type: "plan",
        plan: [
          { step: "Build", status: "completed" },
          { step: "Test", status: "in_progress" },
        ],
      },
    },
  ]);
  assert.equal(p.progress, 50);
  assert.equal(p.plan[1].status, "in progress");
});
test("legacy events detect lifecycle without copying tool arguments", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "savannah-test-"));
  const file = path.join(dir, "events.jsonl");
  try {
    const event = (type, payload) =>
      JSON.stringify({ type, timestamp: new Date().toISOString(), payload });
    fs.writeFileSync(
      file,
      [
        event("event_msg", { type: "task_started" }),
        event("response_item", {
          type: "custom_tool_call",
          call_id: "c",
          name: "exec",
          input: "secret",
        }),
        event("response_item", {
          type: "custom_tool_call_output",
          call_id: "c",
          output: "private",
        }),
        event("event_msg", { type: "task_complete" }),
      ].join("\n"),
    );
    const r = readLegacy(file);
    const p = normalizeTurn(r.turn, r.items);
    assert.equal(p.status, "idle");
    assert.equal(p.steps[0].status, "completed");
    assert.ok(!JSON.stringify(p).includes("secret"));
  } finally {
    fs.unlinkSync(file);
    fs.rmdirSync(dir);
  }
});
