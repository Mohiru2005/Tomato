'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminDashboard from '@/components/AdminDashboard';
import UserDashboard from '@/components/UserDashboard';

export default function DashboardPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('tomato_org_user');
    const storedRole = localStorage.getItem('tomato_org_role');
    if (!storedUser) {
      router.push('/');
      return;
    }
    setUsername(storedUser);
    setRole(storedRole || 'user');
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50/70 via-white to-pink-50/50">
        <div className="w-8 h-8 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!username) return null;

  if (role === 'admin') {
    return <AdminDashboard adminName={username} />;
  }

  return <UserDashboard username={username} />;
}
