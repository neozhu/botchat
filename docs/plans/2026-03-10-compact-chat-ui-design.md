# Compact Chat UI Design

**Date:** 2026-03-10

**Goal:** Reduce excess whitespace in the main chat workspace while preserving the existing glassmorphism visual language.

## Scope

- Tighten the main chat panel spacing and header height.
- Tighten the left sessions sidebar density to match the chat panel.
- Change the message composer to a one-line default height with automatic growth for wrapped or multi-line input.

## Non-Goals

- No changes to chat data flow, session loading, or send behavior.
- No changes to the overall dashboard information architecture.
- No style reset or visual redesign beyond compacting spacing and heights.

## Layout Density

The dashboard keeps the current two-column structure and card hierarchy. The compact pass focuses on vertical rhythm:

- Reduce outer page padding and panel internal padding by one step.
- Keep `Active chat` as a single-line meta label.
- Keep the bot name as the primary single-line heading.
- Keep preset information, but place it closer to the heading and reduce its visual footprint.
- Reduce the spacing around the `Chat started` divider row.
- Pull the prompt suggestion and empty-state content upward to avoid large top gaps.
- Reduce the left sidebar header, session card, and footer spacing so the sidebar density matches the main panel.

## Composer Behavior

The composer continues to use a `textarea`, but it should behave like a single-line input by default:

- Remove the current tall default minimum height.
- Set the base height to approximately one line of text.
- Auto-resize the textarea based on content height.
- Shrink back down when content is removed.
- Preserve `Enter` to submit and `Shift+Enter` to insert a newline.
- Keep attachments above the textarea, but tighten the spacing between the attachments section, textarea, toolbar, and submit button.

## Implementation Notes

- Prefer local changes inside the chat panel and sessions panel components.
- Avoid broad changes to shared UI primitives unless a local change becomes too repetitive or fragile.
- Keep the current rounded, translucent, elevated look intact.

## Verification

- Confirm empty composer renders at one-line height.
- Confirm long text and explicit newlines grow the textarea.
- Confirm deleting content shrinks the textarea back down.
- Confirm compact spacing does not break sidebar collapse behavior or chat scroll behavior.
- Run lint before completion.
