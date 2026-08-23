import { NextResponse } from 'next/server';
import {
  getConversation,
  addMessage,
  clearConversation,
  getConversationPartners,
  getUnreadCounts,
  toggleReaction,
} from '@/lib/messagesDb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type === 'partners') {
    const user = searchParams.get('user');
    if (!user) {
      return NextResponse.json({ success: false, error: 'user param required.' }, { status: 400 });
    }
    const partners = await getConversationPartners(user);
    return NextResponse.json({ success: true, partners });
  }

  if (type === 'unread') {
    const user = searchParams.get('user');
    if (!user) {
      return NextResponse.json({ success: false, error: 'user param required.' }, { status: 400 });
    }
    const counts = await getUnreadCounts(user);
    return NextResponse.json({ success: true, unread: counts });
  }

  const userA = searchParams.get('userA');
  const userB = searchParams.get('userB');
  const reader = searchParams.get('reader') || userA || undefined;

  if (!userA || !userB) {
    return NextResponse.json({ success: false, error: 'userA and userB params required.' }, { status: 400 });
  }

  const messages = await getConversation(userA, userB, reader);
  return NextResponse.json({ success: true, messages });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fromUser, toUser, text, attachment } = body;

    if (!fromUser || !toUser || (!text?.trim() && !attachment)) {
      return NextResponse.json({ success: false, error: 'fromUser, toUser and text/attachment required.' }, { status: 400 });
    }

    const newMessage = await addMessage(fromUser.trim(), toUser.trim(), text ? text.trim() : '', attachment);
    return NextResponse.json({ success: true, message: newMessage });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to send message.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { messageId, username, emoji } = body;

    if (!messageId || !username || !emoji) {
      return NextResponse.json({ success: false, error: 'messageId, username, and emoji required.' }, { status: 400 });
    }

    const updated = await toggleReaction(messageId, username, emoji);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Message not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: updated });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update reaction.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { userA, userB } = body;
    if (!userA || !userB) {
      return NextResponse.json({ success: false, error: 'userA and userB required.' }, { status: 400 });
    }
    await clearConversation(userA, userB);
    return NextResponse.json({ success: true, message: 'Conversation cleared.' });
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
