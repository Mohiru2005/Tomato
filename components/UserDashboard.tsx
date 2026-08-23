'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, UserPlus, Users, LogOut, Check, X,
  Send, Clock, UserCheck, Bell, MessageSquare,
  ChevronRight, Search, Shield, Edit3, Save
} from 'lucide-react';
import DirectChat from './DirectChat';
import { useRouter } from 'next/navigation';

type Section = 'profile' | 'requests' | 'friends';

interface FriendRequest {
  id: string;
  fromUser: string;
  toUser: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: string;
}

interface RegisteredUser {
  username: string;
  role: string;
  statusMsg?: string;
}

interface UserDashboardProps {
  username: string;
}

const contentVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.18 } },
};

const listItemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  }),
};

// Toast notification
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl whitespace-nowrap ${
        type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
      }`}
    >
      {message}
    </motion.div>
  );
}

export default function UserDashboard({ username }: UserDashboardProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [chatPartner, setChatPartner] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [allUsers, setAllUsers] = useState<RegisteredUser[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [sendingReq, setSendingReq] = useState(false);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [sent, setSent] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [conversationPartners, setConversationPartners] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Status message state
  const [myStatusMsg, setMyStatusMsg] = useState('Available');
  const [editingStatus, setEditingStatus] = useState(false);
  const [statusInput, setStatusInput] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  const prevIncomingCount = useRef(0);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const [usersRes, incomingRes, sentRes, friendsRes, partnersRes, unreadRes] = await Promise.all([
        fetch('/api/users'),
        fetch(`/api/requests?user=${encodeURIComponent(username)}&type=incoming`),
        fetch(`/api/requests?user=${encodeURIComponent(username)}&type=sent`),
        fetch(`/api/requests?user=${encodeURIComponent(username)}&type=friends`),
        fetch(`/api/messages?user=${encodeURIComponent(username)}&type=partners`),
        fetch(`/api/messages?user=${encodeURIComponent(username)}&type=unread`),
      ]);
      const [usersData, incomingData, sentData, friendsData, partnersData, unreadData] = await Promise.all([
        usersRes.json(), incomingRes.json(), sentRes.json(), friendsRes.json(), partnersRes.json(), unreadRes.json(),
      ]);

      if (usersData.success) {
        setAllUsers(prev => (JSON.stringify(prev) !== JSON.stringify(usersData.users) ? usersData.users : prev));
        const me = usersData.users.find((u: RegisteredUser) => u.username.toLowerCase() === username.toLowerCase());
        if (me && me.statusMsg) {
          setMyStatusMsg(me.statusMsg);
        }
      }
      if (incomingData.success) {
        const newIncoming: FriendRequest[] = incomingData.requests;
        if (newIncoming.length > prevIncomingCount.current) {
          showToast(`New friend request from ${newIncoming[newIncoming.length - 1].fromUser}!`, 'success');
        }
        prevIncomingCount.current = newIncoming.length;
        setIncoming(prev => (JSON.stringify(prev) !== JSON.stringify(newIncoming) ? newIncoming : prev));
      }
      if (sentData.success) {
        setSent(prev => (JSON.stringify(prev) !== JSON.stringify(sentData.requests) ? sentData.requests : prev));
      }
      if (friendsData.success) {
        setFriends(prev => (JSON.stringify(prev) !== JSON.stringify(friendsData.friends) ? friendsData.friends : prev));
      }
      if (partnersData.success) {
        setConversationPartners(prev => (JSON.stringify(prev) !== JSON.stringify(partnersData.partners) ? partnersData.partners : prev));
      }
      if (unreadData.success) {
        setUnreadCounts(prev => (JSON.stringify(prev) !== JSON.stringify(unreadData.unread || {}) ? (unreadData.unread || {}) : prev));
      }
    } catch {}
  }, [username]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 3000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleSaveStatus = async () => {
    if (!statusInput.trim()) return;
    setSavingStatus(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, statusMsg: statusInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMyStatusMsg(data.statusMsg);
        setEditingStatus(false);
        showToast('Status updated!', 'success');
        fetchAll();
      }
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSendRequest = async (targetUser?: string) => {
    const target = (targetUser || searchUser).trim();
    if (!target) return;
    setSendingReq(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUser: username, toUser: target }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Friend request sent to ${target}!`, 'success');
        setSearchUser('');
        fetchAll();
      } else {
        showToast(data.error || 'Failed to send request.', 'error');
      }
    } finally {
      setSendingReq(false);
    }
  };

  const handleRespond = async (id: string, status: 'accepted' | 'rejected', fromUser: string) => {
    await fetch('/api/requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    showToast(
      status === 'accepted' ? `You are now friends with ${fromUser}!` : `Rejected request.`,
      status === 'accepted' ? 'success' : 'error'
    );
    fetchAll();
  };

  const handleLogout = () => {
    localStorage.removeItem('tomato_org_user');
    localStorage.removeItem('tomato_org_role');
    router.push('/');
  };

  const otherUsers = allUsers.filter(
    u => u.username.toLowerCase() !== username.toLowerCase() && u.role !== 'admin'
  );
  const incomingCount = incoming.length;
  const adminPartners = conversationPartners.filter(p => {
    const rec = allUsers.find(u => u.username.toLowerCase() === p.toLowerCase());
    return rec?.role === 'admin' && !friends.some(f => f.toLowerCase() === p.toLowerCase());
  });

  const totalUnreadCount = Object.values(unreadCounts).reduce((acc, c) => acc + c, 0);

  const navItems: { id: Section; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
    { id: 'requests', label: 'Friend Requests', icon: <Bell className="w-4 h-4" />, badge: incomingCount },
    { id: 'friends', label: 'Friends & Chats', icon: <Users className="w-4 h-4" />, badge: totalUnreadCount || (friends.length + adminPartners.length || undefined) },
  ];

  if (chatPartner) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-screen bg-white dark:bg-slate-900">
        <DirectChat currentUser={username} partnerUser={chatPartner} onBack={() => { setChatPartner(null); fetchAll(); }} />
      </motion.div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors">
      <AnimatePresence>
        {toast && <Toast key="toast" message={toast.message} type={toast.type} />}
      </AnimatePresence>

      {/* ── Left Sidebar ── */}
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-72 flex-shrink-0 border-r border-white/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex flex-col"
      >
        {/* Identity & Top-Left Logout */}
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

          <div className="flex items-center gap-2 min-w-0">
            <div className="min-w-0 text-right">
              <p className="font-bold text-slate-900 dark:text-white text-xs leading-tight truncate">{username}</p>
              <span className="inline-block px-1.5 py-0.2 text-[8px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded-full tracking-wider">
                USER
              </span>
            </div>
            <motion.div
              whileHover={{ scale: 1.06 }}
              className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center font-black text-white text-sm shadow-md shadow-rose-500/25 flex-shrink-0"
            >
              {username.charAt(0).toUpperCase()}
            </motion.div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 border-b border-rose-100/40 dark:border-slate-800">
          {[
            { label: 'Friends', value: friends.length },
            { label: 'Sent', value: sent.length },
            { label: 'Unread', value: totalUnreadCount },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="py-3 text-center border-r border-rose-100/40 dark:border-slate-800 last:border-r-0 cursor-default"
            >
              <p className={`text-lg font-black ${label === 'Unread' && value > 0 ? 'text-amber-500 animate-pulse' : 'text-rose-600 dark:text-rose-400'}`}>
                {value}
              </p>
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-semibold transition-colors ${
                activeSection === item.id
                  ? 'bg-rose-50 dark:bg-slate-800 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span className={activeSection === item.id ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}>
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  item.id === 'friends' && totalUnreadCount > 0
                    ? 'bg-rose-500 text-white animate-pulse'
                    : activeSection === item.id
                    ? 'bg-rose-200 dark:bg-rose-900 text-rose-700 dark:text-rose-300'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
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
        <AnimatePresence mode="wait">

          {/* ── PROFILE ── */}
          {activeSection === 'profile' && (
            <motion.div
              key="profile"
              variants={contentVariants} initial="hidden" animate="show" exit="exit"
              className="flex flex-col h-full"
            >
              <div className="px-6 pt-6 pb-4 border-b border-white/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex-shrink-0">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">My Profile</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Manage your status and find people</p>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl space-y-5">
                  {/* Profile hero card */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    className="bg-white/80 dark:bg-slate-900/80 border border-rose-100/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-5"
                  >
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center font-black text-white text-4xl shadow-xl shadow-rose-500/25 flex-shrink-0">
                      {username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{username}</p>
                        <span className="px-3 py-0.5 text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded-full tracking-wider">USER</span>
                      </div>

                      {/* Status / Bio editor */}
                      <div className="mt-2">
                        {editingStatus ? (
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={statusInput}
                              onChange={(e) => setStatusInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveStatus(); }}
                              placeholder="Set your status..."
                              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-rose-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-rose-400 text-slate-800 dark:text-slate-200 flex-1"
                            />
                            <button
                              type="button"
                              onClick={handleSaveStatus}
                              disabled={savingStatus}
                              className="px-3 py-1.5 bg-rose-500 text-white rounded-xl text-xs font-bold shadow-sm"
                            >
                              {savingStatus ? '...' : <Save className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingStatus(false)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic">"{myStatusMsg}"</p>
                            <button
                              type="button"
                              onClick={() => { setStatusInput(myStatusMsg); setEditingStatus(true); }}
                              className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                              title="Edit status"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                        {friends.length} friend{friends.length !== 1 ? 's' : ''} · {sent.filter(r => r.status === 'pending').length} pending requests
                      </p>
                    </div>
                  </motion.div>

                  {/* Add friend card */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="bg-white/80 dark:bg-slate-900/80 border border-rose-100/60 dark:border-slate-800 rounded-2xl p-5 shadow-sm"
                  >
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Add a Friend</p>
                    <div className="flex gap-2 mb-4">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search by username..."
                          value={searchUser}
                          onChange={(e) => setSearchUser(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSendRequest(); }}
                          className="w-full pl-8 pr-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/80 border border-rose-200/40 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 dark:focus:ring-rose-950 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-500"
                        />
                      </div>
                      <motion.button
                        type="button"
                        onClick={() => handleSendRequest()}
                        disabled={sendingReq || !searchUser.trim()}
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl text-sm shadow-md shadow-rose-500/20 flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {sendingReq
                          ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          : <><UserPlus className="w-3.5 h-3.5" /> Add</>}
                      </motion.button>
                    </div>

                    <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                      {otherUsers.length === 0 && (
                        <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-4">No other users registered yet.</p>
                      )}
                      {otherUsers
                        .filter(u => !searchUser || u.username.toLowerCase().includes(searchUser.toLowerCase()))
                        .map((u, i) => {
                          const sentToThis = sent.find(r => r.toUser.toLowerCase() === u.username.toLowerCase());
                          const isFriend = friends.some(f => f.toLowerCase() === u.username.toLowerCase());
                          return (
                            <motion.div
                              key={u.username}
                              custom={i} variants={listItemVariants} initial="hidden" animate="show"
                              className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-rose-50/50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 border border-rose-200/40 flex items-center justify-center text-rose-600 font-bold text-sm">
                                  {u.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm text-slate-700 dark:text-slate-200 font-semibold">{u.username}</p>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500">{u.statusMsg || 'Available'}</p>
                                </div>
                              </div>
                              <div>
                                {isFriend ? (
                                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full">Friends ✓</span>
                                ) : sentToThis ? (
                                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                    sentToThis.status === 'pending' ? 'text-amber-700 bg-amber-50 dark:bg-amber-950/60'
                                    : sentToThis.status === 'accepted' ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60'
                                    : 'text-slate-400 bg-slate-100 dark:bg-slate-800'
                                  }`}>
                                    {sentToThis.status === 'pending' ? '⏳ Pending' : sentToThis.status === 'accepted' ? '✓ Accepted' : '✕ Rejected'}
                                  </span>
                                ) : (
                                  <motion.button
                                    type="button"
                                    onClick={() => handleSendRequest(u.username)}
                                    whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                                    className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-slate-800 hover:bg-rose-100 px-2.5 py-1 rounded-full transition-colors"
                                  >
                                    + Add
                                  </motion.button>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── REQUESTS ── */}
          {activeSection === 'requests' && (
            <motion.div
              key="requests"
              variants={contentVariants} initial="hidden" animate="show" exit="exit"
              className="flex flex-col h-full"
            >
              <div className="px-6 pt-6 pb-4 border-b border-white/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex-shrink-0">
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Friend Requests
                  {incomingCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="inline-flex items-center justify-center w-6 h-6 bg-rose-500 text-white text-xs font-bold rounded-full"
                    >
                      {incomingCount}
                    </motion.span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Manage who connects with you</p>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl space-y-6">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      Incoming
                      {incomingCount > 0 && <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[9px] font-bold">{incomingCount}</span>}
                    </p>
                    {incoming.length === 0 ? (
                      <div className="bg-white/80 dark:bg-slate-900/80 border border-rose-100/40 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                        No incoming friend requests.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {incoming.map((req, i) => (
                          <motion.div
                            key={req.id}
                            custom={i} variants={listItemVariants} initial="hidden" animate="show"
                            className="bg-white/90 dark:bg-slate-900/90 border border-rose-100/60 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm"
                          >
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 border border-rose-200/40 flex items-center justify-center font-bold text-rose-600 text-base flex-shrink-0">
                              {req.fromUser.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{req.fromUser}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">Sent you a friend request</p>
                            </div>
                            <div className="flex gap-2">
                              <motion.button
                                type="button"
                                onClick={() => handleRespond(req.id, 'accepted', req.fromUser)}
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold rounded-xl transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" /> Accept
                              </motion.button>
                              <motion.button
                                type="button"
                                onClick={() => handleRespond(req.id, 'rejected', req.fromUser)}
                                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </motion.button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Sent Requests</p>
                    {sent.length === 0 ? (
                      <div className="bg-white/80 dark:bg-slate-900/80 border border-rose-100/40 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                        No sent requests yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sent.map((req, i) => (
                          <motion.div
                            key={req.id}
                            custom={i} variants={listItemVariants} initial="hidden" animate="show"
                            className="bg-white/90 dark:bg-slate-900/90 border border-rose-100/60 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm"
                          >
                            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 text-base flex-shrink-0">
                              {req.toUser.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{req.toUser}</p>
                            </div>
                            <span className={`text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1 ${
                              req.status === 'pending' ? 'text-amber-700 bg-amber-50 dark:bg-amber-950/60'
                              : req.status === 'accepted' ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60'
                              : 'text-red-600 bg-red-50 dark:bg-red-950/60'
                            }`}>
                              {req.status === 'pending' && <Clock className="w-3 h-3" />}
                              {req.status === 'accepted' && <UserCheck className="w-3 h-3" />}
                              {req.status === 'rejected' && <X className="w-3 h-3" />}
                              <span className="capitalize">{req.status}</span>
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── FRIENDS & CHATS ── */}
          {activeSection === 'friends' && (
            <motion.div
              key="friends"
              variants={contentVariants} initial="hidden" animate="show" exit="exit"
              className="flex flex-col h-full"
            >
              <div className="px-6 pt-6 pb-4 border-b border-white/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex-shrink-0">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Friends & Chats</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{friends.length} friend{friends.length !== 1 ? 's' : ''} · click to message</p>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl space-y-5">
                  {/* Admin messages */}
                  {adminPartners.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Messages from Admin</p>
                      <div className="space-y-2">
                        {adminPartners.map((partner, i) => {
                          const unread = unreadCounts[partner] || 0;
                          return (
                            <motion.div
                              key={partner}
                              custom={i} variants={listItemVariants} initial="hidden" animate="show"
                              onClick={() => setChatPartner(partner)}
                              whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(244,63,94,0.14)' }}
                              whileTap={{ scale: 0.99 }}
                              className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-slate-800 dark:to-rose-950/40 border border-rose-200/60 dark:border-rose-900/60 rounded-2xl p-4 flex items-center gap-4 shadow-sm cursor-pointer transition-shadow"
                            >
                              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center font-bold text-white text-lg shadow-md shadow-rose-500/20 flex-shrink-0">
                                {partner.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{partner}</p>
                                  <span className="text-[9px] font-black bg-rose-600 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                    <Shield className="w-2.5 h-2.5" /> ADMIN
                                  </span>
                                  {unread > 0 && (
                                    <span className="px-2 py-0.5 text-[10px] font-black bg-rose-500 text-white rounded-full animate-bounce">
                                      {unread} NEW
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5">View conversation →</p>
                              </div>
                              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-slate-800 flex items-center justify-center">
                                <MessageSquare className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Friends grid */}
                  <div>
                    {(friends.length > 0 || adminPartners.length === 0) && (
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                        Friends · {friends.length}
                      </p>
                    )}
                    {friends.length === 0 && adminPartners.length === 0 ? (
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white/80 dark:bg-slate-900/80 border border-rose-100/40 dark:border-slate-800 rounded-3xl p-14 text-center flex flex-col items-center gap-3"
                      >
                        <Users className="w-12 h-12 text-rose-200 dark:text-rose-900" />
                        <div>
                          <p className="font-bold text-slate-500 dark:text-slate-400">No friends yet</p>
                          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Go to My Profile to add friends!</p>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {friends.map((friend, i) => {
                          const unread = unreadCounts[friend] || 0;
                          const partnerInfo = allUsers.find(u => u.username.toLowerCase() === friend.toLowerCase());
                          return (
                            <motion.div
                              key={friend}
                              custom={i} variants={listItemVariants} initial="hidden" animate="show"
                              onClick={() => setChatPartner(friend)}
                              whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(244,63,94,0.12)' }}
                              whileTap={{ scale: 0.99 }}
                              className="bg-white/90 dark:bg-slate-900/90 border border-rose-100/60 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-sm cursor-pointer group transition-shadow relative"
                            >
                              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 dark:from-slate-800 dark:to-slate-800 border border-rose-200/40 dark:border-slate-700 flex items-center justify-center font-bold text-rose-600 dark:text-rose-400 text-lg flex-shrink-0">
                                {friend.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{friend}</p>
                                  {unread > 0 && (
                                    <span className="w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce">
                                      {unread}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                  {partnerInfo?.statusMsg || 'Click to message'}
                                </p>
                              </div>
                              <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-slate-800 group-hover:bg-rose-100 dark:group-hover:bg-slate-700 flex items-center justify-center transition-colors">
                                <Send className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
