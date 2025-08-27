// app/api/gcp-upload/route.ts
import { NextResponse } from 'next/server';
import { Storage, File as GcsFile } from '@google-cloud/storage';
import fs from 'node:fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = process.env.GCS_BUCKET ?? '';

/** Load SA credentials from one of: JSON, base64, or file path. */
function loadCreds(): { client_email: string; private_key: string } {
  const rawJson =process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON 
      ? Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON , 'base64').toString('utf8')
     : undefined;
console.log("rawJson:", rawJson);
  if (rawJson) {
    const parsed = JSON.parse(rawJson);
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error('Credentials JSON missing client_email or private_key');
    }
    return parsed;
  }

  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS_PATH;
  if (path) {
    if (!fs.existsSync(path)) throw new Error(`Credentials file not found: ${path}`);
    const parsed = JSON.parse(fs.readFileSync(path, 'utf8'));
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error('Credentials file missing client_email or private_key');
    }
    return parsed;
  }

  throw new Error(
    'Missing credentials. Set one of GOOGLE_APPLICATION_CREDENTIALS_JSON, GOOGLE_APPLICATION_CREDENTIALS_B64, or GOOGLE_APPLICATION_CREDENTIALS_PATH.'
  );
}

/** Construct a Storage client. */
function getStorage() {
  const projectId = process.env.GCP_PROJECT_ID;
  if (!projectId) throw new Error('Missing GCP_PROJECT_ID');
  const creds = loadCreds();
  return new Storage({
    projectId,
    credentials: { client_email: creds.client_email, private_key: creds.private_key },
  });
}

/** Sanitize file name (keep extension). */
function safeName(name: string) {
  const i = name.lastIndexOf('.');
  const base = (i > -1 ? name.slice(0, i) : name).replace(/[^\w\-]+/g, '-');
  const ext = i > -1 ? name.slice(i) : '';
  return `${base}${ext}`;
}

/** Create a short-lived read URL that works for private buckets. */
async function signedReadUrl(file: GcsFile) {
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
  });
  return url;
}

/** GET /api/gcp-upload — list objects with signed URLs */
export async function GET() {
  try {
    if (!BUCKET) throw new Error('Missing GCS_BUCKET');
    const s = getStorage();
    const bucket = s.bucket(BUCKET);

    // Add { prefix: 'speeches/' } if you want to scope the listing
    const [files] = await bucket.getFiles();

    const items = await Promise.all(
      files.map(async (f: GcsFile) => ({
        name: f.name,
        url: await signedReadUrl(f),
        size: Number(f.metadata?.size ?? 0),
        createdAt: f.metadata?.timeCreated ?? null,
      }))
    );

    items.sort((a, b) =>
      a.createdAt && b.createdAt ? (a.createdAt < b.createdAt ? 1 : -1) : 0
    );

    return NextResponse.json({ ok: true, files: items });
  } catch (e: unknown) {
    console.error('gcp-upload GET error:', e);
    const message = e instanceof Error ? e.message : 'List failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** POST /api/gcp-upload — upload multipart/form-data field "file" (optional "prefix") */
export async function POST(req: Request) {
  try {
    if (!BUCKET) throw new Error('Missing GCS_BUCKET');

    const form = await req.formData();
    const file = form.get('file') as unknown as File | null;
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
    const objectName = `${prefix}/${Date.now()}-${original}`;
    const blob = bucket.file(objectName);

    const buffer = Buffer.from(await (file as File).arrayBuffer());
    await blob.save(buffer, {
      contentType: (file as File).type || 'application/octet-stream',
      resumable: false,
      metadata: { cacheControl: 'public, max-age=31536000' },
    });

    const url = await signedReadUrl(blob);
    const publicUrl = `https://storage.googleapis.com/${BUCKET}/${encodeURIComponent(objectName)}`;

    return NextResponse.json({ ok: true, name: objectName, url, publicUrl });
  } catch (e: unknown) {
    console.error('gcp-upload GET error:', e);
    const message = e instanceof Error ? e.message : 'List failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}


/*
// app/api/gcp-upload/route.ts
import { NextResponse } from 'next/server';
import { Storage, File as GcsFile } from '@google-cloud/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // ensure this runs server-side in dev/prod


const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!);

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: creds.client_email,
    private_key: creds.private_key,
  },
});
const BUCKET = process.env.GCS_BUCKET as string;
if (!BUCKET) {
  // Don’t throw at module load (Next might import during build); validate in handlers.
  // eslint-disable-next-line no-console
  console.warn('GCS_BUCKET env var not set. /api/gcp-upload will fail until it is provided.');
}

function safeName(name: string) {
  // Keep it simple: strip path chars, spaces -> '-', keep extension
  const i = name.lastIndexOf('.');
  const base = (i > -1 ? name.slice(0, i) : name).replace(/[^\w\-]+/g, '-');
  const ext = i > -1 ? name.slice(i) : '';
  return `${base}${ext}`;
}

async function signedReadUrl(file: GcsFile) {
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    // 15 minutes is usually plenty for immediate playback/download in the UI
    expires: Date.now() + 15 * 60 * 1000,
  });
  return url;
}

/**
 * GET /api/gcp-upload
 * Lists objects in the bucket with temporary signed read URLs.
 */

/*
export async function GET() {
  try {
    if (!BUCKET) throw new Error('Missing GCS_BUCKET');
    const s = storage();
    const bucket = s.bucket(BUCKET);

    const [files] = await bucket.getFiles(); // optionally add { prefix: 'speeches/' }
    const items = await Promise.all(
      files.map(async (f) => ({
        name: f.name,
        url: await signedReadUrl(f),
        size: Number(f.metadata?.size ?? 0),
        createdAt: f.metadata?.timeCreated ?? null,
      }))
    );

    return NextResponse.json({ ok: true, files: items });
  } catch (e: unknown) {
    console.error('gcp-upload GET error:', e);
    const message = e instanceof Error ? e.message : 'List failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/gcp-upload
 * Accepts multipart/form-data with field "file" (and optional "prefix") and uploads to GCS.
 */

/*
export async function POST(req: Request) {
  try {
    if (!BUCKET) throw new Error('Missing GCS_BUCKET');

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const prefix = (form.get('prefix') as string | null)?.replace(/^\/+|\/+$/g, '') || 'speeches';

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file provided (field "file")' }, { status: 400 });
    }

    const s = storage();
    const bucket = s.bucket(BUCKET);

    const original = safeName(file.name || 'audio.mp3');
    const objectName = `${prefix}/${Date.now()}-${original}`;
    const blob = bucket.file(objectName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await blob.save(buffer, {
      contentType: file.type || 'application/octet-stream',
      resumable: false,
      metadata: { cacheControl: 'public, max-age=31536000' },
    });

    // Read URL that works for private buckets
    const url = await signedReadUrl(blob);

    // If your bucket/objects are public, you can also construct a public URL:
    const publicUrl = `https://storage.googleapis.com/${BUCKET}/${encodeURIComponent(objectName)}`;

    return NextResponse.json({
      ok: true,
      name: objectName,
      url,        // signed read URL (15 min)
      publicUrl,  // public URL (works only if object/bucket is public)
  });
  }
   catch (e: unknown) {
    console.error('gcp-upload POST error:', e);
    const message = e instanceof Error ? e.message : 'Upload failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
  }*/

