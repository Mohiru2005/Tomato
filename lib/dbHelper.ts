import fs from 'fs';
import path from 'path';
import os from 'os';

export function getWritableFilePath(filename: string): string {
  const localDir = path.join(process.cwd(), 'data');
  const localFile = path.join(localDir, filename);

  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    try {
      const tmpDir = path.join(os.tmpdir(), 'tomato_data');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      const tmpFile = path.join(tmpDir, filename);
      if (!fs.existsSync(tmpFile)) {
        if (fs.existsSync(localFile)) {
          fs.copyFileSync(localFile, tmpFile);
        } else {
          fs.writeFileSync(tmpFile, '[]', 'utf-8');
        }
      }
      return tmpFile;
    } catch (e) {
      console.warn('Fallback to local file path:', e);
    }
  }

  if (!fs.existsSync(localDir)) {
    try {
      fs.mkdirSync(localDir, { recursive: true });
    } catch {}
  }

  return localFile;
}

export async function readJsonData<T>(filename: string, defaultValue: T): Promise<T> {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token) {
    try {
      const key = `tomato_${filename.replace('.json', '')}`;
      const res = await fetch(`${url}/get/${key}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const json = await res.json();
      if (json.result) {
        return typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
      }
    } catch (err) {
      console.warn('Failed to read from Cloud KV:', err);
    }
  }

  // Fallback to disk / /tmp
  try {
    const filePath = getWritableFilePath(filename);
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return defaultValue;
  }
}

export async function writeJsonData<T>(filename: string, data: T): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  const jsonStr = JSON.stringify(data, null, 2);

  if (url && token) {
    try {
      const key = `tomato_${filename.replace('.json', '')}`;
      await fetch(`${url}/set/${key}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonStr),
      });
    } catch (err) {
      console.warn('Failed to write to Cloud KV:', err);
    }
  }

  // Fallback to disk / /tmp
  try {
    const filePath = getWritableFilePath(filename);
    fs.writeFileSync(filePath, jsonStr, 'utf-8');
  } catch (err) {
    console.error('Failed to write to local disk:', err);
  }
}
