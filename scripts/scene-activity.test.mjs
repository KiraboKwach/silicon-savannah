import test from "node:test";
import assert from "node:assert/strict";
import { acceptedTaskIds, newlyAccepted, activityCaption } from "../lib/scene-activity.ts";
test("celebration requires newly accepted evidence, never page load or an unverified finish", () => {
  const task = { id: "t", status: "completed", verification: "unverified", acceptanceRecord: null };
  assert.equal(acceptedTaskIds({ tasks: [task] }).size, 0);
  const ids = acceptedTaskIds({
    tasks: [{ ...task, verification: "accepted", acceptanceRecord: { at: "now" } }],
  });
  assert.equal(newlyAccepted(undefined, ids), false);
  assert.equal(newlyAccepted(ids, ids), false);
  assert.equal(newlyAccepted(new Set(), ids), true);
});
test("current work and disconnection take precedence over old review reports", () => {
  const project = {
    status: "working",
    lastAt: 5000,
    stage: "Reading source",
    initiative: { status: "completed", report: "old", finishedAt: "1970-01-01T00:00:01Z" },
  };
  assert.equal(activityCaption(project, true), "Reading source");
  assert.match(activityCaption(project, false), /Disconnected/);
  assert.match(activityCaption({ ...project, stale: true }, true), /unknown/);
  assert.match(activityCaption({ ...project, status: "blocked" }, true), /Needs your input/);
});
