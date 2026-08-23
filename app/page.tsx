'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import AuthForm from '@/components/AuthForm';
import { ShieldCheck, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-rose-50 via-white to-pink-50 relative overflow-hidden">
      {/* Subtle static background glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-rose-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-pink-200/20 rounded-full blur-3xl pointer-events-none" />

      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-10 max-w-6xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center"
        >
          {/* LEFT SIDE: Welcome Content */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
                Tomato Org
              </span>
            </h1>

            <p className="text-slate-600 text-base sm:text-lg font-medium leading-relaxed max-w-md mx-auto lg:mx-0">
              We provide users with a low-latency experience and end-to-end encryption.
            </p>

            {/* Feature Highlights */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white/90 border border-rose-100 rounded-full shadow-sm text-xs font-semibold text-rose-700">
                <Zap className="w-4 h-4 text-rose-500 fill-rose-500" />
                <span>Low Latency</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white/90 border border-rose-100 rounded-full shadow-sm text-xs font-semibold text-rose-700">
                <ShieldCheck className="w-4 h-4 text-rose-500" />
                <span>End-to-End Encryption</span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Login / Signup Box */}
          <div className="lg:col-span-6 w-full">
            <AuthForm />
          </div>
        </motion.div>
      </main>

      <footer className="py-4 text-center text-xs font-medium text-slate-400 border-t border-rose-100/40">
        © 2026 Tomato Org
      </footer>
    </div>
  );
}
