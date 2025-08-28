import { NextResponse } from "next/server";

//used to test local connecivity to GCS bucket
//run with `curl http://localhost:<port number>/api/bucket`
export const runtime = "nodejs";

export async function GET() {
  try {
    const bucketName = process.env.GCS_BUCKET;
    if (!bucketName) {
      return NextResponse.json({ ok: false, error: "GCS_BUCKET env not set" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, bucket: bucketName });
  } catch (e: unknown) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
