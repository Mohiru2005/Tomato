import fs from 'fs';
import { getWritableFilePath } from './dbHelper';

export interface UserRecord {
  username: string;
  pin: string;
  role: 'admin' | 'user';
  createdAt: string;
  statusMsg?: string;
}

let cachedUsers: UserRecord[] | null = null;
let lastMtime = 0;

function ensureDbExists(): UserRecord[] {
  const dataFilePath = getWritableFilePath('users.json');
  try {
    if (!fs.existsSync(dataFilePath)) {
      const initial: UserRecord[] = [
        {
          username: 'admin',
          pin: '1234',
          role: 'admin',
          createdAt: new Date().toISOString(),
          statusMsg: 'System Administrator',
        },
      ];
      fs.writeFileSync(dataFilePath, JSON.stringify(initial, null, 2), 'utf-8');
      cachedUsers = initial;
      try { lastMtime = fs.statSync(dataFilePath).mtimeMs; } catch {}
      return initial;
    }

    let mtimeMs = 0;
    try { mtimeMs = fs.statSync(dataFilePath).mtimeMs; } catch {}

    if (cachedUsers && mtimeMs === lastMtime && mtimeMs > 0) {
      return cachedUsers;
    }

    const content = fs.readFileSync(dataFilePath, 'utf-8');
    const parsed: UserRecord[] = JSON.parse(content);
    
    let updated = false;
    const normalized = parsed.map((u) => {
      const isAdmin = u.username.toLowerCase() === 'admin';
      const role = u.role || (isAdmin ? 'admin' : 'user');
      const statusMsg = u.statusMsg || (isAdmin ? 'System Administrator' : 'Available');
      if (role !== u.role || statusMsg !== u.statusMsg) updated = true;
      return { ...u, role, statusMsg };
    });

    if (updated) {
      fs.writeFileSync(dataFilePath, JSON.stringify(normalized, null, 2), 'utf-8');
      try { lastMtime = fs.statSync(dataFilePath).mtimeMs; } catch {}
    } else {
      lastMtime = mtimeMs;
    }

    cachedUsers = normalized;
    return normalized;
  } catch (error) {
    console.error('Error reading users database:', error);
    return cachedUsers || [];
  }
}

export function getUsers(): UserRecord[] {
  return ensureDbExists();
}

export function saveUser(username: string, pin: string): { success: boolean; user?: UserRecord; error?: string } {
  const users = ensureDbExists();
  const lowerName = username.toLowerCase();
  const dataFilePath = getWritableFilePath('users.json');
  
  const existing = users.find((u) => u.username.toLowerCase() === lowerName);
  if (existing) {
    return { success: false, error: 'Username already exists. Please log in.' };
  }

  const isFirstAdmin = lowerName === 'admin';
  const newUser: UserRecord = {
    username,
    pin,
    role: isFirstAdmin ? 'admin' : 'user',
    createdAt: new Date().toISOString(),
    statusMsg: 'Available',
  };

  users.push(newUser);
  fs.writeFileSync(dataFilePath, JSON.stringify(users, null, 2), 'utf-8');
  cachedUsers = users;
  try { lastMtime = fs.statSync(dataFilePath).mtimeMs; } catch {}
  return { success: true, user: newUser };
}

export function validateUser(username: string, pin: string): UserRecord | null {
  const users = ensureDbExists();
  const lowerName = username.toLowerCase();
  const found = users.find(
    (u) => u.username.toLowerCase() === lowerName && u.pin === pin
  );
  return found || null;
}

export function updateUserStatus(username: string, statusMsg: string): boolean {
  const users = ensureDbExists();
  const lowerName = username.toLowerCase();
  const dataFilePath = getWritableFilePath('users.json');
  const user = users.find((u) => u.username.toLowerCase() === lowerName);
  if (!user) return false;

  user.statusMsg = statusMsg;
  fs.writeFileSync(dataFilePath, JSON.stringify(users, null, 2), 'utf-8');
  cachedUsers = users;
  try { lastMtime = fs.statSync(dataFilePath).mtimeMs; } catch {}
  return true;
}

export function deleteUser(username: string): boolean {
  const users = ensureDbExists();
  const lowerName = username.toLowerCase();
  const dataFilePath = getWritableFilePath('users.json');
  
  if (lowerName === 'admin') {
    return false;
  }

  const filtered = users.filter((u) => u.username.toLowerCase() !== lowerName);
  if (filtered.length === users.length) {
    return false;
  }

  fs.writeFileSync(dataFilePath, JSON.stringify(filtered, null, 2), 'utf-8');
  cachedUsers = filtered;
  try { lastMtime = fs.statSync(dataFilePath).mtimeMs; } catch {}
  return true;
}
