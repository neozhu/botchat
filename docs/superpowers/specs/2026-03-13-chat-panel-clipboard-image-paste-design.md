# Chat Panel Clipboard Image Paste Design

## Goal

Allow users to paste screenshot images from the clipboard into the chat composer in `components/botchat/chat-panel.tsx`. Pasted images should enter the existing pending attachment preview area and be sent only when the user presses `Send`.

## Scope

- Support clipboard image paste while the composer textarea is focused.
- Reuse the existing `pendingFiles` attachment pipeline.
- Preserve current toolbar-based file attachment flow.
- Respect the existing `canSend` gate used by manual attachment acquisition.
- Preserve current upload and send behavior in `components/botchat/dashboard.tsx`.

Out of scope:

- Auto-sending pasted images
- Adding a new clipboard button or toolbar control
- Changing server upload APIs
- Supporting paste outside the textarea
- Recovering cleared drafts or attachments after upload/send failure

## Current System

- `components/botchat/chat-panel.tsx` owns the composer textarea and local attachment preview UI.
- `components/botchat/dashboard.tsx` receives `pendingFiles`, uploads them through `/api/attachments/upload`, then sends uploaded `FileUIPart`s with `sendMessage`.
- `app/api/attachments/upload/route.ts` already accepts `File` instances via multipart form data and returns uploaded file descriptors.

The missing capability is only the client-side conversion of clipboard image data into `File` instances that can enter `pendingFiles`.

## Proposed Approach

Implement clipboard image paste handling directly on the chat composer `Textarea` in `components/botchat/chat-panel.tsx`.

When a paste event occurs:

1. Read `event.clipboardData.items`.
2. Extract any items whose MIME type starts with `image/`.
3. Convert each image blob into a `File` with a generated filename.
4. Append those files to `pendingFiles`.
5. Leave plain-text paste behavior unchanged.

This keeps the change small and aligned with the current architecture: `chat-panel` handles attachment acquisition, while `dashboard` continues to own upload and send.

## File Normalization

Clipboard screenshots often do not include useful filenames. The client should generate names using a stable pattern such as:

- `pasted-image-20260313-153045.png`

Rules:

- Derive the extension from the MIME type when possible.
- Fall back to `.bin` only if the MIME type is unknown.
- Preserve the original MIME type on the `File`.
- Add a unique suffix or per-item index within a single paste event to avoid collisions in the current preview/remove tuple (`name`, `lastModified`, `size`).
- Deduplicate only within the current paste event when needed. Do not attempt broad cross-session or global deduplication.

## Paste Behavior

### Text-only paste

- Allow the browser's default textarea paste behavior.
- Do not modify `pendingFiles`.

### Image-only paste

- Only run when the composer is in the same state that already allows manual attachments.
- Add the generated `File` objects to `pendingFiles`.
- Prevent the default paste behavior to avoid inserting empty or broken content into the textarea.

### Mixed text + image paste

- Only run when the composer is in the same state that already allows manual attachments.
- Allow the text portion to paste normally into the textarea.
- Still extract and append the image files into `pendingFiles`.
- Do not manually insert text into the textarea if the browser default paste already handles it.
- Do not block the user's text input just because the clipboard also contains image data.

## UI Behavior

No new UI controls are required.

Expected result after paste:

- The image appears in the existing attachment preview strip.
- The attachment summary updates as usual.
- The user can remove the attachment before sending.
- Pressing `Send` follows the current attachment upload flow unchanged.

## Error Handling

- If a clipboard item cannot be converted into a blob or file, skip that item.
- If no valid image items are present, do nothing special.
- Upload failures remain handled by the existing dashboard send flow, including the current behavior where cleared drafts and attachments are not restored.

This change should avoid introducing new user-facing error messaging unless the existing send flow already produces it.

## Validation

- Pasted images must pass through the same client-side validation rules already used for manually attached files, if such validation exists.
- In the current `botchat` composer flow there is no separate attachment validation helper, so paste should match the existing manual attachment behavior instead of introducing a new rule set.

## Testing

Add a focused helper for clipboard image normalization and test:

- image MIME type to generated filename extension
- unknown MIME type fallback
- empty or invalid clipboard image extraction returning no files
- per-paste filename uniqueness for multiple pasted images
- paste gating when attachments are disabled

Manual verification should cover:

- paste screenshot into focused textarea
- confirm preview appears before sending
- confirm text-only paste still works
- confirm mixed text + image paste keeps text and adds attachment
- confirm send uploads and includes the pasted image
- confirm paste is ignored while composer is not allowed to attach files

## Risks

- Browser clipboard behavior differs slightly across engines, especially for mixed text/image paste.
- Some screenshots may arrive without expected metadata, so filename generation must be defensive.
- Preventing default paste too broadly would regress normal text entry, so default suppression must be limited to image-only paste.
