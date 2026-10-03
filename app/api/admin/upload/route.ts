import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import { put } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequest, sameOrigin } from "@/lib/admin/auth";
import { MEDIA_BACKEND } from "@/lib/admin/backend";
import { dataPath } from "@/lib/admin/storage";

// Vercel functions accept bodies up to 4.5 MB; the admin UI shrinks photos
// in the browser before uploading, so real uploads stay well below that.
const MAX_BYTES = 12 * 1024 * 1024;
const ACCEPTED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
const TYPES: Record<string, string> = { webp: "image/webp", jpg: "image/jpeg", png: "image/png", avif: "image/avif" };

/** Resizes to at most 2400px and re-encodes as WebP when sharp is available. */
async function optimize(input: Buffer): Promise<{ data: Buffer; ext: string } | null> {
  try {
    const { default: sharp } = await import("sharp");
    const data = await sharp(input).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    return { data, ext: "webp" };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (MEDIA_BACKEND === "none") return NextResponse.json({ error: "storage" }, { status: 503 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no-file" }, { status: 400 });
  if (!ACCEPTED[file.type]) return NextResponse.json({ error: "type" }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "size" }, { status: 413 });

  const original = Buffer.from(await file.arrayBuffer());
  const optimized = await optimize(original);
  const data = optimized?.data ?? original;
  const ext = optimized?.ext ?? ACCEPTED[file.type];
  const name = `${Date.now().toString(36)}-${randomBytes(5).toString("hex")}.${ext}`;

  if (MEDIA_BACKEND === "blob") {
    const blob = await put(`icg/media/${name}`, data, {
      access: "public",
      contentType: TYPES[ext],
      addRandomSuffix: false,
      cacheControlMaxAge: 31_536_000,
    });
    return NextResponse.json({ url: blob.url });
  }

  await fs.mkdir(dataPath("media"), { recursive: true });
  await fs.writeFile(dataPath("media", name), data);
  return NextResponse.json({ url: `/api/media/${name}` });
}
