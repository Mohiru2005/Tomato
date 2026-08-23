'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Lock, User, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';

export default function AuthForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');
    if (!username.trim() || !pin.trim()) {
      setError('Please enter both User and PIN.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: activeTab, username: username.trim(), pin: pin.trim() }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok || !data.success) {
        setError(data.error || 'Authentication failed.');
        return;
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('tomato_org_user', username.trim());
        localStorage.setItem('tomato_org_role', data.user?.role || 'user');
      }
      router.push('/dashboard');
    } catch {
      setLoading(false);
      setError('Network error. Failed to connect.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-md mx-auto"
    >
      <div className="glass-heavy dark:bg-slate-900/90 border border-white/60 dark:border-slate-800 rounded-3xl p-7 shadow-2xl shadow-rose-900/10 dark:shadow-slate-950/50 glow-rose">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-rose-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            {activeTab === 'login' ? 'Welcome back 👋' : 'Create your account ✨'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="relative flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl mb-6">
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-700 rounded-xl shadow-sm ${activeTab === 'login' ? 'left-1' : 'left-[calc(50%+0px)]'}`}
          />
          {(['login', 'signup'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => { setActiveTab(tab); setError(''); setUsername(''); setPin(''); }}
              className={`relative flex-1 py-2.5 text-sm font-bold text-center rounded-xl transition-colors duration-150 z-10 ${
                activeTab === tab ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Error */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key={error}
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="mb-4 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl p-3 text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} autoComplete="off">
          {/* Username */}
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-1.5 mb-4"
          >
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">User</label>
            <div className="relative group">
              <User className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-rose-600" />
              <input
                type="text"
                autoComplete="off"
                data-lpignore="true"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100/60 dark:focus:ring-rose-950/60 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-500"
              />
            </div>
          </motion.div>

          {/* PIN */}
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-1.5 mb-6"
          >
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">PIN</label>
            <div className="relative group">
              <Lock className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-rose-600" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                data-lpignore="true"
                placeholder="Enter your PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100/60 dark:focus:ring-rose-950/60 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-500 via-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-500/30 flex items-center justify-center gap-2 group transition-all disabled:opacity-70 disabled:pointer-events-none"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{activeTab === 'login' ? 'Log In' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </motion.button>
        </form>

        {activeTab === 'signup' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-4 font-medium"
          >
            Already have an account?{' '}
            <button type="button" onClick={() => setActiveTab('login')} className="text-rose-600 dark:text-rose-400 font-bold hover:underline">
              Log In
            </button>
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
