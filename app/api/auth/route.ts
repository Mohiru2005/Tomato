import { NextResponse } from 'next/server';
import { validateUser, saveUser } from '@/lib/usersDb';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, username, pin } = body;

    if (!username || !pin) {
      return NextResponse.json(
        { success: false, error: 'User and PIN are required.' },
        { status: 400 }
      );
    }

    const cleanUser = String(username).trim();
    const cleanPin = String(pin).trim();

    if (action === 'signup') {
      const result = await saveUser(cleanUser, cleanPin);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message: 'Account created successfully!',
        user: { username: cleanUser, role: result.user?.role },
      });
    } else {
      const user = await validateUser(cleanUser, cleanPin);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Invalid User or PIN.' },
          { status: 401 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Logged in successfully!',
        user: { username: user.username, role: user.role },
      });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
