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

function getRedisRestCredentials() {
  let url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  let token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if ((!url || !token) && process.env.REDIS_URL) {
    try {
      const parsed = new URL(process.env.REDIS_URL);
      const host = parsed.hostname;
      const password = parsed.password;
      if (host && password) {
        const restHost = host.replace('.db.redis.io', '.upstash.io');
        url = restHost.startsWith('http') ? restHost : `https://${restHost}`;
        token = password;
      }
    } catch {}
  }

  return { url, token };
}

export async function readJsonData<T>(filename: string, defaultValue: T): Promise<T> {
  const { url, token } = getRedisRestCredentials();

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

  // JSONBin.io fallback
  const masterKey = process.env.JSONBIN_MASTER_KEY;
  const keyName = filename.replace('.json', '').toUpperCase();
  const binId = process.env[`JSONBIN_${keyName}_BIN_ID`];

  if (masterKey && binId) {
    try {
      const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
        headers: {
          'X-Master-Key': masterKey,
        },
        cache: 'no-store',
      });
      const json = await res.json();
      if (json.record) {
        return json.record;
      }
    } catch (err) {
      console.warn('Failed to read from JSONBin:', err);
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
  const { url, token } = getRedisRestCredentials();
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

  // JSONBin.io fallback
  const masterKey = process.env.JSONBIN_MASTER_KEY;
  const keyName = filename.replace('.json', '').toUpperCase();
  const binId = process.env[`JSONBIN_${keyName}_BIN_ID`];

  if (masterKey && binId) {
    try {
      await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': masterKey,
        },
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.warn('Failed to write to JSONBin:', err);
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
