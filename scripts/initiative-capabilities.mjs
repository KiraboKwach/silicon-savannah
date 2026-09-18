export const capabilities = {
  review: {
    label: "Find next task",
    instruction:
      "Identify the single most useful next step. Explain the observed problem, recommend one concrete action, and give an acceptance check.",
  },
  blockers: {
    label: "Investigate blockers",
    instruction:
      "Investigate likely blockers in the current tracked work and relevant source. Separate confirmed blockers from suspicions. Recommend the smallest unblocking action and how to verify it. Do not invent blockers if none are evident.",
  },
  ideas: {
    label: "Find reusable ideas",
    instruction:
      "Compare the supplied shared project ideas with this project source. Propose one concrete reuse opportunity with evidence, fit, risks, and an acceptance check. If no relevant shared idea exists, identify one pattern this project could offer others. Do not claim to have inspected other projects or sent any messages.",
  },
  tests: {
    label: "Prepare test plan",
    instruction:
      "Inspect the current work and existing test conventions. Produce a short prioritized test plan with concrete scenarios, expected results, and relevant file paths. Do not execute tests or claim passing results.",
  },
};
export function capabilityFor(action = "review") {
  if (typeof action !== "string" || !Object.hasOwn(capabilities, action))
    throw Object.assign(Error("Unknown agent capability"), { status: 400 });
  return capabilities[action];
}
