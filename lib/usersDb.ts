import { readJsonData, writeJsonData } from './dbHelper';

export interface UserRecord {
  username: string;
  pin: string;
  role: 'admin' | 'user';
  createdAt: string;
  statusMsg?: string;
}

const DEFAULT_USERS: UserRecord[] = [
  {
    username: 'admin',
    pin: '1234',
    role: 'admin',
    createdAt: '2026-08-23T00:00:00.000Z',
    statusMsg: 'System Administrator',
  },
];

async function ensureDbExists(): Promise<UserRecord[]> {
  try {
    const parsed = await readJsonData<UserRecord[]>('users.json', DEFAULT_USERS);
    if (!parsed || parsed.length === 0) {
      await writeJsonData('users.json', DEFAULT_USERS);
      return DEFAULT_USERS;
    }

    let updated = false;
    const normalized = parsed.map((u) => {
      const isAdmin = u.username.toLowerCase() === 'admin';
      const role = u.role || (isAdmin ? 'admin' : 'user');
      const statusMsg = u.statusMsg || (isAdmin ? 'System Administrator' : 'Available');
      if (role !== u.role || statusMsg !== u.statusMsg) updated = true;
      return { ...u, role, statusMsg };
    });

    if (updated) {
      await writeJsonData('users.json', normalized);
    }

    return normalized;
  } catch (error) {
    console.error('Error reading users database:', error);
    return DEFAULT_USERS;
  }
}

export async function getUsers(): Promise<UserRecord[]> {
  return await ensureDbExists();
}

export async function saveUser(username: string, pin: string): Promise<{ success: boolean; user?: UserRecord; error?: string }> {
  const users = await ensureDbExists();
  const lowerName = username.toLowerCase();
  
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
  await writeJsonData('users.json', users);
  return { success: true, user: newUser };
}

export async function validateUser(username: string, pin: string): Promise<UserRecord | null> {
  const users = await ensureDbExists();
  const lowerName = username.toLowerCase();
  const found = users.find(
    (u) => u.username.toLowerCase() === lowerName && u.pin === pin
  );
  return found || null;
}

export async function updateUserStatus(username: string, statusMsg: string): Promise<boolean> {
  const users = await ensureDbExists();
  const lowerName = username.toLowerCase();
  const user = users.find((u) => u.username.toLowerCase() === lowerName);
  if (!user) return false;

  user.statusMsg = statusMsg;
  await writeJsonData('users.json', users);
  return true;
}

export async function deleteUser(username: string): Promise<boolean> {
  const users = await ensureDbExists();
  const lowerName = username.toLowerCase();
  
  if (lowerName === 'admin') {
    return false;
  }

  const filtered = users.filter((u) => u.username.toLowerCase() !== lowerName);
  if (filtered.length === users.length) {
    return false;
  }

  await writeJsonData('users.json', filtered);
  return true;
}
