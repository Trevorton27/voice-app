// lib/gcpClient.ts
import { Storage } from '@google-cloud/storage';

let storage: Storage | null = null;

export function getStorageClient(): Storage {
  if (storage) return storage;

  const encoded = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!encoded) {
    throw new Error('Missing GOOGLE_APPLICATION_CREDENTIALS_JSON in environment');
  }

  const credentials = JSON.parse(
    Buffer.from(encoded, 'base64').toString('utf-8')
  );

  storage = new Storage({ credentials });
  console.log('storage: ', storage)

  return storage;
}
