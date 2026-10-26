# Recent-message context budget implementation plan

Goal/spec: Replace Jev with the latest configured number of messages (default 6, including the current user message). Remove the oldest message one at a time until the local token estimate is at most 20,000. Preserve retained raw parts and message order. Reject a current request that cannot fit by itself instead of silently dropping it.

Architecture: Use the existing chat-context helper, local o200k_base tokenization, and the existing message-count setting. Reuse `BOTCHAT_COMPACT_AFTER_TOTAL_TOKENS` for the token threshold, as explicitly requested. Keep independent persisted summaries and their batching unchanged. Remove unused Jev integration, credentials, and documentation. The 20,000 budget covers serialized message roles/parts, not system instructions, tools declarations, output, or provider-side image/PDF processing.

Tech stack: Next.js, AI SDK, TypeScript, Node test runner, gpt-tokenizer.

## Task 1: Replace selection and integrate route

- [x] Write behavior tests for latest six, configurable count, oldest-first token trimming, exact budget, current-message overflow, tools, attachments, Unicode and empty input. Run and observe failures against the existing selection behavior.
- [x] Implement `prepareChatModelContext` with count and token limits; remove obsolete Jev and unused compaction logic. Preserve the latest user plus any tool continuation even when that current turn exceeds the message-count cap; reject it if over token budget.
- [x] Exercise the actual chat route with real context selection and conversion, faking only external boundaries. Assert selected messages reach streaming and oversized current input returns 413 without invoking the model.
- [x] Update env example, Docker defaults (6 / 20000), README and summary route expectations.
- [x] Run focused tests, all existing tests, lint, typecheck and build; report pre-existing failures and environmental blockers separately. Commit and push to master after explicit user authorization; do not publish the cloud environment.

Review focus: Token counts must ignore stored usage metadata; special-token-looking text is ordinary user content; boundary trimming must not mutate persisted messages or split tool call/results within a UI message; no external relevance call should remain; newest user must not disappear during tool continuation.

Validation: focused context/route/summary tests 45/45 passed; lint and typecheck passed. Broad suite 147 passed and the same 4 pre-existing failures (dashboard session cache pattern, expert seeding, Supabase env wording, native Node alias resolution). Production build passed (including TypeScript and static-page generation). Independent review found no blocking issues. The user authorized committing and pushing the validated change to GitHub.
