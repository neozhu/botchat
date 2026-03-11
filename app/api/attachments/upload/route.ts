import type { FileUIPart } from "ai";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BUCKET = "chat-attachments";

function safeFilename(name: string) {
  const cleaned = name.trim().replace(/[^\w.\-]+/g, "_");
  return cleaned.length > 120 ? cleaned.slice(-120) : cleaned || "file";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const sessionId = String(formData.get("sessionId") ?? "unknown");
    const rawFiles = formData.getAll("files");

    const files = rawFiles.filter((value): value is File => value instanceof File);
    if (files.length === 0) {
      return Response.json({ error: "No files provided." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const uploaded: FileUIPart[] = [];

    for (const file of files) {
      const mediaType = file.type || "application/octet-stream";
      const filename = safeFilename(file.name);
      const key = crypto.randomUUID();
      const objectPath = `sessions/${sessionId}/${Date.now()}-${key}-${filename}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(objectPath, buffer, {
          contentType: mediaType,
          upsert: false,
        });

      if (uploadError) {
        return Response.json(
          { error: `Failed to upload ${file.name}: ${uploadError.message}` },
          { status: 500 }
        );
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
      uploaded.push({
        type: "file",
        mediaType,
        filename: file.name,
        url: data.publicUrl,
      });
    }

    return Response.json({ files: uploaded });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload attachments.";
    return Response.json({ error: message }, { status: 500 });
  }
}

