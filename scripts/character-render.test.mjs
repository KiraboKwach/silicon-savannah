import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const server = await createServer({
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { default: Character } = await server.ssrLoadModule(
    "/components/savannah/BuilderCharacter.tsx",
  );
  const { characterRoster } = await server.ssrLoadModule("/lib/simulation.ts");
  const roster = characterRoster();
  const original = JSON.stringify(roster);
  test("actual identities and cultural garment mapping survive every supported status", () => {
    const expected = [
      "tech",
      "shuka",
      "runner",
      "creative",
      "apron",
      "farmer",
      "ranger",
      "boda",
      "music",
      "coast",
    ];
    for (const [i, agent] of roster.entries())
      for (const status of [
        "idle",
        "assigned",
        "moving",
        "working",
        "completed",
        "blocked",
        "waiting",
        "unknown",
        "offline",
      ]) {
        const html = renderToStaticMarkup(
          React.createElement(Character, {
            agent: { ...agent, status },
            signal: "editing",
            active: false,
          }),
        );
        assert.ok(html.includes(`data-agent-id="a${i}"`));
        assert.ok(html.includes(`data-garment="${expected[i]}"`));
        assert.ok(!html.includes("NaN"));
        assert.ok(!html.includes("undefined"));
        assert.ok(!html.includes("Zzz"));
        assert.ok(
          html.includes(
            `data-pose="${status === "working" ? "editing" : ["blocked", "waiting"].includes(status) ? "waiting" : ["unknown", "offline"].includes(status) ? "unknown" : "idle"}"`,
          ),
        );
      }
    assert.equal(JSON.stringify(roster), original);
  });
  test("multiple avatars have unique paint definitions and intact reference targets", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        "div",
        null,
        ...roster.map((agent) =>
          React.createElement(Character, { key: agent.id, agent, active: false }),
        ),
      ),
    );
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((x) => x[1]);
    assert.equal(ids.length, new Set(ids).size);
    for (const [, id] of html.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(id), id);
  });
  test("disconnected avatars cannot run decorative or operational motion", () => {
    for (const status of ["offline", "unknown"]) {
      const html = renderToStaticMarkup(
        React.createElement(Character, {
          agent: { ...roster[0], status },
          active: true,
          signal: "testing",
        }),
      );
      assert.ok(html.includes('data-motion="still"'));
      assert.ok(html.includes('data-pose="unknown"'));
    }
  });
  const draw = () =>
    renderToStaticMarkup(
      React.createElement(
        "div",
        null,
        ...roster.map((agent) =>
          React.createElement(Character, { key: agent.id, agent, active: false }),
        ),
      ),
    );
  for (let i = 0; i < 5; i++) draw();
  let start = performance.now();
  for (let i = 0; i < 30; i++) draw();
  const html = draw();
  console.log(
    JSON.stringify(
      {
        tenAvatarSsrMeanMs: (performance.now() - start) / 31,
        svgElements: (html.match(/<\w/g) || []).length,
        markupBytes: Buffer.byteLength(html),
      },
      null,
      2,
    ),
  );
} finally {
  await server.close();
}
