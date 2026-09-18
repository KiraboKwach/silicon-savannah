import test from "node:test";
import assert from "node:assert/strict";
import { workSignal } from "./work-signal.mjs";
const signal = (item, status = "working") => workSignal({}, [{ item }], status);
test("signals follow structured events without inventing generic tool activity", () => {
  assert.equal(
    signal({ type: "fileChange", status: "inProgress", changes: [{ path: "src/app.tsx" }] }).kind,
    "editing",
  );
  assert.deepEqual(
    signal({ type: "fileChange", status: "completed", changes: [{ path: "src/app.tsx" }] }).files,
    ["src/app.tsx"],
  );
  assert.equal(
    signal({ type: "commandExecution", status: "inProgress", command: "npm test" }).kind,
    "testing",
  );
  assert.equal(
    signal({ type: "commandExecution", status: "inProgress", command: "echo npm test" }).kind,
    "command",
  );
  assert.equal(
    signal({ type: "commandExecution", status: "inProgress", commandActions: [{ type: "read" }] })
      .kind,
    "reading",
  );
  assert.equal(signal({ type: "mcpToolCall", status: "inProgress", tool: "exec" }).kind, "working");
});
test("pending questions are explicit and terminal turns override stale tool status", () => {
  const item = {
    type: "mcpToolCall",
    status: "inProgress",
    tool: "request_user_input",
    questions: [{ question: "Which layout?" }],
  };
  assert.equal(signal(item).kind, "attention");
  assert.equal(signal(item).question, "Which layout?");
  assert.equal(signal(item, "idle").kind, "idle");
  assert.equal(signal(item, "unknown").kind, "unknown");
  assert.equal(signal({ ...item, status: "completed" }).kind, "working");
});
test("test results use exit codes and never leak command output", () => {
  const item = {
    type: "commandExecution",
    status: "completed",
    command: "npm test",
    exitCode: 1,
    aggregatedOutput: "secret",
  };
  assert.equal(signal(item).testResult, "Test command exited with code 1");
  assert.equal(signal({ ...item, exitCode: 0 }).testResult, "Test command exited successfully");
  assert.equal(
    signal({ ...item, exitCode: undefined }).testResult,
    "Test command finished; outcome unavailable",
  );
  assert.ok(!JSON.stringify(signal(item)).includes("secret"));
});
