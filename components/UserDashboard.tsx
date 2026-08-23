'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, UserPlus, Users, LogOut, Check, X,
  Send, Clock, UserCheck, Bell, MessageSquare,
  ChevronRight, Search, Shield, Edit3, Save, Bookmark, Sparkles,
  MessageCircle, ShieldCheck, PanelLeftClose, PanelLeftOpen
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
  const [activeSection, setActiveSection] = useState<Section>('friends');
  const [chatPartner, setChatPartner] = useState<string | null>('Saved Messages');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
        usersRes.json(),
        incomingRes.json(),
        sentRes.json(),
        friendsRes.json(),
        partnersRes.json(),
        unreadRes.json(),
      ]);

      if (usersData.success && Array.isArray(usersData.users)) {
        setAllUsers(usersData.users);
        const me = usersData.users.find((u: RegisteredUser) => u.username.toLowerCase() === username.toLowerCase());
        if (me?.statusMsg) setMyStatusMsg(me.statusMsg);
      }

      if (incomingData.success && Array.isArray(incomingData.requests)) {
        const newCount = incomingData.requests.length;
        if (newCount > prevIncomingCount.current && prevIncomingCount.current !== 0) {
          showToast(`New friend request from ${incomingData.requests[0]?.fromUser}!`, 'success');
        }
        prevIncomingCount.current = newCount;
        setIncoming(incomingData.requests);
      }

      if (sentData.success && Array.isArray(sentData.requests)) {
        setSent(sentData.requests);
      }

      if (friendsData.success && Array.isArray(friendsData.friends)) {
        setFriends(friendsData.friends);
      }

      if (partnersData.success && Array.isArray(partnersData.partners)) {
        setConversationPartners(partnersData.partners);
      }

      if (unreadData.success && unreadData.unread) {
        setUnreadCounts(unreadData.unread);
      }
    } catch {}
  }, [username]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 2500);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleSaveStatus = async () => {
    if (!statusInput.trim() || savingStatus) return;
    setSavingStatus(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, statusMsg: statusInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMyStatusMsg(statusInput.trim());
        setEditingStatus(false);
        showToast('Status message updated!', 'success');
      } else {
        showToast('Failed to update status.', 'error');
      }
    } catch {
      showToast('Network error.', 'error');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSendRequest = async (targetUsername?: string) => {
    const target = targetUsername || searchUser.trim();
    if (!target) return;

    if (target.toLowerCase() === username.toLowerCase()) {
      showToast('Cannot send a friend request to yourself.', 'error');
      return;
    }

    const exists = allUsers.some(u => u.username.toLowerCase() === target.toLowerCase());
    if (!exists) {
      showToast(`User "${target}" not found. Check the username and try again.`, 'error');
      return;
    }

    setSendingReq(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUser: username, toUser: target }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`User found! Friend request sent to ${target}!`, 'success');
        setSearchUser('');
        fetchAll();
      } else {
        showToast(data.error || 'Failed to send request.', 'error');
      }
    } catch {
      showToast('Network error.', 'error');
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
    { id: 'friends', label: 'Chats', icon: <MessageSquare className="w-4 h-4" />, badge: totalUnreadCount },
    { id: 'requests', label: 'Requests', icon: <Bell className="w-4 h-4" />, badge: incomingCount },
    { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors overflow-hidden">
      <AnimatePresence>
        {toast && <Toast key="toast" message={toast.message} type={toast.type} />}
      </AnimatePresence>

      {/* ── Mobile Top Header ── */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-rose-100/60 dark:border-slate-800 z-30">
        <motion.button
          type="button"
          onClick={handleLogout}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-red-600 bg-slate-100 dark:bg-slate-800 rounded-xl"
        >
          <LogOut className="w-3.5 h-3.5" /> Log Out
        </motion.button>

        <div className="flex items-center gap-2">
          <span className="font-black text-sm text-slate-900 dark:text-white">{username}</span>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center font-black text-white text-xs shadow-md">
            {username.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── Desktop Left Navigation Rail (Open / Closed) ── */}
      <motion.div
        animate={{ width: sidebarOpen ? 256 : 72 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="hidden md:flex flex-shrink-0 border-r border-white/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex-col overflow-hidden z-20"
      >
        {/* Header & Open/Close Toggle Button */}
        <div className="px-4 py-3.5 border-b border-rose-100/40 dark:border-slate-800 flex items-center justify-between">
          <motion.button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title={sidebarOpen ? "Close dashboard navigation" : "Open dashboard navigation"}
          >
            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5 text-rose-500" />}
          </motion.button>

          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 min-w-0"
            >
              <div className="min-w-0 text-right">
                <p className="font-bold text-slate-900 dark:text-white text-xs leading-tight truncate">{username}</p>
                <span className="inline-block px-1.5 py-0.2 text-[8px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded-full tracking-wider">
                  USER
                </span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center font-black text-white text-sm shadow-md flex-shrink-0">
                {username.charAt(0).toUpperCase()}
              </div>
            </motion.div>
          )}
        </div>

        {/* Stats strip (Expanded mode) */}
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-3 border-b border-rose-100/40 dark:border-slate-800"
          >
            {[
              { label: 'Friends', value: friends.length },
              { label: 'Sent', value: sent.length },
              { label: 'Unread', value: totalUnreadCount },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="py-2.5 text-center border-r border-rose-100/40 dark:border-slate-800 last:border-r-0 cursor-default"
              >
                <p className={`text-base font-black ${label === 'Unread' && value > 0 ? 'text-amber-500 animate-pulse' : 'text-rose-600 dark:text-rose-400'}`}>
                  {value}
                </p>
                <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">{label}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Nav Items */}
        <nav className="flex-1 p-2.5 space-y-1.5">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center gap-3 ${sidebarOpen ? 'px-3.5 py-3' : 'px-3 py-3 justify-center'} rounded-2xl text-sm font-semibold transition-colors relative ${
                activeSection === item.id
                  ? 'bg-rose-50 dark:bg-slate-800 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <span className={activeSection === item.id ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}>
                {item.icon}
              </span>

              {sidebarOpen && <span className="flex-1 text-left">{item.label}</span>}

              {item.badge !== undefined && item.badge > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  !sidebarOpen ? 'absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center bg-rose-500 text-white text-[9px]' :
                  item.id === 'friends' && totalUnreadCount > 0
                    ? 'bg-rose-500 text-white animate-pulse'
                    : activeSection === item.id
                    ? 'bg-rose-200 dark:bg-rose-900 text-rose-700 dark:text-rose-300'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {item.badge}
                </span>
              )}
            </motion.button>
          ))}
        </nav>

        {/* Bottom Log Out (Expanded or Collapsed) */}
        <div className="p-3 border-t border-rose-100/40 dark:border-slate-800">
          <motion.button
            type="button"
            onClick={handleLogout}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`w-full flex items-center gap-2 ${sidebarOpen ? 'px-3.5 py-2.5 justify-start' : 'p-2.5 justify-center'} text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-slate-800/80 rounded-xl transition-colors`}
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span>Log Out</span>}
          </motion.button>
        </div>
      </motion.div>

      {/* ── Mobile Bottom Navigation Bar ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-rose-100/60 dark:border-slate-800 flex items-center justify-around px-2 py-2 shadow-lg">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveSection(item.id)}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all relative ${
              activeSection === item.id
                ? 'text-rose-600 dark:text-rose-400 font-bold'
                : 'text-slate-400 dark:text-slate-500 font-medium'
            }`}
          >
            <div className="relative">
              {item.icon}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px]">{item.label}</span>
          </button>
        ))}
      </div>

      {/* ── Main View Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden pb-16 md:pb-0">
        <AnimatePresence mode="wait">

          {/* ── PROFILE ── */}
          {activeSection === 'profile' && (
            <motion.div
              key="profile"
              variants={contentVariants} initial="hidden" animate="show" exit="exit"
              className="flex flex-col h-full overflow-y-auto p-6"
            >
              <div className="max-w-2xl w-full mx-auto space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white/90 dark:bg-slate-900/90 border border-rose-100/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex items-start gap-5"
                >
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center font-black text-white text-4xl shadow-xl shadow-rose-500/25 flex-shrink-0">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{username}</p>
                      <span className="px-3 py-0.5 text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded-full tracking-wider">USER</span>
                    </div>

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

                {/* Add Friend Card */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="bg-white/80 dark:bg-slate-900/80 border border-rose-100/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm"
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
                    {!searchUser.trim() ? (
                      <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-4 font-medium">
                        Type a username above to search and send a friend request.
                      </p>
                    ) : (() => {
                      const matches = otherUsers.filter(u => u.username.toLowerCase().includes(searchUser.trim().toLowerCase()));
                      if (matches.length === 0) {
                        return (
                          <p className="text-center text-rose-500 dark:text-rose-400 text-xs py-4 font-medium">
                            No registered user matching "{searchUser}". Press Enter or Add to search.
                          </p>
                        );
                      }
                      return matches.map((u) => {
                        const sentToThis = sent.find(r => r.toUser.toLowerCase() === u.username.toLowerCase());
                        const isFriend = friends.some(f => f.toLowerCase() === u.username.toLowerCase());
                        return (
                          <div
                            key={u.username}
                            className="flex items-center justify-between py-2 px-3 rounded-xl bg-rose-50/40 dark:bg-slate-800/40 border border-rose-100/60 dark:border-slate-800 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                {u.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm text-slate-800 dark:text-slate-200 font-bold">{u.username}</p>
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
                                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  className="px-3.5 py-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1"
                                >
                                  <UserPlus className="w-3.5 h-3.5" /> Send Request
                                </motion.button>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ── REQUESTS ── */}
          {activeSection === 'requests' && (
            <motion.div
              key="requests"
              variants={contentVariants} initial="hidden" animate="show" exit="exit"
              className="flex flex-col h-full overflow-y-auto p-6"
            >
              <div className="max-w-2xl w-full mx-auto space-y-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Friend Requests</span>
                    {incomingCount > 0 && (
                      <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-xs font-bold">{incomingCount}</span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Manage who connects with you</p>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Incoming</p>
                  {incoming.length === 0 ? (
                    <div className="bg-white/80 dark:bg-slate-900/80 border border-rose-100/40 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                      No incoming friend requests.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {incoming.map((req) => (
                        <div
                          key={req.id}
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
                        </div>
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
                      {sent.map((req) => (
                        <div
                          key={req.id}
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
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── WHATSAPP-STYLE 2-COLUMN SPLIT MESSENGER ── */}
          {activeSection === 'friends' && (
            <motion.div
              key="friends"
              variants={contentVariants} initial="hidden" animate="show" exit="exit"
              className="flex flex-1 h-full overflow-hidden"
            >
              {/* ── LEFT COLUMN: Contacts & Favorites (Hidden on Mobile when chat is active) ── */}
              <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex flex-col h-full ${
                chatPartner ? 'hidden md:flex' : 'flex'
              }`}>
                {/* Header with Dashboard Collapse Toggle Button */}
                <div className="px-5 py-4 border-b border-rose-100/60 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Tomato Messenger</span>
                      <Sparkles className="w-4 h-4 text-rose-500" />
                    </h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Click any contact to chat live</p>
                  </div>

                  <motion.button
                    type="button"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors hidden md:block"
                    title={sidebarOpen ? "Collapse navigation sidebar" : "Expand navigation sidebar"}
                  >
                    {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4 text-rose-500" />}
                  </motion.button>
                </div>

                {/* Favorites "Stories" Avatar Carousel */}
                <div className="px-5 py-3 border-b border-slate-200/60 dark:border-slate-800 flex items-center gap-3 overflow-x-auto scrollbar-none flex-shrink-0">
                  {/* Saved Messages Entry */}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setChatPartner('Saved Messages')}
                    className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0"
                  >
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md ring-2 ${
                      chatPartner === 'Saved Messages' ? 'ring-indigo-500' : 'ring-indigo-300/40'
                    }`}>
                      <Bookmark className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Saved</span>
                  </motion.div>

                  {/* Friends Avatars */}
                  {friends.map((friend) => {
                    const unread = unreadCounts[friend] || 0;
                    const isSelected = chatPartner?.toLowerCase() === friend.toLowerCase();
                    return (
                      <motion.div
                        key={friend}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setChatPartner(friend)}
                        className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0 relative"
                      >
                        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center font-black text-white text-base shadow-md ring-2 ${
                          unread > 0 ? 'ring-rose-500 animate-pulse' : isSelected ? 'ring-slate-900 dark:ring-white' : 'ring-emerald-400/80'
                        }`}>
                          {friend.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[48px]">{friend}</span>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Contacts & Conversations List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                  {/* Saved Messages Entry Card */}
                  <motion.div
                    onClick={() => setChatPartner('Saved Messages')}
                    whileHover={{ x: 3 }}
                    className={`p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all border ${
                      chatPartner === 'Saved Messages'
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 shadow-sm'
                        : 'bg-white/60 dark:bg-slate-800/60 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg shadow-md flex-shrink-0">
                      <Bookmark className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-900 dark:text-white text-sm truncate">Saved Messages</p>
                        <span className="text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded-full">SELF</span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">Personal notes & media storage</p>
                    </div>
                  </motion.div>

                  {/* Admin Messages */}
                  {adminPartners.map((partner) => {
                    const unread = unreadCounts[partner] || 0;
                    const isSelected = chatPartner?.toLowerCase() === partner.toLowerCase();
                    return (
                      <motion.div
                        key={partner}
                        onClick={() => setChatPartner(partner)}
                        whileHover={{ x: 3 }}
                        className={`p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-rose-50/90 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900 shadow-sm'
                            : 'bg-white/60 dark:bg-slate-800/60 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center font-bold text-white text-base shadow-md flex-shrink-0">
                          {partner.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{partner}</p>
                            {unread > 0 && (
                              <span className="px-1.5 py-0.5 text-[9px] font-black bg-rose-500 text-white rounded-full animate-bounce">
                                {unread}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold truncate mt-0.5">System Administrator</p>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Friends List */}
                  {friends.length === 0 && adminPartners.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                      No friends added yet. Go to My Profile to add friends!
                    </div>
                  ) : (
                    friends.map((friend) => {
                      const unread = unreadCounts[friend] || 0;
                      const isSelected = chatPartner?.toLowerCase() === friend.toLowerCase();
                      return (
                        <motion.div
                          key={friend}
                          onClick={() => setChatPartner(friend)}
                          whileHover={{ x: 3 }}
                          className={`p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all border ${
                            isSelected
                              ? 'bg-rose-50/90 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900 shadow-sm'
                              : 'bg-white/60 dark:bg-slate-800/60 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="relative flex-shrink-0">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center font-black text-white text-base shadow-md">
                              {friend.charAt(0).toUpperCase()}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{friend}</p>
                              {unread > 0 && (
                                <span className="px-1.5 py-0.5 text-[9px] font-black bg-rose-500 text-white rounded-full animate-bounce">
                                  {unread}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">Click to chat</p>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ── RIGHT COLUMN: Embedded Live Chat (WhatsApp Style) ── */}
              <div className={`flex-1 flex flex-col h-full min-w-0 ${
                !chatPartner ? 'hidden md:flex' : 'flex'
              }`}>
                {chatPartner ? (
                  <DirectChat
                    currentUser={username}
                    partnerUser={chatPartner}
                    onBack={() => setChatPartner(null)}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-slate-950/50 select-none">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-xl shadow-rose-500/20 mb-4">
                      <MessageCircle className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">Tomato Web Messenger</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-2 leading-relaxed">
                      Select any contact on the left to start messaging in real-time.
                    </p>
                    <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-900/60 px-4 py-2 rounded-full">
                      <ShieldCheck className="w-4 h-4 text-rose-500" />
                      <span>End-to-end encrypted messaging</span>
                    </div>
                  </div>
                )}
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
