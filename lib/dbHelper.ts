import fs from 'fs';
import path from 'path';
import os from 'os';
import { createClient } from '@supabase/supabase-js';

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

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    try {
      return createClient(url, key);
    } catch (e) {
      console.warn('Supabase client creation error:', e);
    }
  }
  return null;
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
  const id = filename.replace('.json', '');

  // 1. Supabase Cloud Database Support
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('tomato_store')
        .select('content')
        .eq('id', id)
        .maybeSingle();

      if (data && data.content) {
        return typeof data.content === 'string' ? JSON.parse(data.content) : (data.content as T);
      }
      if (!error) {
        return defaultValue;
      }
    } catch (err) {
      console.warn('Failed to read from Supabase:', err);
    }
  }

  // 2. Upstash Redis / Vercel KV REST API
  const { url, token } = getRedisRestCredentials();
  if (url && token) {
    try {
      const key = `tomato_${id}`;
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

  // 3. Fallback to disk / /tmp
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
  const id = filename.replace('.json', '');

  // 1. Supabase Cloud Database Support
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('tomato_store')
        .upsert({ id, content: data }, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase upsert warning:', error.message);
      }
    } catch (err) {
      console.warn('Failed to write to Supabase:', err);
    }
  }

  // 2. Upstash Redis / Vercel KV REST API
  const { url, token } = getRedisRestCredentials();
  const jsonStr = JSON.stringify(data, null, 2);

  if (url && token) {
    try {
      const key = `tomato_${id}`;
      const res = await fetch(`${url}/set/${key}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonStr),
      });

      if (!res.ok) {
        await fetch(`${url}/set/${key}/${encodeURIComponent(jsonStr)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.warn('Failed to write to Cloud KV:', err);
    }
  }

  // 3. Fallback to disk / /tmp
  try {
    const filePath = getWritableFilePath(filename);
    fs.writeFileSync(filePath, jsonStr, 'utf-8');
  } catch (err) {
    console.error('Failed to write to local disk:', err);
  }
}
