import { NextResponse } from 'next/server';
import { getUsers, deleteUser, updateUserStatus } from '@/lib/usersDb';
import { deleteAllMessagesForUser } from '@/lib/messagesDb';
import { deleteAllRequestsForUser } from '@/lib/requestsDb';

export async function GET() {
  const users = getUsers();
  // Don't expose PINs
  const safe = users.map(({ username, role, createdAt, statusMsg }) => ({
    username,
    role,
    createdAt,
    statusMsg: statusMsg || 'Available',
  }));
  return NextResponse.json({ success: true, users: safe });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { username, statusMsg } = body;

    if (!username || statusMsg === undefined) {
      return NextResponse.json({ success: false, error: 'Username and statusMsg required.' }, { status: 400 });
    }

    const updated = updateUserStatus(username.trim(), String(statusMsg).trim());
    if (!updated) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, statusMsg: String(statusMsg).trim() });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update status.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json({ success: false, error: 'Username required.' }, { status: 400 });
    }

    const cleanName = String(username).trim();

    const deleted = deleteUser(cleanName);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete this user (protected or not found).' },
        { status: 400 }
      );
    }

    // Clean up all messages and friend requests associated with the deleted user
    deleteAllMessagesForUser(cleanName);
    deleteAllRequestsForUser(cleanName);

    return NextResponse.json({ success: true, message: `User "${cleanName}" and all their data deleted.` });
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
