import test from "node:test";
import assert from "node:assert/strict";
import { suggestionSpeaker, socialChatLine } from "../lib/social-chat.ts";
const project = { name: "Market Garden", status: "idle", plan: [] };
test("one rotating speaker with quiet gaps and no empty-roster speaker", () => {
  for (let s = 0; s < 300; s++) {
    const id = suggestionSpeaker(s, ["a0", "a1"]);
    assert.equal(Boolean(id), s % 60 >= 12 && s % 60 < 22);
    assert.equal(suggestionSpeaker(s, []), null);
  }
  assert.equal(suggestionSpeaker(12, ["a0", "a1"]), "a0");
  assert.equal(suggestionSpeaker(72, ["a0", "a1"]), "a1");
});
test("suggestions use own recorded blockers and next actions without changing tasks", () => {
  const memory = {
    tasks: [
      {
        status: "blocked",
        title: "Login",
        blocker: "Missing callback",
        nextAction: "Check redirect configuration",
      },
    ],
  };
  const before = JSON.stringify(memory);
  assert.match(socialChatLine(project, memory), /Missing callback/);
  assert.match(socialChatLine(project, memory, undefined, 1), /Check redirect configuration/);
  assert.equal(JSON.stringify(memory), before);
});
test("completed work is not proposed again and missing context yields a question", () => {
  const text = socialChatLine(project, {
    tasks: [
      { title: "Old completed task", status: "completed", nextAction: "Repeat obsolete action" },
    ],
  });
  assert.ok(!text.includes("obsolete"));
  assert.match(text, /could we review/i);
  assert.match(
    socialChatLine({ ...project, plan: [{ title: "Fix navigation", status: "not started" }] }),
    /Fix navigation/,
  );
});
