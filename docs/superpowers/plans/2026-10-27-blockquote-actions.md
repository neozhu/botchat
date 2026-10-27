# Blockquote read-aloud and copy

Goal: Each blockquote inside an AI reply exposes speech and copy icons at its bottom right on hover, with keyboard focus and touch support. Speech uses the existing English-only extractor and speech endpoint; copy preserves the complete plain text of that quote. User messages keep their current rendering.

Approach: Pass a stable assistant-only blockquote component to Streamdown. Extract text from its Markdown AST to preserve paragraph boundaries and inline text without including toolbar labels. Reuse a response-actions component for both entire replies and individual quotes. Keep at most one speech request/playback active and clean up audio, object URLs, and requests on unmount or switching.

- [x] Add failing behavioral tests for quote text extraction and English-only speech requests, including Chinese-only input, multiple paragraphs, links, nested quotes, streaming updates, cancellation and failed requests.
- [x] Extract shared action UI/playback from chat-panel, add the quote renderer and assistant-only component mapping; preserve existing response actions and rendering styles.
- [x] Run focused and existing tests, lint, typecheck/build, and independent review. Report known pre-existing failures separately. Commit and push the completed change according to the session's GitHub submission preference.

Validation: initial helper/request tests failed 8/8 before implementation; final focused suite 32/32 passed, including real Streamdown/React SSR quote integration. The independent review found merged table cells/rows; the new quoted-table regression failed before the separator fix and passed afterward. Lint and production build passed. Full suite: 176 passed and four known pre-existing failures (dashboard cache source-pattern expectation, expert seeding expectation, Supabase env error wording, and public-server native Node alias resolution). Browser smoke validation could not complete in this environment; no live speech-provider playback claim is made. User explicitly requested GitHub submission.
