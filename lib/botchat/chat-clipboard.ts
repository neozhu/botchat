type NormalizePastedImageFilesOptions = {
  now?: Date;
};

type ClipboardPasteDefaultInput = {
  hasPastedImages: boolean;
  hasPastedText: boolean;
};

const MIME_TYPE_EXTENSIONS: Record<string, string> = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function formatDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function formatPasteTimestamp(date: Date) {
  return [
    date.getUTCFullYear(),
    formatDatePart(date.getUTCMonth() + 1),
    formatDatePart(date.getUTCDate()),
  ].join("") +
    "-" +
    [
      formatDatePart(date.getUTCHours()),
      formatDatePart(date.getUTCMinutes()),
      formatDatePart(date.getUTCSeconds()),
    ].join("");
}

function getExtensionForMimeType(mimeType: string) {
  return MIME_TYPE_EXTENSIONS[mimeType] ?? "bin";
}

export function normalizePastedImageFiles(
  files: File[],
  options: NormalizePastedImageFilesOptions = {}
) {
  const now = options.now ?? new Date();
  const timestamp = formatPasteTimestamp(now);

  return files.map((file, index) => {
    const extension = getExtensionForMimeType(file.type);
    const name = `pasted-image-${timestamp}-${index + 1}.${extension}`;

    return new File([file], name, {
      type: file.type,
      lastModified: now.getTime() + index,
    });
  });
}

export function shouldPreventClipboardPasteDefault(
  input: ClipboardPasteDefaultInput
) {
  return input.hasPastedImages && !input.hasPastedText;
}
