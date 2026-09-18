import test from "node:test";
import assert from "node:assert/strict";
import { sceneTime } from "../lib/scene-time.ts";
test("Nairobi scene uses EAT at transitions and midnight independently of device timezone", () => {
  for (const [utc, time, phase] of [
    ["02:59", "05:59", "night"],
    ["03:00", "06:00", "dawn"],
    ["04:00", "07:00", "day"],
    ["15:00", "18:00", "sunset"],
    ["16:00", "19:00", "night"],
    ["21:00", "00:00", "night"],
  ]) {
    const scene = sceneTime(new Date(`2026-09-09T${utc}:00Z`));
    assert.equal(scene.time, time);
    assert.equal(scene.phase, phase);
  }
});
