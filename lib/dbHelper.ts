import fs from 'fs';
import path from 'path';
import os from 'os';

export function getWritableFilePath(filename: string): string {
  const localDir = path.join(process.cwd(), 'data');
  const localFile = path.join(localDir, filename);

  // If running on Vercel or in serverless where process.cwd() is read-only
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

  // Local development fallback
  if (!fs.existsSync(localDir)) {
    try {
      fs.mkdirSync(localDir, { recursive: true });
    } catch {}
  }

  return localFile;
}
