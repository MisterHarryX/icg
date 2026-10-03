import { promises as fs } from "node:fs";
import { dataPath } from "@/lib/admin/storage";

const TYPES: Record<string, string> = { webp: "image/webp", jpg: "image/jpeg", png: "image/png", avif: "image/avif" };

/** Serves images uploaded in admin mode. File names are unique, so they cache forever. */
export async function GET(_request: Request, { params }: RouteContext<"/api/media/[file]">) {
  const { file } = await params;
  const match = /^[a-z0-9-]+\.(webp|jpg|png|avif)$/.exec(file);
  if (!match) return new Response("Not found", { status: 404 });

  try {
    const data = await fs.readFile(dataPath("media", file));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[match[1]],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
