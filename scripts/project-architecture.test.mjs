import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const server = await createServer({
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
try {
  const { default: Architecture } = await server.ssrLoadModule(
    "/components/savannah/ProjectArchitecture.tsx",
  );
  const { initialWorld } = await server.ssrLoadModule("/lib/simulation.ts");
  test("every campus retains full architecture without accepted completion", () => {
    for (const [variant, project] of initialWorld().projects.entries()) {
      for (const memory of [
        undefined,
        { tasks: [{ id: "pending", status: "pending", verification: "unverified" }] },
      ]) {
        const html = renderToStaticMarkup(
          React.createElement(
            "svg",
            null,
            React.createElement(Architecture, {
              project,
              variant,
              active: false,
              memory,
              selected: true,
            }),
          ),
        );
        assert.ok(html.includes("campus-building-body"));
        assert.ok(html.includes("component-inspection"));
        assert.ok(!html.includes("clip-path"));
        assert.ok(!html.includes("site-crane"));
        assert.ok(html.includes(memory ? "0% accepted components" : "Completion unknown"));
        assert.ok(!html.includes('data-construction="complete"'));
      }
    }
  });
} finally {
  await server.close();
}
