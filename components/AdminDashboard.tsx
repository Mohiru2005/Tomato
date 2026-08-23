'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Trash2, MessageSquare, Shield, LogOut,
  RefreshCw, Megaphone, Settings, ChevronRight, Search
} from 'lucide-react';
import DirectChat from './DirectChat';
import { useRouter } from 'next/navigation';

type AdminSection = 'users' | 'announcements' | 'settings';

interface User {
  username: string;
  role: 'admin' | 'user';
  createdAt: string;
  statusMsg?: string;
}

interface AdminDashboardProps {
  adminName: string;
}

const sidebarVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

const contentVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function AdminDashboard({ adminName }: AdminDashboardProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<AdminSection>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatPartner, setChatPartner] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    setDeleting(username);
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) => prev.filter((u) => u.username !== username));
        if (chatPartner === username) setChatPartner(null);
      }
    } finally {
      setDeleting(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tomato_org_user');
    localStorage.removeItem('tomato_org_role');
    router.push('/');
  };

  const allOtherUsers = users.filter(u => u.username.toLowerCase() !== adminName.toLowerCase());
  const filteredUsers = allOtherUsers.filter(u =>
    !search || u.username.toLowerCase().includes(search.toLowerCase())
  );

  const navItems: { id: AdminSection; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" />, badge: allOtherUsers.length },
    { id: 'announcements', label: 'Announcements', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  if (chatPartner) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-screen bg-white dark:bg-slate-900"
      >
        <DirectChat currentUser={adminName} partnerUser={chatPartner} onBack={() => setChatPartner(null)} />
      </motion.div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors">

      {/* ── Left Sidebar ── */}
      <motion.div
        variants={sidebarVariants} initial="hidden" animate="show"
        className="w-72 flex-shrink-0 border-r border-white/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex flex-col"
      >
        {/* Admin identity & Top-Left Logout */}
        <div className="px-5 pt-4 pb-3 border-b border-rose-100/40 dark:border-slate-800 flex items-center justify-between">
          <motion.button
            type="button"
            onClick={handleLogout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-slate-800/80 rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Log Out
          </motion.button>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="font-bold text-slate-900 dark:text-white text-xs leading-tight">{adminName}</p>
              <span className="inline-block px-1.5 py-0.2 text-[8px] font-black bg-rose-600 text-white rounded-full tracking-widest">
                ADMIN
              </span>
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md shadow-rose-500/30 flex-shrink-0"
            >
              <Shield className="w-4 h-4 text-white" />
            </motion.div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 border-b border-rose-100/40 dark:border-slate-800">
          <div className="py-3 text-center border-r border-rose-100/40 dark:border-slate-800">
            <p className="text-xl font-black text-rose-600 dark:text-rose-400">{allOtherUsers.length}</p>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Users</p>
          </div>
          <div className="py-3 text-center">
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">Live</p>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Status</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all ${
                activeSection === item.id
                  ? 'bg-rose-50 dark:bg-slate-800 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span className={activeSection === item.id ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}>{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeSection === item.id ? 'bg-rose-200 dark:bg-rose-900 text-rose-700 dark:text-rose-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {item.badge}
                </span>
              )}
              {activeSection === item.id && (
                <ChevronRight className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              )}
            </motion.button>
          ))}
        </nav>
      </motion.div>

      {/* ── Right Panel ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── USERS ── */}
        <AnimatePresence mode="wait">
          {activeSection === 'users' && (
            <motion.div
              key="users"
              variants={contentVariants} initial="hidden" animate="show" exit="hidden"
              className="flex flex-col h-full"
            >
              <div className="px-6 pt-6 pb-4 border-b border-white/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">All Users</h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{allOtherUsers.length} registered accounts</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-8 pr-3 py-2 text-xs bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 dark:focus:ring-rose-950 transition-all w-44"
                    />
                  </div>
                  <motion.button
                    type="button"
                    onClick={fetchUsers}
                    whileHover={{ rotate: 180 }}
                    transition={{ duration: 0.4 }}
                    className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 h-24 shimmer" />
                    ))}
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 dark:text-slate-500">
                    <Users className="w-12 h-12 text-rose-200 dark:text-rose-900" />
                    <p className="font-semibold text-slate-500 dark:text-slate-400">No users found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredUsers.map((user, i) => (
                      <motion.div
                        key={user.username}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="show"
                        whileHover={{ y: -3, shadow: '0 8px 30px rgba(244,63,94,0.12)' }}
                        className="bg-white/90 dark:bg-slate-900/90 border border-rose-100/60 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-rose-200/80 dark:hover:border-slate-700 transition-all group"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 dark:from-slate-800 dark:to-slate-800 border border-rose-200/40 dark:border-slate-700 flex items-center justify-center font-bold text-rose-600 dark:text-rose-400 text-base flex-shrink-0">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{user.username}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                              {user.statusMsg || 'Available'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <motion.button
                            type="button"
                            onClick={() => setChatPartner(user.username)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Chat
                          </motion.button>
                          <motion.button
                            type="button"
                            onClick={() => handleDelete(user.username)}
                            disabled={deleting === user.username}
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                          >
                            {deleting === user.username
                              ? <div className="w-3.5 h-3.5 border border-red-300 border-t-red-600 rounded-full animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />}
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── ANNOUNCEMENTS ── */}
          {activeSection === 'announcements' && (
            <motion.div
              key="announcements"
              variants={contentVariants} initial="hidden" animate="show" exit="hidden"
              className="flex-1 flex flex-col items-center justify-center gap-5 p-8"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                className="w-24 h-24 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center shadow-lg shadow-amber-500/10"
              >
                <Megaphone className="w-11 h-11 text-amber-400" />
              </motion.div>
              <div className="text-center">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">Announcements</h2>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 max-w-xs">Broadcast messages to all users. Coming soon!</p>
              </div>
              <span className="px-5 py-2 text-xs font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-full tracking-widest">COMING SOON</span>
            </motion.div>
          )}

          {/* ── SETTINGS ── */}
          {activeSection === 'settings' && (
            <motion.div
              key="settings"
              variants={contentVariants} initial="hidden" animate="show" exit="hidden"
              className="flex-1 flex flex-col items-center justify-center gap-5 p-8"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, rotate: [0, 15, -15, 0] }}
                transition={{ delay: 0.1, duration: 0.6 }}
                className="w-24 h-24 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-lg"
              >
                <Settings className="w-11 h-11 text-slate-400 dark:text-slate-500" />
              </motion.div>
              <div className="text-center">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">Settings</h2>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 max-w-xs">App configuration & preferences. Coming soon!</p>
              </div>
              <span className="px-5 py-2 text-xs font-black bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full tracking-widest">COMING SOON</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
