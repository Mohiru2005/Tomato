import fs from 'fs';
import path from 'path';

export interface ChatMessage {
  id: string;
  fromUser: string;
  toUser: string;
  text: string;
  timestamp: string; // ISO string
  read?: boolean;
  reactions?: { emoji: string; users: string[] }[];
}

const dataFilePath = path.join(process.cwd(), 'data', 'messages.json');
let cachedMessages: ChatMessage[] | null = null;
let lastMtime = 0;

function ensureDbExists(): ChatMessage[] {
  try {
    const dirPath = path.dirname(dataFilePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    if (!fs.existsSync(dataFilePath)) {
      fs.writeFileSync(dataFilePath, '[]', 'utf-8');
      cachedMessages = [];
      lastMtime = fs.statSync(dataFilePath).mtimeMs;
      return [];
    }

    const stat = fs.statSync(dataFilePath);
    if (cachedMessages && stat.mtimeMs === lastMtime) {
      return cachedMessages;
    }

    const content = fs.readFileSync(dataFilePath, 'utf-8');
    const parsed: ChatMessage[] = JSON.parse(content);
    cachedMessages = parsed;
    lastMtime = stat.mtimeMs;
    return parsed;
  } catch {
    return cachedMessages || [];
  }
}

function save(messages: ChatMessage[]) {
  fs.writeFileSync(dataFilePath, JSON.stringify(messages, null, 2), 'utf-8');
  cachedMessages = messages;
  try {
    lastMtime = fs.statSync(dataFilePath).mtimeMs;
  } catch {}
}

export function getConversation(userA: string, userB: string, currentReader?: string): ChatMessage[] {
  const messages = ensureDbExists();
  const a = userA.toLowerCase();
  const b = userB.toLowerCase();
  const reader = currentReader?.toLowerCase();

  let modified = false;
  const conversation = messages.filter((m) => {
    const from = m.fromUser.toLowerCase();
    const to = m.toUser.toLowerCase();
    const isMatch = (from === a && to === b) || (from === b && to === a);
    
    if (isMatch && reader && to === reader && !m.read) {
      m.read = true;
      modified = true;
    }
    return isMatch;
  });

  if (modified) {
    save(messages);
  }

  return conversation;
}

export function addMessage(fromUser: string, toUser: string, text: string): ChatMessage {
  const messages = ensureDbExists();
  const newMsg: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    fromUser,
    toUser,
    text,
    timestamp: new Date().toISOString(),
    read: false,
    reactions: [],
  };
  messages.push(newMsg);
  save(messages);
  return newMsg;
}

export function toggleReaction(messageId: string, username: string, emoji: string): ChatMessage | null {
  const messages = ensureDbExists();
  const msg = messages.find((m) => m.id === messageId);
  if (!msg) return null;

  if (!msg.reactions) msg.reactions = [];

  const lowerUser = username.toLowerCase();
  const existingReaction = msg.reactions.find((r) => r.emoji === emoji);

  if (existingReaction) {
    const userIdx = existingReaction.users.findIndex((u) => u.toLowerCase() === lowerUser);
    if (userIdx !== -1) {
      existingReaction.users.splice(userIdx, 1);
      if (existingReaction.users.length === 0) {
        msg.reactions = msg.reactions.filter((r) => r.emoji !== emoji);
      }
    } else {
      existingReaction.users.push(username);
    }
  } else {
    msg.reactions.push({ emoji, users: [username] });
  }

  save(messages);
  return msg;
}

export function clearConversation(userA: string, userB: string): boolean {
  const messages = ensureDbExists();
  const a = userA.toLowerCase();
  const b = userB.toLowerCase();
  const filtered = messages.filter(
    (m) =>
      !(
        (m.fromUser.toLowerCase() === a && m.toUser.toLowerCase() === b) ||
        (m.fromUser.toLowerCase() === b && m.toUser.toLowerCase() === a)
      )
  );
  save(filtered);
  return true;
}

export function deleteAllMessagesForUser(username: string): void {
  const messages = ensureDbExists();
  const lower = username.toLowerCase();
  const filtered = messages.filter(
    (m) => m.fromUser.toLowerCase() !== lower && m.toUser.toLowerCase() !== lower
  );
  save(filtered);
}

export function getConversationPartners(username: string): string[] {
  const messages = ensureDbExists();
  const lower = username.toLowerCase();
  const partners = new Set<string>();
  for (const m of messages) {
    if (m.fromUser.toLowerCase() === lower) partners.add(m.toUser);
    else if (m.toUser.toLowerCase() === lower) partners.add(m.fromUser);
  }
  return Array.from(partners);
}

export function getUnreadCounts(username: string): Record<string, number> {
  const messages = ensureDbExists();
  const lower = username.toLowerCase();
  const counts: Record<string, number> = {};

  for (const m of messages) {
    if (m.toUser.toLowerCase() === lower && !m.read) {
      const partner = m.fromUser;
      counts[partner] = (counts[partner] || 0) + 1;
    }
  }

  return counts;
}
