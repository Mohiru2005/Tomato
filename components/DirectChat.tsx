'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Trash2, ArrowLeft, MessageCircle, Smile,
  Image as ImageIcon, Info, X, Check, Palette, User, Shield, LogOut
} from 'lucide-react';

interface Reaction {
  emoji: string;
  users: string[];
}

interface ChatMessage {
  id: string;
  fromUser: string;
  toUser: string;
  text: string;
  attachment?: string;
  timestamp: string;
  read?: boolean;
  reactions?: Reaction[];
}

interface DirectChatProps {
  currentUser: string;
  partnerUser: string;
  onBack: () => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

type ThemeColor = 'rose' | 'indigo' | 'emerald' | 'amber' | 'violet';

const THEME_STYLES: Record<ThemeColor, { name: string; bgGrad: string; bubbleBg: string; textAccent: string; borderAccent: string }> = {
  rose: {
    name: 'Rose Pink',
    bgGrad: 'from-rose-500 to-pink-500',
    bubbleBg: 'bg-gradient-to-br from-rose-500 to-pink-500 text-white',
    textAccent: 'text-rose-600 dark:text-rose-400',
    borderAccent: 'border-rose-200 dark:border-rose-900',
  },
  indigo: {
    name: 'Royal Indigo',
    bgGrad: 'from-indigo-500 to-blue-600',
    bubbleBg: 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white',
    textAccent: 'text-indigo-600 dark:text-indigo-400',
    borderAccent: 'border-indigo-200 dark:border-indigo-900',
  },
  emerald: {
    name: 'Emerald Green',
    bgGrad: 'from-emerald-500 to-teal-600',
    bubbleBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
    textAccent: 'text-emerald-600 dark:text-emerald-400',
    borderAccent: 'border-emerald-200 dark:border-emerald-900',
  },
  amber: {
    name: 'Sunset Amber',
    bgGrad: 'from-amber-500 to-orange-500',
    bubbleBg: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white',
    textAccent: 'text-amber-600 dark:text-amber-400',
    borderAccent: 'border-amber-200 dark:border-amber-900',
  },
  violet: {
    name: 'Deep Violet',
    bgGrad: 'from-violet-600 to-purple-600',
    bubbleBg: 'bg-gradient-to-br from-violet-600 to-purple-600 text-white',
    textAccent: 'text-violet-600 dark:text-violet-400',
    borderAccent: 'border-violet-200 dark:border-violet-900',
  },
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function DirectChat({ currentUser, partnerUser, onBack }: DirectChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showRightDrawer, setShowRightDrawer] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ThemeColor>('rose');
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevCountRef = useRef(0);

  const isSavedMessages = partnerUser.toLowerCase() === currentUser.toLowerCase() || partnerUser.toLowerCase() === 'saved messages';
  const displayPartnerName = isSavedMessages ? 'Saved Messages' : partnerUser;

  const theme = THEME_STYLES[activeTheme];

  const scrollToBottom = useCallback((instant = false) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
    }, 40);
  }, []);

  const fetchMessages = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const res = await fetch(
        `/api/messages?userA=${encodeURIComponent(currentUser)}&userB=${encodeURIComponent(partnerUser)}&reader=${encodeURIComponent(currentUser)}`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages((prev) => {
          const updatedJson = JSON.stringify(data.messages);
          const prevJson = JSON.stringify(prev);
          if (updatedJson !== prevJson) {
            const isInitialLoad = prevCountRef.current === 0;
            prevCountRef.current = data.messages.length;
            scrollToBottom(isInitialLoad);
            return data.messages;
          }
          return prev;
        });
      }
    } catch {}
  }, [currentUser, partnerUser, scrollToBottom]);

  useEffect(() => {
    prevCountRef.current = 0;
    setMessages([]);
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [currentUser, partnerUser, fetchMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true);
    }
  }, [messages.length, scrollToBottom]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert('File size too large. Please select an image under 4MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachment(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !attachment) || sending) return;

    const text = inputText.trim();
    const currentAtt = attachment;
    setInputText('');
    setAttachment(null);
    setShowEmojiPicker(false);
    setSending(true);

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUser: currentUser,
          toUser: partnerUser,
          text,
          attachment: currentAtt || undefined,
        }),
      });
      await fetchMessages();
    } finally {
      setSending(false);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        inputRef.current?.blur();
      } else {
        inputRef.current?.focus();
      }
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    setActiveReactionMsgId(null);
    try {
      await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, username: currentUser, emoji }),
      });
      fetchMessages();
    } catch {}
  };

  const handleClear = async () => {
    if (!confirm('Clear this entire conversation?')) return;
    await fetch('/api/messages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userA: currentUser, userB: partnerUser }),
    });
    setMessages([]);
    prevCountRef.current = 0;
  };

  const handleLogout = () => {
    localStorage.removeItem('tomato_org_user');
    localStorage.removeItem('tomato_org_role');
    window.location.href = '/';
  };

  // Collect all shared images for Tomato Media Drawer
  const sharedMedia = messages.filter((m) => m.attachment);

  return (
    <div className="flex h-[100dvh] md:h-full bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 transition-colors relative overflow-hidden">
      
      {/* Central Chat View */}
      <div className="flex-1 flex flex-col min-w-0 h-full">

        {/* Top Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl flex-shrink-0 z-10"
        >
          <div className="flex items-center gap-3 min-w-0">
            <motion.button
              type="button"
              onClick={onBack}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.button>

            <div className="relative">
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${theme.bgGrad} flex items-center justify-center font-black text-white text-base shadow-md`}>
                {displayPartnerName.charAt(0).toUpperCase()}
              </div>
              {!isSavedMessages && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900" />
              )}
            </div>

            <div className="min-w-0">
              <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{displayPartnerName}</p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                {isSavedMessages ? 'Personal Cloud Notes' : 'Active now'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <motion.button
              type="button"
              onClick={() => setShowRightDrawer(!showRightDrawer)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className={`p-2 rounded-xl transition-colors ${
                showRightDrawer
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Tomato Info & Shared Media"
            >
              <Info className="w-5 h-5" />
            </motion.button>

            <motion.button
              type="button"
              onClick={handleClear}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Clear conversation"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>

            <motion.button
              type="button"
              onClick={handleLogout}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className="hidden sm:flex p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Log Out"
            >
              <LogOut className="w-4 h-4 text-red-500" />
            </motion.button>
          </div>
        </motion.div>

        {/* Messages Area */}
        <div
          onClick={() => inputRef.current?.blur()}
          className="flex-1 overflow-y-auto px-4 py-5 space-y-3"
        >
          <AnimatePresence initial={false}>
            {messages.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full gap-4 text-slate-400 select-none py-12"
              >
                <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  <MessageCircle className={`w-7 h-7 ${theme.textAccent}`} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-600 dark:text-slate-300">
                    {isSavedMessages ? 'Saved Messages Note' : 'Start the conversation'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {isSavedMessages
                      ? 'Save notes, links, or media for yourself.'
                      : <>Say hello to <span className={`font-bold ${theme.textAccent}`}>{partnerUser}</span> 👋</>}
                  </p>
                </div>
              </motion.div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.fromUser.toLowerCase() === currentUser.toLowerCase();
                const prevMsg = messages[idx - 1];
                const isGrouped = prevMsg && prevMsg.fromUser === msg.fromUser;
                const isPickerOpen = activeReactionMsgId === msg.id;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: isMe ? 16 : -16, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-1' : 'mt-3'} group relative`}
                  >
                    {!isMe && !isGrouped && (
                      <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${theme.bgGrad} flex items-center justify-center font-black text-white text-xs mr-2 flex-shrink-0 mt-0.5 shadow-sm`}>
                        {msg.fromUser.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {!isMe && isGrouped && <div className="w-7 mr-2 flex-shrink-0" />}

                    <div className="max-w-[80%] sm:max-w-[70%] relative">
                      {/* Reaction quick bar */}
                      <div className={`absolute top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-full px-2 py-1 z-10 ${
                        isMe ? '-left-24' : '-right-24'
                      }`}>
                        {QUICK_EMOJIS.slice(0, 4).map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className="hover:scale-125 transition-transform text-xs p-0.5"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>

                      {/* Message Bubble */}
                      <div
                        onDoubleClick={() => setActiveReactionMsgId(isPickerOpen ? null : msg.id)}
                        className={`px-4 py-3 text-sm font-medium leading-relaxed shadow-sm relative ${
                          isMe
                            ? `${theme.bubbleBg} rounded-2xl rounded-tr-sm`
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-2xl rounded-tl-sm'
                        }`}
                      >
                        {/* Image Attachment Rendering */}
                        {msg.attachment && (
                          <div className="mb-2 overflow-hidden rounded-xl border border-white/20 shadow-sm">
                            <img
                              src={msg.attachment}
                              alt="Attachment"
                              className="max-h-60 w-full object-cover rounded-xl hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}

                        {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}

                        {/* Reactions */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className={`flex flex-wrap gap-1 mt-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {msg.reactions.map((r) => {
                              const hasReacted = r.users.some((u) => u.toLowerCase() === currentUser.toLowerCase());
                              return (
                                <button
                                  key={r.emoji}
                                  type="button"
                                  onClick={() => handleToggleReaction(msg.id, r.emoji)}
                                  className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full transition-transform active:scale-95 ${
                                    hasReacted
                                      ? 'bg-white/30 text-white dark:bg-slate-700/80 shadow-sm'
                                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <span>{r.emoji}</span>
                                  <span>{r.users.length}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMe ? 'text-white/80' : 'text-slate-400'}`}>
                          <span>{formatTime(msg.timestamp)}</span>
                          {isMe && (
                            <span className="font-bold">
                              {msg.read ? '· ✓✓' : '· ✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Attachment preview banner */}
        <AnimatePresence>
          {attachment && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <img src={attachment} alt="Preview" className="w-10 h-10 rounded-lg object-cover border border-slate-300 dark:border-slate-600" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Photo attached</span>
              </div>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input bar */}
        <motion.form
          onSubmit={handleSend}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-4 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl flex-shrink-0 relative"
        >
          {/* Emoji Popover */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-16 left-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 shadow-xl z-20 flex gap-2"
              >
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setInputText((prev) => prev + emoji);
                      setShowEmojiPicker(false);
                      inputRef.current?.focus();
                    }}
                    className="hover:scale-125 transition-transform text-lg p-1"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Attachment file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
            title="Attach image"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
            title="Add emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              placeholder={`Message ${displayPartnerName}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onFocus={() => {
                scrollToBottom(true);
                setTimeout(() => scrollToBottom(true), 250);
              }}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100/60 dark:focus:ring-rose-950/60 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <motion.button
            type="submit"
            disabled={(!inputText.trim() && !attachment) || sending}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            className={`p-3 bg-gradient-to-br ${theme.bgGrad} text-white rounded-2xl shadow-lg transition-all disabled:opacity-40 disabled:pointer-events-none flex-shrink-0`}
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </motion.button>
        </motion.form>
      </div>

      {/* ── Tomato Right-Side Drawer (Shared Media & Theme Color Switcher) ── */}
      <AnimatePresence>
        {showRightDrawer && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="w-72 flex-shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl flex flex-col h-full z-20 shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Contact Info</h3>
              <button
                type="button"
                onClick={() => setShowRightDrawer(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">

              {/* Partner Profile Card */}
              <div className="flex flex-col items-center text-center">
                <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${theme.bgGrad} flex items-center justify-center font-black text-white text-3xl shadow-lg mb-3`}>
                  {displayPartnerName.charAt(0).toUpperCase()}
                </div>
                <p className="font-black text-slate-900 dark:text-white text-lg">{displayPartnerName}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                  {isSavedMessages ? 'Personal Cloud Storage' : 'Active Member'}
                </p>
              </div>

              {/* Custom Theme Color Switcher */}
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" /> Custom Theme
                </p>
                <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                  {(Object.keys(THEME_STYLES) as ThemeColor[]).map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setActiveTheme(col)}
                      className={`w-7 h-7 rounded-xl bg-gradient-to-br ${THEME_STYLES[col].bgGrad} flex items-center justify-center transition-transform ${
                        activeTheme === col ? 'scale-110 ring-2 ring-slate-900 dark:ring-white' : 'hover:scale-105'
                      }`}
                    >
                      {activeTheme === col && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shared Media Section */}
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                  Shared Photos ({sharedMedia.length})
                </p>
                {sharedMedia.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6 italic bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    No shared photos yet
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {sharedMedia.map((m) => (
                      <img
                        key={m.id}
                        src={m.attachment}
                        alt="Shared"
                        className="w-full h-24 object-cover rounded-xl border border-slate-200 dark:border-slate-700 hover:scale-105 transition-transform"
                      />
                    ))}
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
