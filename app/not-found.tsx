import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-rose-50/70 via-white to-pink-50/50 p-4 text-center">
      <div className="w-16 h-16 rounded-3xl bg-rose-100 flex items-center justify-center text-rose-600 font-extrabold text-2xl mb-4 shadow-sm">
        404
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Page Not Found</h2>
      <p className="text-slate-500 text-sm max-w-sm mb-6">
        The page you are looking for does not exist in tomato org workspace.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-rose-500/25"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Welcome Page
      </Link>
    </div>
  );
}
