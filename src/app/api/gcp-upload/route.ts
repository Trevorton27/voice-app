import { NextResponse } from 'next/server';
import { Storage, File as GcsFile } from '@google-cloud/storage';
import fs from 'node:fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = process.env.GCS_BUCKET ?? '';

function loadCreds(): { client_email: string; private_key: string } {
   const rawJson =process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON 
      ? Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON , 'base64').toString('utf8')
     : undefined;
//console.log("rawJson:", rawJson);


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

function parseIdFromName(name: string): string {
  // get just the filename (remove folder prefix like "speeches/")
  const justName = name.split('/').pop() || name;

  // justName looks like: 1756342348674-Q0yLMGOJxLMDGAI9134sf.mp3
  const parts = justName.split('-');

  // parts[0] = "1756342348674" (timestamp)
  // parts[1] = "Q0yLMGOJxLMDGAI9134sf.mp3"
  if (parts.length < 2) return stripExt(justName);

  const idWithExt = parts[1];
  return stripExt(idWithExt); // remove ".mp3"
}



export async function GET() {
  try {
    if (!BUCKET) throw new Error('Missing GCS_BUCKET');
    const s = getStorage();
    const bucket = s.bucket(BUCKET);

    // If you use a folder, add { prefix: 'speeches/' }
    const [files] = await bucket.getFiles();

    const items = await Promise.all(
      files.map(async (f: GcsFile) => {
        const meta = (f.metadata?.metadata as Record<string, string> | undefined) ?? {};
        const createdAt = (f.metadata?.timeCreated as string | undefined) ?? new Date().toISOString();

        return {
  id: meta.id ?? parseIdFromName(f.name),
  text: meta.text ?? stripExt(f.name),
  audioBase64: await signedReadUrl(f),
  createdAt: createdAt,
  status: 'complete' as const,         // items from GCS are ready
        };
      })
    );

    // newest first
    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return NextResponse.json({ ok: true, files: items });
  } catch (e: unknown) {
    console.error('gcp-upload GET error:', e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'List failed' }, { status: 500 });
  }
}



// POST /api/gcp-upload — upload file and persist id/text in GCS custom metadata 
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
    // keep objectName independent of id/text, but you can also include id in the name if you prefer
    const objectName = `${prefix}/${Date.now()}-${original}`;
    const blob = bucket.file(objectName);

    const buffer = Buffer.from(await (file as File).arrayBuffer());
    await blob.save(buffer, {
      contentType: (file as File).type || 'application/octet-stream',
      resumable: false,
      metadata: {
        cacheControl: 'public, max-age=31536000',
        // 👇 persist your app data here
        metadata: {
          ...(providedId ? { id: providedId } : {}),
          ...(providedText ? { text: providedText } : {}),
          originalName: original,
        },
      },
    });

    const url = await signedReadUrl(blob);
    const publicUrl = `https://storage.googleapis.com/${BUCKET}/${encodeURIComponent(objectName)}`;

    return NextResponse.json({
      ok: true,
      name: objectName,
      // echo back the custom metadata so you can update UI immediately
      id: providedId || objectName,
      text: providedText || stripExt(original),
      url,
      publicUrl,
    });
  }  catch (e: unknown) {
    console.error('gcp-upload POST error:', e);
    const message = e instanceof Error ? e.message : 'Upload failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
