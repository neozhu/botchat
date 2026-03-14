type NormalizeClipboardFilesOptions = {
  now?: Date;
};

type ClipboardPasteDefaultInput = {
  hasPastedFiles: boolean;
  hasPastedText: boolean;
};

const MIME_TYPE_EXTENSIONS: Record<string, string> = {
  "application/msword": "doc",
  "application/pdf": "pdf",
  "application/vnd.ms-excel": "xls",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "text/csv": "csv",
  "text/markdown": "md",
  "text/plain": "txt",
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

function buildClipboardFileName(file: File, index: number, timestamp: string) {
  if (file.type.startsWith("image/")) {
    return `pasted-image-${timestamp}-${index + 1}.${getExtensionForMimeType(file.type)}`;
  }

  const originalName = typeof file.name === "string" ? file.name.trim() : "";
  if (originalName) {
    return originalName;
  }

  return `pasted-file-${timestamp}-${index + 1}.${getExtensionForMimeType(file.type)}`;
}

export function normalizeClipboardFiles(
  files: File[],
  options: NormalizeClipboardFilesOptions = {}
) {
  const now = options.now ?? new Date();
  const timestamp = formatPasteTimestamp(now);

  return files.map((file, index) => {
    const name = buildClipboardFileName(file, index, timestamp);

    return new File([file], name, {
      type: file.type,
      lastModified: file.lastModified || now.getTime() + index,
    });
  });
}

export function shouldPreventClipboardPasteDefault(
  input: ClipboardPasteDefaultInput
) {
  return input.hasPastedFiles && !input.hasPastedText;
}
