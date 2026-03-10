import test from "node:test";
import assert from "node:assert/strict";

import { buildExpertGenerationPrompt } from "./prompt.ts";

test("buildExpertGenerationPrompt encodes GPT-5 style output and quality constraints", () => {
  const prompt = buildExpertGenerationPrompt({
    name: "Growth Strategist",
    agentName: "Nora",
    description: "Helps early-stage SaaS teams improve activation and retention.",
    languageHint: "English",
  });

  assert.match(prompt, /Generate exactly two fields/i);
  assert.match(prompt, /self-contained and directly usable/i);
  assert.match(prompt, /Do not invent credentials, policies, products, or capabilities/i);
  assert.match(prompt, /Avoid conflicting or overlapping instructions/i);
  assert.match(prompt, /Before you answer, internally check/i);
  assert.match(prompt, /Expert display name: Growth Strategist/);
  assert.match(prompt, /Agent name \(what the assistant calls itself\): Nora/);
  assert.match(prompt, /Description\/context: Helps early-stage SaaS teams improve activation and retention\./);
  assert.match(prompt, /Language hint: English/);
});

test("buildExpertGenerationPrompt falls back to matching the user's language when no language hint is supplied", () => {
  const prompt = buildExpertGenerationPrompt({
    name: "Tax Advisor",
    agentName: "",
    description: "",
    languageHint: "",
  });

  assert.match(prompt, /Language: match the user's language based on the inputs\./);
});
