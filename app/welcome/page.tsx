'use client';

import React, { useEffect, useState, useRef } from 'react';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import { Send, Trash2, LogOut, MessageSquare } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef<number>(0);

  // Fetch messages with smart diffing to prevent focus loss and unnecessary re-renders
  const fetchMessages = async (forceScroll = false) => {
    try {
      const res = await fetch('/api/messages');
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        const newMsgs: ChatMessage[] = data.messages;
        
        // Only update state if message list actually changed
        setMessages((prev) => {
          if (
            prev.length !== newMsgs.length ||
            (prev.length > 0 && newMsgs.length > 0 && prev[prev.length - 1].id !== newMsgs[newMsgs.length - 1].id)
          ) {
            return newMsgs;
          }
          return prev;
        });

        if (forceScroll || newMsgs.length > prevMessagesCountRef.current) {
          prevMessagesCountRef.current = newMsgs.length;
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        }
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('tomato_org_user');
      if (!stored) {
        router.push('/');
        return;
      }
      setCurrentUser(stored);
    }

    // Initial fetch with scroll
    fetchMessages(true);

    // Real-time polling every 2s
    const interval = setInterval(() => {
      fetchMessages(false);
    }, 2000);

    return () => clearInterval(interval);
  }, [router]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: currentUser,
          text: textToSend,
        }),
      });

      const data = await res.json();
      setSending(false);

      if (data.success) {
        fetchMessages(true);
      }
    } catch (err) {
      setSending(false);
    }
  };

  // Clear chat history
  const handleClearChat = async () => {
    if (!confirm('Are you sure you want to clear chat history?')) return;
    try {
      await fetch('/api/messages', { method: 'DELETE' });
      prevMessagesCountRef.current = 0;
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
  };

  // Logout
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tomato_org_user');
    }
    router.push('/');
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-rose-50/70 via-white to-pink-50/50 selection:bg-rose-100 selection:text-rose-700 overflow-hidden">
      
      {/* Top Navbar */}
      <Navbar />

      {/* Chat Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 flex flex-col overflow-hidden">
        
        {/* Chat Control Header */}
        <div className="bg-white/80 backdrop-blur-md border border-rose-100/90 rounded-2xl p-4 mb-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 font-bold text-base shadow-inner">
              {currentUser.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {currentUser || 'User'}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active in Text Chat</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              title="Clear chat"
              type="button"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleLogout}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-xl transition-all border border-slate-200/60"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Message Feed Window */}
        <div className="flex-1 bg-white/90 border border-rose-100/90 rounded-3xl p-4 sm:p-6 shadow-xl shadow-rose-900/5 overflow-y-auto space-y-3 flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
              <MessageSquare className="w-10 h-10 text-rose-300 mb-2" />
              <p className="text-sm font-medium">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender.toLowerCase() === currentUser.toLowerCase();
              const isSystem = msg.sender.toLowerCase() === 'system';

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200/80 px-3 py-1 rounded-full shadow-sm">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[11px] font-bold text-slate-500">
                      {isMe ? 'You' : msg.sender}
                    </span>
                    <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                  </div>

                  <div
                    className={`max-w-[80%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${
                      isMe
                        ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-tr-none'
                        : 'bg-slate-100 text-slate-800 border border-slate-200/60 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Text Input Bar */}
        <form onSubmit={handleSendMessage} className="mt-4 flex items-center gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 px-4 py-3 bg-white border border-rose-200/90 rounded-2xl text-sm font-medium focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 transition-all placeholder:text-slate-400 shadow-sm"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="px-5 py-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold rounded-2xl shadow-md shadow-rose-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>

      </main>
    </div>
  );
}
