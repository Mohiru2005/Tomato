import { readJsonData, writeJsonData } from './dbHelper';

export interface ChatMessage {
  id: string;
  fromUser: string;
  toUser: string;
  text: string;
  attachment?: string; // Data URL or Image URL
  timestamp: string; // ISO string
  read?: boolean;
  reactions?: { emoji: string; users: string[] }[];
}

async function ensureDbExists(): Promise<ChatMessage[]> {
  return await readJsonData<ChatMessage[]>('messages.json', []);
}

async function save(messages: ChatMessage[]): Promise<void> {
  await writeJsonData('messages.json', messages);
}

export async function getConversation(userA: string, userB: string, currentReader?: string): Promise<ChatMessage[]> {
  const messages = await ensureDbExists();
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
    await save(messages);
  }

  return conversation;
}

export async function addMessage(fromUser: string, toUser: string, text: string, attachment?: string): Promise<ChatMessage> {
  const messages = await ensureDbExists();
  const newMsg: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    fromUser,
    toUser,
    text,
    attachment: attachment || undefined,
    timestamp: new Date().toISOString(),
    read: false,
    reactions: [],
  };
  messages.push(newMsg);
  await save(messages);
  return newMsg;
}

export async function toggleReaction(messageId: string, username: string, emoji: string): Promise<ChatMessage | null> {
  const messages = await ensureDbExists();
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

  await save(messages);
  return msg;
}

export async function clearConversation(userA: string, userB: string): Promise<boolean> {
  const messages = await ensureDbExists();
  const a = userA.toLowerCase();
  const b = userB.toLowerCase();
  const filtered = messages.filter(
    (m) =>
      !(
        (m.fromUser.toLowerCase() === a && m.toUser.toLowerCase() === b) ||
        (m.fromUser.toLowerCase() === b && m.toUser.toLowerCase() === a)
      )
  );
  await save(filtered);
  return true;
}

export async function deleteAllMessagesForUser(username: string): Promise<void> {
  const messages = await ensureDbExists();
  const lower = username.toLowerCase();
  const filtered = messages.filter(
    (m) => m.fromUser.toLowerCase() !== lower && m.toUser.toLowerCase() !== lower
  );
  save(filtered);
}

export async function getConversationPartners(username: string): Promise<string[]> {
  const messages = await ensureDbExists();
  const lower = username.toLowerCase();
  const partners = new Set<string>();
  for (const m of messages) {
    if (m.fromUser.toLowerCase() === lower) partners.add(m.toUser);
    else if (m.toUser.toLowerCase() === lower) partners.add(m.fromUser);
  }
  return Array.from(partners);
}

export async function getUnreadCounts(username: string): Promise<Record<string, number>> {
  const messages = await ensureDbExists();
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
