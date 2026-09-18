import test from "node:test";
import assert from "node:assert/strict";
import { observedPose } from "../lib/character-behaviour.ts";
test("operational gestures require an active working runtime", () => {
  for (const status of [
    "idle",
    "assigned",
    "moving",
    "completed",
    "blocked",
    "waiting",
    "unknown",
    "offline",
  ])
    for (const kind of ["reading", "editing", "testing", "command"])
      assert.ok(
        !["reading", "editing", "testing", "command", "working"].includes(
          observedPose(status, kind),
        ),
      );
});
test("specific gestures reflect the observed signal, not a guessed task", () => {
  for (const kind of ["reading", "editing", "testing", "command"])
    assert.equal(observedPose("working", kind), kind);
  assert.equal(observedPose("working", "unrecognised"), "working");
  assert.equal(observedPose("working", "attention"), "waiting");
  assert.equal(observedPose("offline", "editing"), "unknown");
});
