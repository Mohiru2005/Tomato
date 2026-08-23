import { readJsonData, writeJsonData } from './dbHelper';

export interface FriendRequest {
  id: string;
  fromUser: string;
  toUser: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: string;
}

async function ensureDbExists(): Promise<FriendRequest[]> {
  return await readJsonData<FriendRequest[]>('requests.json', []);
}

async function save(requests: FriendRequest[]): Promise<void> {
  await writeJsonData('requests.json', requests);
}

export async function getRequests(): Promise<FriendRequest[]> {
  return await ensureDbExists();
}

export async function sendRequest(fromUser: string, toUser: string): Promise<{ success: boolean; request?: FriendRequest; error?: string }> {
  const requests = await ensureDbExists();

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
  await save(requests);
  return { success: true, request: newReq };
}

export async function respondToRequest(id: string, status: 'accepted' | 'rejected'): Promise<boolean> {
  const requests = await ensureDbExists();
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  requests[idx].status = status;
  await save(requests);
  return true;
}

export async function getFriendsOf(username: string): Promise<string[]> {
  const requests = await ensureDbExists();
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

export async function getIncomingRequests(username: string): Promise<FriendRequest[]> {
  const requests = await ensureDbExists();
  return requests.filter(
    (r) => r.toUser.toLowerCase() === username.toLowerCase() && r.status === 'pending'
  );
}

export async function getSentRequests(username: string): Promise<FriendRequest[]> {
  const requests = await ensureDbExists();
  return requests.filter(
    (r) => r.fromUser.toLowerCase() === username.toLowerCase()
  );
}

export async function areFriends(userA: string, userB: string): Promise<boolean> {
  const requests = await ensureDbExists();
  return requests.some(
    (r) =>
      r.status === 'accepted' &&
      ((r.fromUser.toLowerCase() === userA.toLowerCase() && r.toUser.toLowerCase() === userB.toLowerCase()) ||
        (r.fromUser.toLowerCase() === userB.toLowerCase() && r.toUser.toLowerCase() === userA.toLowerCase()))
  );
}

export async function deleteAllRequestsForUser(username: string): Promise<void> {
  const requests = await ensureDbExists();
  const lower = username.toLowerCase();
  const filtered = requests.filter(
    (r) => r.fromUser.toLowerCase() !== lower && r.toUser.toLowerCase() !== lower
  );
  await save(filtered);
}
