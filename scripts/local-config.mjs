import fs from "node:fs";
import path from "node:path";
export function loadLocalConfig(base, env = process.env) {
  const file = path.join(base, "projects.local.json");
  const projects = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
  if (
    !Array.isArray(projects) ||
    projects.some((p) => typeof p.id !== "string" || typeof p.name !== "string")
  )
    throw Error("projects.local.json must be an array of projects with id and name.");
  return { projects, live: env.SAVANNAH_LIVE === "1", discover: env.SAVANNAH_DISCOVER === "1" };
}
