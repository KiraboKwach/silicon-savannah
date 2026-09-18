import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadLocalConfig } from "./local-config.mjs";

test("a fresh checkout does not enable history discovery or local work", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "savannah-config-"));
  try {
    assert.deepEqual(loadLocalConfig(dir, {}), { projects: [], live: false, discover: false });
  } finally {
    fs.rmdirSync(dir);
  }
});
test("local projects and discovery require explicit settings", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "savannah-config-"));
  try {
    const projects = [{ id: "test-task", name: "My sample" }];
    fs.writeFileSync(path.join(dir, "projects.local.json"), JSON.stringify(projects));
    assert.deepEqual(loadLocalConfig(dir, {}), { projects, live: false, discover: false });
    assert.deepEqual(loadLocalConfig(dir, { SAVANNAH_LIVE: "1", SAVANNAH_DISCOVER: "1" }), {
      projects,
      live: true,
      discover: true,
    });
    fs.writeFileSync(path.join(dir, "projects.local.json"), "{}");
    assert.throws(() => loadLocalConfig(dir, {}), /array/);
  } finally {
    fs.unlinkSync(path.join(dir, "projects.local.json"));
    fs.rmdirSync(dir);
  }
});
