import test from "node:test";
import assert from "node:assert/strict";
import { evaluateChatHistoryNeed } from "./typesafe.ts";

const state = {
  currentMessage: "Continue that solution",
  recentTurns: [{ messages: [
    { id: "u1", role: "user" as const, text: "Fix the bug" },
    { id: "a1", role: "assistant" as const, text: "Proposed fix" },
  ] }, { messages: [
    { id: "u2", role: "user" as const, text: "Another question" },
    { id: "a2", role: "assistant" as const, text: "Another answer" },
  ] }],
};
const validAnswers = {
  turn_0: { type: "noul", noul: 0.94 },
  turn_1: { type: "noul", noul: 0.05 },
};

test("Jev history evaluation compares each turn and selects its user and assistant messages together", async () => {
  let requestBody: Record<string, unknown> | undefined;
  let authorization: string | undefined;
  const selection = await evaluateChatHistoryNeed(state, {
    env: { TYPESAFE_API_KEY: "test-key", TYPESAFE_MODEL: "jev-test" },
    fetch: async (url, init) => {
      assert.equal(url, "https://api.typesafe.ai/v1/systemone");
      authorization = (init?.headers as Record<string, string>).Authorization;
      requestBody = JSON.parse(init?.body as string);
      return Response.json({ model: "jev-test", answers: validAnswers, usage: { input_tokens: 150, output_tokens: 10 } });
    },
  });
  assert.deepEqual(selection, { messageIds: ["u1", "a1"] });
  assert.equal(authorization, "Bearer test-key");
  assert.equal(requestBody?.model, "jev-test");
  assert.deepEqual(requestBody?.state, state);
  const questions = requestBody?.questions as Record<string, { type: string; instructions: string }>;
  assert.deepEqual(Object.keys(questions), ["turn_0", "turn_1"]);
  assert.equal(questions.turn_0.type, "noul");
  assert.match(questions.turn_0.instructions, /recentTurns\[0\]/);
  assert.match(questions.turn_1.instructions, /recentTurns\[1\]/);
});

test("Jev history evaluation fails without a server-side API key", async () => {
  await assert.rejects(evaluateChatHistoryNeed(state, { env: {} }), /TYPESAFE_API_KEY/);
});

test("Jev history evaluation rejects HTTP failures", async () => {
  await assert.rejects(evaluateChatHistoryNeed(state, {
    env: { TYPESAFE_API_KEY: "test-key" },
    fetch: async () => new Response("Rate limited", { status: 429 }),
  }), /429/);
});

test("Jev history evaluation rejects malformed answers", async () => {
  for (const answer of [undefined, { type: "noul", noul: "0.9" }, { type: "noul", noul: -1 }, { type: "noul", noul: 2 }, { type: "score", noul: 0.9 }]) {
    await assert.rejects(evaluateChatHistoryNeed(state, {
      env: { TYPESAFE_API_KEY: "test-key" },
      fetch: async () => Response.json({ model: "jev-latest", answers: { ...validAnswers, turn_0: answer }, usage: { input_tokens: 150, output_tokens: 10 } }),
    }), /Invalid.*Jev/);
  }
});

test("Jev history evaluation drops uncertain turns without requiring any other answers", async () => {
  const selection = await evaluateChatHistoryNeed(state, {
    env: { TYPESAFE_API_KEY: "test-key" },
    fetch: async (_url, init) => {
      const body = JSON.parse(init?.body as string);
      assert.deepEqual(Object.keys(body.questions), ["turn_0", "turn_1"]);
      return Response.json({ model: "jev-latest", answers: { turn_0: { type: "noul", noul: 0.5 }, turn_1: { type: "noul", noul: 0.01 } }, usage: { input_tokens: 150, output_tokens: 10 } });
    },
  });
  assert.deepEqual(selection, { messageIds: [] });
});

test("Jev history evaluation includes a whole turn only when its true probability exceeds 0.8", async () => {
  const cases = [
    { probability: 0, expectedIds: [] },
    { probability: 0.5, expectedIds: [] },
    { probability: 0.799999, expectedIds: [] },
    { probability: 0.8, expectedIds: [] },
    { probability: 0.800001, expectedIds: ["u1", "a1"] },
    { probability: 0.9, expectedIds: ["u1", "a1"] },
    { probability: 1, expectedIds: ["u1", "a1"] },
  ];
  for (const { probability, expectedIds } of cases) {
    const selection = await evaluateChatHistoryNeed(state, {
      env: { TYPESAFE_API_KEY: "test-key" },
      fetch: async () => Response.json({
        model: "jev-latest",
        answers: {
          turn_0: { type: "noul", noul: probability },
          turn_1: { type: "noul", noul: 0.05 },
        },
        usage: { input_tokens: 150, output_tokens: 10 },
      }),
    });
    assert.deepEqual(selection.messageIds, expectedIds, `true probability ${probability}`);
  }
});

test("Jev history evaluation propagates network and timeout failures for fallback", async () => {
  await assert.rejects(evaluateChatHistoryNeed(state, {
    env: { TYPESAFE_API_KEY: "test-key" },
    fetch: async () => { throw new DOMException("Timed out", "TimeoutError"); },
  }), /Timed out/);
});
