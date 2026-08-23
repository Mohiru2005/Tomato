import fs from 'fs';
import path from 'path';

export interface FriendRequest {
  id: string;
  fromUser: string;
  toUser: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: string;
}

const dataFilePath = path.join(process.cwd(), 'data', 'requests.json');
let cachedRequests: FriendRequest[] | null = null;
let lastMtime = 0;

function ensureDbExists(): FriendRequest[] {
  try {
    const dirPath = path.dirname(dataFilePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    if (!fs.existsSync(dataFilePath)) {
      fs.writeFileSync(dataFilePath, '[]', 'utf-8');
      cachedRequests = [];
      lastMtime = fs.statSync(dataFilePath).mtimeMs;
      return [];
    }

    const stat = fs.statSync(dataFilePath);
    if (cachedRequests && stat.mtimeMs === lastMtime) {
      return cachedRequests;
    }

    const content = fs.readFileSync(dataFilePath, 'utf-8');
    const parsed: FriendRequest[] = JSON.parse(content);
    cachedRequests = parsed;
    lastMtime = stat.mtimeMs;
    return parsed;
  } catch {
    return cachedRequests || [];
  }
}

function save(requests: FriendRequest[]) {
  fs.writeFileSync(dataFilePath, JSON.stringify(requests, null, 2), 'utf-8');
  cachedRequests = requests;
  try {
    lastMtime = fs.statSync(dataFilePath).mtimeMs;
  } catch {}
}

export function getRequests(): FriendRequest[] {
  return ensureDbExists();
}

export function sendRequest(fromUser: string, toUser: string): { success: boolean; request?: FriendRequest; error?: string } {
  const requests = ensureDbExists();

  if (fromUser.toLowerCase() === toUser.toLowerCase()) {
    return { success: false, error: 'Cannot send a friend request to yourself.' };
  }

  const existing = requests.find(
    (r) =>
      ((r.fromUser.toLowerCase() === fromUser.toLowerCase() && r.toUser.toLowerCase() === toUser.toLowerCase()) ||
        (r.fromUser.toLowerCase() === toUser.toLowerCase() && r.toUser.toLowerCase() === fromUser.toLowerCase())) &&
      r.status !== 'rejected'
  );

  if (existing) {
    return { success: false, error: 'Friend request already exists or you are already friends.' };
  }

  const newReq: FriendRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    fromUser,
    toUser,
    status: 'pending',
    timestamp: new Date().toISOString(),
  };

  requests.push(newReq);
  save(requests);
  return { success: true, request: newReq };
}

export function respondToRequest(id: string, status: 'accepted' | 'rejected'): boolean {
  const requests = ensureDbExists();
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  requests[idx].status = status;
  save(requests);
  return true;
}

export function getFriendsOf(username: string): string[] {
  const requests = ensureDbExists();
  const userLower = username.toLowerCase();
  const friends = new Set<string>();

  for (const r of requests) {
    if (r.status === 'accepted') {
      if (r.fromUser.toLowerCase() === userLower) {
        friends.add(r.toUser);
      } else if (r.toUser.toLowerCase() === userLower) {
        friends.add(r.fromUser);
      }
    }
  }

  return Array.from(friends);
}

export function getIncomingRequests(username: string): FriendRequest[] {
  const requests = ensureDbExists();
  return requests.filter(
    (r) => r.toUser.toLowerCase() === username.toLowerCase() && r.status === 'pending'
  );
}

export function getSentRequests(username: string): FriendRequest[] {
  const requests = ensureDbExists();
  return requests.filter(
    (r) => r.fromUser.toLowerCase() === username.toLowerCase()
  );
}

export function areFriends(userA: string, userB: string): boolean {
  const requests = ensureDbExists();
  return requests.some(
    (r) =>
      r.status === 'accepted' &&
      ((r.fromUser.toLowerCase() === userA.toLowerCase() && r.toUser.toLowerCase() === userB.toLowerCase()) ||
        (r.fromUser.toLowerCase() === userB.toLowerCase() && r.toUser.toLowerCase() === userA.toLowerCase()))
  );
}

export function deleteAllRequestsForUser(username: string): void {
  const requests = ensureDbExists();
  const lower = username.toLowerCase();
  const filtered = requests.filter(
    (r) => r.fromUser.toLowerCase() !== lower && r.toUser.toLowerCase() !== lower
  );
  save(filtered);
}
