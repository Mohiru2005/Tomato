import { NextResponse } from 'next/server';
import {
  getRequests,
  sendRequest,
  respondToRequest,
  getIncomingRequests,
  getSentRequests,
  getFriendsOf,
} from '@/lib/requestsDb';

// GET: fetch requests/friends for a user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('user');
  const type = searchParams.get('type') || 'all';

  if (!username) {
    return NextResponse.json({ success: false, error: 'User param required.' }, { status: 400 });
  }

  if (type === 'friends') {
    const friends = getFriendsOf(username);
    return NextResponse.json({ success: true, friends });
  }
  if (type === 'incoming') {
    const incoming = getIncomingRequests(username);
    return NextResponse.json({ success: true, requests: incoming });
  }
  if (type === 'sent') {
    const sent = getSentRequests(username);
    return NextResponse.json({ success: true, requests: sent });
  }

  const all = getRequests();
  return NextResponse.json({ success: true, requests: all });
}

// POST: send a friend request
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fromUser, toUser } = body;
    if (!fromUser || !toUser) {
      return NextResponse.json({ success: false, error: 'fromUser and toUser required.' }, { status: 400 });
    }
    const result = sendRequest(fromUser.trim(), toUser.trim());
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: 'Friend request sent.' });
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

// PATCH: accept or reject a request
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;
    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'id and status required.' }, { status: 400 });
    }
    const ok = respondToRequest(id, status);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Request not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `Request ${status}.` });
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
