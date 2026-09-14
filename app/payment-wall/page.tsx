'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Check, ShieldCheck, Zap, Star, Loader2 } from 'lucide-react';
import { useApp } from '@/lib/store';
import { motion } from 'motion/react';

export default function PaymentWall() {
  const [isLoading, setIsLoading] = useState(false);
  const { setPaid, user } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  const handlePayment = () => {
    setIsLoading(true);
    // Simulate payment processing
    setTimeout(() => {
      setPaid();
      router.push('/');
      setIsLoading(false);
    }, 2000);
  };

  if (!user) {
    return null;
  }

  const features = [
    'Gestão ilimitada de alunos',
    'Controle financeiro completo',
    'Organização de turmas e horários',
    'Relatórios de desempenho',
    'Suporte prioritário via WhatsApp',
    'Acesso em múltiplos dispositivos'
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="w-24 h-24 relative mx-auto mb-8">
            <Image src="/logo.png" alt="Reforço Pro Logo" fill className="object-contain rounded-full" priority />
          </div>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-sm font-bold mb-6"
          >
            <Star size={16} fill="currentColor" />
            Plano Profissional
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-white mb-4">
            Desbloqueie o <span className="text-blue-600">Reforço Pro</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
            Organize seu trabalho, profissionalize seu atendimento e foque no que importa: o ensino.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Features List */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">O que você terá acesso:</h3>
            {features.map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 text-slate-600 dark:text-slate-400"
              >
                <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check size={14} />
                </div>
                <span className="font-medium">{feature}</span>
              </motion.div>
            ))}
          </div>

          {/* Pricing Card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border-2 border-blue-600 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-blue-600 text-white px-6 py-1 rounded-bl-2xl text-xs font-bold uppercase tracking-wider">
              Mais Popular
            </div>

            <div className="mb-8">
              <p className="text-slate-500 dark:text-slate-400 font-bold mb-2">Assinatura Mensal</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-400">R$</span>
                <span className="text-6xl font-black text-slate-800 dark:text-white">29,90</span>
                <span className="text-slate-400 font-medium">/mês</span>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <ShieldCheck className="text-emerald-500" size={24} />
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Pagamento Seguro</p>
                  <p className="text-xs text-slate-500">Criptografia de ponta a ponta</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <Zap className="text-amber-500" size={24} />
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Acesso Imediato</p>
                  <p className="text-xs text-slate-500">Liberação em menos de 1 minuto</p>
                </div>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-2xl shadow-xl shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-3 text-lg"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                'Assinar Agora'
              )}
            </button>
            
            <p className="text-center text-xs text-slate-400 mt-6">
              Cancele a qualquer momento. Sem fidelidade.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
