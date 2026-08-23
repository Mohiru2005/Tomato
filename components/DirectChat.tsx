'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Trash2, ArrowLeft, MessageCircle, Smile } from 'lucide-react';

interface Reaction {
  emoji: string;
  users: string[];
}

interface ChatMessage {
  id: string;
  fromUser: string;
  toUser: string;
  text: string;
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
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevCountRef = useRef(0);

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;
    const text = inputText.trim();
    setInputText('');
    setShowEmojiPicker(false);
    setSending(true);
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUser: currentUser, toUser: partnerUser, text }),
      });
      await fetchMessages();
    } finally {
      setSending(false);
      inputRef.current?.focus();
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
    prevCountRef.current = 0;
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-white to-rose-50/40 dark:from-slate-900 dark:to-slate-950 transition-colors">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 py-3 border-b border-rose-100/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            onClick={onBack}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center font-bold text-white text-sm shadow-md shadow-rose-500/20">
              {partnerUser.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900" />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white text-sm">{partnerUser}</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              Active now
            </p>
          </div>
        </div>
        <motion.button
          type="button"
          onClick={handleClear}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
          title="Clear chat"
        >
          <Trash2 className="w-4 h-4" />
        </motion.button>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full gap-4 text-slate-400 select-none"
            >
              <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-slate-800 border border-rose-100 dark:border-slate-700 flex items-center justify-center">
                <MessageCircle className="w-7 h-7 text-rose-300 dark:text-rose-400" />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-500 dark:text-slate-400">Start the conversation</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Say hello to <span className="font-semibold text-rose-500">{partnerUser}</span> 👋</p>
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
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-1' : 'mt-3'} group relative`}
                >
                  {!isMe && !isGrouped && (
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 border border-rose-200/60 flex items-center justify-center font-bold text-rose-600 text-xs mr-2 flex-shrink-0 mt-0.5">
                      {msg.fromUser.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {!isMe && isGrouped && <div className="w-7 mr-2 flex-shrink-0" />}

                  <div className="max-w-[72%] relative">
                    {/* Reaction trigger bar on hover / click */}
                    <div className={`absolute top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-white dark:bg-slate-800 border border-rose-100 dark:border-slate-700 shadow-md rounded-full px-1.5 py-0.5 z-10 ${
                      isMe ? '-left-20' : '-right-20'
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
                      className={`px-4 py-2.5 text-sm font-medium leading-relaxed shadow-sm relative ${
                        isMe
                          ? 'bg-gradient-to-br from-rose-500 to-pink-500 text-white rounded-2xl rounded-tr-sm shadow-rose-500/20'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700 rounded-2xl rounded-tl-sm'
                      }`}
                    >
                      {msg.text}

                      {/* Display active reactions */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {msg.reactions.map((r) => {
                            const hasReacted = r.users.some((u) => u.toLowerCase() === currentUser.toLowerCase());
                            return (
                              <button
                                key={r.emoji}
                                type="button"
                                onClick={() => handleToggleReaction(msg.id, r.emoji)}
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border transition-all ${
                                  hasReacted
                                    ? 'bg-rose-100 dark:bg-rose-950 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                                    : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                <span>{r.emoji}</span>
                                <span>{r.users.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className={`flex items-center gap-1 mt-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {formatTime(msg.timestamp)}
                      </p>
                      {isMe && (
                        <span className="text-[10px] font-bold text-slate-400">
                          {msg.read ? '· Read ✓' : '· Sent'}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <motion.form
        onSubmit={handleSend}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 px-4 py-3 border-t border-rose-100/40 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex-shrink-0 relative"
      >
        {/* Emoji picker popup */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-16 left-4 bg-white dark:bg-slate-800 border border-rose-100 dark:border-slate-700 rounded-2xl p-2.5 shadow-xl z-20 flex gap-2"
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

        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
          title="Add emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            placeholder={`Message ${partnerUser}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            // @ts-ignore
            enterKeyHint="send"
            className="w-full px-4 py-3 bg-slate-50/80 dark:bg-slate-800/80 border border-rose-200/40 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100/60 dark:focus:ring-rose-950/60 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 pr-10"
          />
        </div>

        <motion.button
          type="submit"
          disabled={!inputText.trim() || sending}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          className="p-3 bg-gradient-to-br from-rose-500 to-pink-500 text-white rounded-2xl shadow-lg shadow-rose-500/25 transition-all disabled:opacity-40 disabled:pointer-events-none flex-shrink-0"
        >
          {sending
            ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <Send className="w-4 h-4" />}
        </motion.button>
      </motion.form>
    </div>
  );
}
