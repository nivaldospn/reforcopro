'use client';

import { useEffect } from 'react';
import { motion } from 'motion/react';
import { RefreshCcw, AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-3xl flex items-center justify-center mx-auto mb-8"
        >
          <AlertTriangle size={48} />
        </motion.div>
        <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-4">Algo deu errado</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
          Ocorreu um erro inesperado. Por favor, tente novamente ou entre em contato com o suporte.
        </p>
        <button 
          onClick={() => reset()}
          className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold px-8 py-4 rounded-2xl shadow-lg shadow-amber-600/20 transition-all active:scale-95"
        >
          <RefreshCcw size={20} />
          Tentar Novamente
        </button>
      </div>
    </div>
  );
}
