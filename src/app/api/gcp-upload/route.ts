// app/api/gcp-upload/route.ts
import { NextResponse } from 'next/server';
import { Storage, File as GcsFile } from '@google-cloud/storage';
import fs from 'node:fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = process.env.GCS_BUCKET ?? '';

/** Load SA credentials from ONE of:
 *  - GOOGLE_APPLICATION_CREDENTIALS_JSON  (raw JSON string on one line)
 *  - GOOGLE_APPLICATION_CREDENTIALS_B64   (base64 of the full JSON)
 *  - GOOGLE_APPLICATION_CREDENTIALS_PATH  (absolute path to key.json)
 */
function loadCreds(): { client_email: string; private_key: string } {
  const rawJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ?
        Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON , 'base64').toString('utf8')
     : undefined;

  if (rawJson) {
    const j = JSON.parse(rawJson);
    return { client_email: j.client_email, private_key: j.private_key };
  }

  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS_PATH;
  if (path) {
    const j = JSON.parse(fs.readFileSync(path, 'utf8'));
    return { client_email: j.client_email, private_key: j.private_key };
  }

  throw new Error('Missing credentials: set JSON, B64, or PATH env for service account.');
}

function getStorage() {
  const projectId = process.env.GCP_PROJECT_ID;
  if (!projectId) throw new Error('Missing GCP_PROJECT_ID');
  const { client_email, private_key } = loadCreds();
  return new Storage({ projectId, credentials: { client_email, private_key } });
}

function safeName(name: string) {
  const i = name.lastIndexOf('.');
  const base = (i > -1 ? name.slice(0, i) : name).replace(/[^\w\-]+/g, '-');
  const ext = i > -1 ? name.slice(i) : '';
  return `${base}${ext}`;
}

async function signedReadUrl(file: GcsFile) {
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000,
  });
  return url;
}

function stripExt(s: string) {
  return s.replace(/\.[^/.]+$/, '');
}

/** Example object name pattern you currently have:
 *  speeches/<timestamp>-<id>.mp3
 *  We parse <id> back out here.
 */
function parseIdFromName(name: string): string {
  const justName = name.split('/').pop() || name;
  const parts = justName.split('-');           // ["1756...", "<id>.mp3"]
  if (parts.length < 2) return stripExt(justName);
  return stripExt(parts[1]);                   // "<id>"
}

/** GET /api/gcp-upload — list objects and return your app's shape */
export async function GET() {
  try {
    if (!BUCKET) throw new Error('Missing GCS_BUCKET');
    const s = getStorage();
    const bucket = s.bucket(BUCKET);

    // Add { prefix: 'speeches/' } if you keep everything under that folder
    const [files] = await bucket.getFiles();

    const items = await Promise.all(
      files.map(async (f: GcsFile) => {
        const meta = (f.metadata?.metadata as Record<string, string> | undefined) ?? {};
        const createdAtISO =
          (f.metadata?.timeCreated as string | undefined) ?? new Date().toISOString();

        // Prefer a base64-encoded text we stored; fallback to plain text; then to filename.
        const decodedText =
          meta.text_b64
            ? Buffer.from(meta.text_b64, 'base64').toString('utf8')
            : (meta.text ?? null);

        return {
          id: meta.id ?? parseIdFromName(f.name),
          text: decodedText ?? stripExt(f.name),
          audioBase64: await signedReadUrl(f),   // playable URL
          createdAt: createdAtISO,               // ISO string; convert to Date in client if desired
          status: 'complete' as const,
        };
      })
    );

    // newest first
    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return NextResponse.json({ ok: true, files: items });
  } catch (e: unknown) {
    console.error('gcp-upload GET error:', e);
    const message = e instanceof Error ? e.message : 'List failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** POST /api/gcp-upload — upload file and persist id/text in custom metadata */
export async function POST(req: Request) {
  try {
    if (!BUCKET) throw new Error('Missing GCS_BUCKET');

    const form = await req.formData();
    const file = form.get('file') as unknown as File | null;
    const providedId = (form.get('id') ?? '') as string;
    const providedText = (form.get('text') ?? '') as string;
    const prefix = (form.get('prefix') as string | null)?.replace(/^\/+|\/+$/g, '') || 'speeches';

    if (!file) {
      return NextResponse.json(
        { ok: false, error: 'No file provided (field "file")' },
        { status: 400 }
      );
    }

    const s = getStorage();
    const bucket = s.bucket(BUCKET);

    const original = safeName((file as File).name || 'audio.mp3');

    // Keep your existing naming pattern: <prefix>/<timestamp>-<original>
    // (where original is typically "<id>.mp3" from the client)
    const objectName = `${prefix}/${Date.now()}-${original}`;
    const blob = bucket.file(objectName);

    const buffer = Buffer.from(await (file as File).arrayBuffer());

    // Store text redundantly: plain and base64 (more robust with unicode/quotes)
    const textB64 = providedText
      ? Buffer.from(providedText, 'utf8').toString('base64')
      : undefined;

    await blob.save(buffer, {
      contentType: (file as File).type || 'application/octet-stream',
      resumable: false,
      metadata: {
        cacheControl: 'public, max-age=31536000',
        metadata: {
          ...(providedId   ? { id: providedId } : {}),
          ...(providedText ? { text: providedText } : {}),
          ...(textB64      ? { text_b64: textB64 } : {}),
          originalName: original,
        },
      },
    });

    const url = await signedReadUrl(blob);
    const publicUrl = `https://storage.googleapis.com/${BUCKET}/${encodeURIComponent(objectName)}`;

    return NextResponse.json({
      ok: true,
      name: objectName,
      id: providedId || parseIdFromName(objectName),
      text: providedText || stripExt(original),
      url,        // signed (15 min)
      publicUrl,  // permanent if bucket/object is public
    });
  } catch (e: unknown) {
    console.error('gcp-upload POST error:', e);
    const message = e instanceof Error ? e.message : 'Upload failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
