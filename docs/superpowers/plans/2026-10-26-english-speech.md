# English-only message read-aloud

Goal: The response bubble read-aloud action sends only the English portions of mixed Chinese/English text. Pure Chinese content must not invoke the upstream speech API. Keep displayed/copied text unchanged.

Approach: A small shared pure extractor retains Latin-script spans with English punctuation/numbers, treats removed scripts as word boundaries, and removes translation punctuation and Markdown link targets. The client uses this text for its request and disables read-aloud when empty. The backend repeats validation before reading configuration or fetching; the upstream request builder enforces the same filtering. No external language detection service or new dependency. Latin-script filtering addresses Chinese/English text; it does not classify languages that share the Latin alphabet.

- [x] Write table-driven failing request-builder tests for mixed paragraphs, inline Chinese, supplementary Han characters, punctuation, links, and no-English text.
- [x] Implement the shared extractor, connect the UI and server route, and add behavior tests showing that Chinese-only input cannot reach upstream fetch.
- [x] Run focused and full existing tests, lint, typecheck and build. Review changes; report existing suite failures separately.

Use the existing isolated cloud checkout; no extra worktree. Do not publish the environment.

Validation: 20 focused extraction/request/route/UI checks passed; lint, typecheck, and production build passed. Full suite: 164 passed, with the same four pre-existing failures in dashboard-session-cache, expert-seeding expectations, Supabase env error wording, and native Node alias resolution for public-server. Independent review found no blocking issues. The user authorized committing and pushing this change to GitHub master.
