'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full py-3.5 px-6 sm:px-10 flex items-center justify-between border-b border-white/60 dark:border-slate-800 bg-white/60 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm shadow-rose-900/5 transition-colors"
    >
      <div className="flex items-center gap-3">
        {/* Tomato Logo */}
        <motion.div
          whileHover={{ scale: 1.08, rotate: -4 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950 border border-rose-200/80 dark:border-rose-900 flex items-center justify-center p-1 shadow-md shadow-rose-500/10 cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <radialGradient id="navTomatoGrad" cx="38%" cy="38%" r="62%">
                <stop offset="0%" stopColor="#ff6b81" />
                <stop offset="50%" stopColor="#f43f5e" />
                <stop offset="85%" stopColor="#e11d48" />
                <stop offset="100%" stopColor="#9f1239" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="54" r="38" fill="url(#navTomatoGrad)" />
            <ellipse cx="36" cy="38" rx="11" ry="6" fill="#ffffff" opacity="0.35" transform="rotate(-30 36 38)" />
            <path d="M50 22 C48 10, 53 10, 50 22" stroke="#15803d" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <path d="M50 22 Q40 24 28 20 Q42 27 46 29 Q40 37 38 42 Q49 34 50 31 Q51 34 62 42 Q60 37 54 29 Q58 27 72 20 Q60 24 50 22 Z" fill="#22c55e" />
          </svg>
        </motion.div>

        <div className="flex flex-col">
          <span className="font-extrabold text-slate-900 dark:text-white tracking-tight text-xl leading-tight flex items-center gap-1.5">
            tomato{' '}
            <span className="text-rose-500 font-semibold text-xs px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 border border-rose-200/80 dark:border-rose-900">
              org
            </span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Dark Mode Toggle */}
        <motion.button
          type="button"
          onClick={toggleTheme}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </motion.button>

        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold bg-emerald-50/80 dark:bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60 shadow-sm"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Online</span>
        </motion.div>
      </div>
    </motion.header>
  );
}
