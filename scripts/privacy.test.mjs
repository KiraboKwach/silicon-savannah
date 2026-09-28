import test from "node:test";
import assert from "node:assert/strict";
import { redactText, displayData, projectCatalog, forwardedRequest } from "./privacy.mjs";
test("display text masks credentials, personal paths and emails before truncation", () => {
  for (const text of [
    "ghp_" + "A".repeat(36),
    "github_pat_" + "B".repeat(30),
    "AKIA" + "C".repeat(16),
    "Bearer abcdef123456",
    "password=example-private-value",
    "api_key: 'private value'",
    "someone@example.test",
    "C:\\Users\\Example\\private.txt",
    "/home/example/private.txt",
    "https://example.test/?token=secret",
    "-----BEGIN PRIVATE KEY-----\nprivate\n-----END PRIVATE KEY-----",
  ]) {
    assert.notEqual(redactText(text), text);
    assert.ok(redactText(text).startsWith("["));
  }
  assert.equal(redactText("src/main.ts changed"), "src/main.ts changed");
  assert.equal(redactText("ghp_" + "A".repeat(36), 5), "[reda");
});
test("hidden detail is omitted without mutating store data or losing restore revision", () => {
  const memory = [
    { id: "secret", name: "Hidden", hidden: true, revision: 7, summary: "private" },
    { id: "public", name: "Shown", revision: 2 },
  ];
  const input = {
    projects: memory,
    exchange: [
      { sourceProjectId: "secret", text: "private" },
      {
        sourceProjectId: "public",
        recipients: ["secret", "public"],
        replies: [{ projectId: "secret", text: "private" }],
      },
    ],
  };
  const output = displayData(input, new Set(["secret"]));
  assert.equal(JSON.stringify(output).includes("private"), false);
  assert.deepEqual(output.exchange[0].recipients, ["public"]);
  assert.equal(input.projects[0].summary, "private");
  assert.deepEqual(projectCatalog(memory, memory)[0], {
    id: "secret",
    name: "Hidden",
    hidden: true,
    revision: 7,
  });
});
test("navigation keeps clean public destinations and rejects embedded credentials", () => {
  const output = displayData({
    codexUrl: "codex://threads/example-id",
    publicLinks: [
      { url: "https://example.test/app?token=private#private" },
      { url: "https://user:password@example.test" },
      { url: "javascript:alert(1)" },
    ],
  });
  assert.equal(output.codexUrl, "codex://threads/example-id");
  assert.deepEqual(
    output.publicLinks.map((p) => p.url),
    ["https://example.test/app", "", ""],
  );
});
test("forwarded and cross-site requests are rejected; ordinary local calls remain supported", () => {
  for (const h of [
    { forwarded: "for=1.2.3.4" },
    { "x-forwarded-host": "example.test" },
    { via: "proxy" },
    { "sec-fetch-site": "cross-site" },
  ])
    assert.equal(forwardedRequest(h), true);
  assert.equal(
    forwardedRequest({ host: "127.0.0.1:4320", origin: "http://127.0.0.1:5174" }),
    false,
  );
  assert.equal(forwardedRequest({ authorization: "Bearer runtime" }), false);
});

test("structured secret fields are masked without touching protocol IDs", () => {
  assert.deepEqual(
    displayData({ id: "p", nested: { api_key: "custom-value", password: "short" } }),
    { id: "p", nested: { api_key: "[redacted]", password: "[redacted]" } },
  );
});
