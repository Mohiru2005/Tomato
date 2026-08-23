'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Router Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <div className="bg-white p-8 rounded-2xl border border-rose-100 shadow-md max-w-md w-full">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong!</h2>
        <p className="text-sm text-slate-500 mb-6">{error.message || 'An error occurred while loading this route.'}</p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-rose-500 text-white font-bold rounded-xl text-sm hover:bg-rose-600 transition-all"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
