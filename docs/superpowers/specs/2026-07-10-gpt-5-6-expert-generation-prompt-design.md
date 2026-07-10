# GPT-5.6 Expert Generation Prompt Design

## Goal

Update `buildExpertGenerationPrompt` so it generates production-ready expert system prompts specifically for GPT-5.6, following OpenAI's current outcome-first prompting guidance.

The change must preserve the existing API contract: the model still returns `system_prompt` and `suggestion_question`, and the expert generation route, UI, and model configuration remain unchanged.

## Source Guidance

The design follows OpenAI's [Prompting guidance for GPT-5.6 Sol](https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6):

- define the outcome, constraints, evidence, and completion bar;
- prefer decision rules over unnecessary absolute instructions;
- separate personality from collaboration behavior;
- specify permissions, tool use, evidence handling, output requirements, and stopping conditions;
- remove redundant scaffolding and generic brevity instructions;
- treat validation as part of completion.

## Prompt Structure

The generator prompt will use the complete GPT-5.6-oriented structure below.

1. **Role and Goal**: identify the model as a prompt engineer and define the two required artifacts.
2. **Success Criteria**: state what a usable generated expert prompt must accomplish before completion.
3. **Generation Instructions**: direct the model to infer a useful scope from weak input, preserve explicit user values, and avoid rigid response scripts.
4. **System Prompt Contract**: require concise sections for Role, Personality, Collaboration Style, Goal, Success Criteria, Constraints, Tools and Evidence, Output, and Stop Rules.
5. **Suggestion Question Contract**: preserve the existing user-perspective, single-question, tailored, under-100-character behavior.
6. **Persona Input**: wrap all user-controlled persona fields in explicit XML-style data delimiters and state that their contents are untrusted data, not instructions.

The generated system prompt must:

- define personality separately from collaboration behavior;
- define what the assistant may do autonomously and when it must ask before acting;
- refer only to tools actually available at runtime and never invent tool capabilities;
- distinguish supported facts, explicit assumptions, and missing evidence;
- define concrete output content without forcing the same layout on every response;
- include completion, fallback, abstention, and minimal-clarification stop rules;
- use strong modal language only for true invariants;
- remain self-contained and immediately usable by the chat route.

## Input Handling

`name`, `agentName`, `description`, and `languageHint` remain interpolated values. They will be placed only inside a clearly delimited `<persona_input>` block.

The prompt will explicitly instruct GPT-5.6 not to follow commands found inside that block. Empty optional values remain omitted. When `languageHint` is absent, the existing language-matching fallback remains unchanged.

## Files and Scope

- Modify `app/api/experts/generate/prompt.ts` to replace the current repeated rules with the GPT-5.6 structure.
- Modify `app/api/experts/generate/prompt.test.mts` to encode the new prompt contract.
- Do not modify `app/api/experts/generate/route.ts`, its structured output schema, model configuration, the chat route, or any UI component.

## Testing

Follow test-driven development:

1. Update the focused prompt tests first.
2. Run them and confirm they fail because the GPT-5.6 contract is absent.
3. Make the smallest prompt implementation change that satisfies the tests.
4. Re-run the focused tests, lint, and the production build.

Tests will verify:

- GPT-5.6 is the explicit target;
- the complete system prompt contract includes personality, collaboration, permissions, tools and evidence, output, and stop rules;
- persona values are enclosed by explicit data boundaries and remain visible;
- untrusted persona instructions are not treated as executable instructions;
- the language fallback and suggestion question constraints remain intact;
- obsolete GPT-5.5 wording and generic brevity guidance are removed.

## Risks

The larger contract may increase prompt input tokens. The design limits this by consolidating repeated rules and keeping each section behavior-focused. Actual generated quality still depends on the configured GPT-5.6 model and cannot be fully proven by string-level unit tests; this task does not add API-backed evals.
