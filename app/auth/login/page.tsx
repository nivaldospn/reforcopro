'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Loader2, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  ShieldCheck, 
  Zap,
  Sparkles,
  Star,
  AlertCircle
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isInitializing, user, login } = useApp();
  const router = useRouter();

  React.useEffect(() => {
    if (!isInitializing && user) {
      router.replace('/');
    }
  }, [isInitializing, user, router]);

  React.useEffect(() => {
    const saved = localStorage.getItem('reforco_saved_email');
    if (saved) {
      setEmail(saved);
      setRememberEmail(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (email && password) {
        if (rememberEmail) {
          localStorage.setItem('reforco_saved_email', email);
        } else {
          localStorage.removeItem('reforco_saved_email');
        }
        await login(email, password);
        router.push('/');
      } else {
        setError('Por favor, preencha todos os campos corretamente.');
      }
    } catch (e: any) {
      setError(e.message || 'Falha ao logar. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-950 selection:bg-blue-100 dark:selection:bg-blue-900/30 overflow-hidden font-sans">
      {/* Left Side: Branding & Visuals (Desktop Only) */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-slate-900">
        {/* Advanced Mesh Gradient Background */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              x: [0, 50, 0],
              y: [0, -30, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-600/30 blur-[120px]" 
          />
          <motion.div 
            animate={{ 
              scale: [1.2, 1, 1.2],
              x: [0, -40, 0],
              y: [0, 60, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute top-[10%] -right-[20%] w-[80%] h-[80%] rounded-full bg-indigo-600/20 blur-[140px]" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              x: [0, 30, 0],
              y: [0, 40, 0]
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-[20%] left-[10%] w-[60%] h-[60%] rounded-full bg-sky-500/20 blur-[100px]" 
          />
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" />
        </div>

        {/* Noise Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10 flex flex-col justify-between p-20 w-full">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <div className="w-16 h-16 relative">
              <Image src="/logo.png" alt="Reforço Pro Logo" fill className="object-contain rounded-full" priority />
            </div>
            <span className="text-3xl font-black text-white tracking-tighter">Reforço Pro</span>
          </motion.div>

          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-black uppercase tracking-widest mb-8 backdrop-blur-md"
            >
              <Sparkles size={14} className="text-blue-400" />
              Plataforma #1 para Educadores
            </motion.div>

            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-6xl font-black text-white leading-[1.05] tracking-tighter mb-8"
            >
              Eleve o seu ensino ao <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-300">nível profissional.</span>
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl text-slate-300 font-medium leading-relaxed mb-14 max-w-lg"
            >
              A ferramenta definitiva para professores que buscam excelência na gestão de alunos e resultados financeiros.
            </motion.p>

            <div className="grid grid-cols-2 gap-8">
              {[
                { icon: ShieldCheck, label: 'Segurança Bancária', desc: 'Dados criptografados' },
                { icon: Zap, label: 'Performance Extrema', desc: 'Carregamento instantâneo' },
                { icon: Sparkles, label: 'UX de Próxima Geração', desc: 'Interface intuitiva' },
                { icon: CheckCircle2, label: 'Automação Inteligente', desc: 'Poupe horas de trabalho' },
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
                  className="flex items-start gap-4 p-5 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-xl transition-all cursor-default"
                >
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                    <item.icon size={20} />
                  </div>
                  <div>
                    <p className="text-base font-black text-white tracking-tight">{item.label}</p>
                    <p className="text-sm text-slate-400 font-medium">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-center gap-4"
            >
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 overflow-hidden relative">
                    <Image 
                      src={`https://picsum.photos/seed/user${i}/100/100`} 
                      alt="User" 
                      fill 
                      className="object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 text-amber-400">
                  {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={12} fill="currentColor" />)}
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">+5.000 Professores Ativos</p>
              </div>
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em]"
            >
              v2.5 Premium Edition
            </motion.p>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-12 lg:p-20 relative bg-white dark:bg-slate-950">
        {/* Subtle Background Decoration */}
        <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/[0.03] blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/[0.03] blur-[120px]" />
          {/* Subtle Noise Texture on Right Side */}
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <motion.div 
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="w-20 h-20 relative mb-4"
            >
              <Image src="/logo.png" alt="Reforço Pro Logo" fill className="object-contain rounded-full" priority />
            </motion.div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Reforço Pro</h1>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex lg:hidden items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-4"
            >
              <Sparkles size={12} />
              Premium Edition
            </motion.div>
            <h2 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">Bem-vindo.</h2>
            <p className="text-slate-500 dark:text-slate-400 font-semibold text-base lg:text-lg">Entre para gerenciar seu império educacional.</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-600 dark:text-rose-400 text-sm font-black"
              >
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                  <AlertCircle size={16} />
                </div>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 ml-2 uppercase tracking-[0.2em]">E-mail Corporativo</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-all duration-300">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[1.25rem] outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-300 font-bold text-slate-900 dark:text-white placeholder:text-slate-400/60 shadow-sm focus:shadow-xl focus:shadow-blue-500/5"
                  placeholder="seu@email.com"
                />
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between px-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Senha de Acesso</label>
                <Link href="#" className="text-[10px] font-black text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors uppercase tracking-wider">
                  Recuperar
                </Link>
              </div>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-all duration-300">
                  <Lock size={18} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[1.25rem] outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-300 font-bold text-slate-900 dark:text-white placeholder:text-slate-400/60 shadow-sm focus:shadow-xl focus:shadow-blue-500/5"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-all duration-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-between px-2"
            >
              <div className="flex items-center gap-3 group cursor-pointer">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <input 
                    type="checkbox" 
                    id="remember" 
                    checked={rememberEmail}
                    onChange={(e) => setRememberEmail(e.target.checked)}
                    className="peer w-full h-full rounded-lg border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500/20 transition-all cursor-pointer appearance-none bg-white dark:bg-slate-900 border-2 checked:bg-blue-600 checked:border-blue-600"
                  />
                  <CheckCircle2 size={12} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                </div>
                <label htmlFor="remember" className="text-sm font-bold text-slate-500 dark:text-slate-400 cursor-pointer group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                  Manter conectado
                </label>
              </div>
            </motion.div>

            <motion.button 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              type="submit"
              disabled={isLoading}
              className="w-full relative overflow-hidden group rounded-[1.25rem]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-[length:200%_100%] animate-shimmer group-hover:bg-[100%_0] transition-all duration-700" />
              <div className="relative flex items-center justify-center gap-3 py-4 px-8 text-white font-black uppercase tracking-[0.15em] text-xs lg:text-sm active:scale-[0.98] transition-transform disabled:opacity-70">
                {isLoading ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <>
                    Entrar no Sistema
                    <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform duration-300" />
                  </>
                )}
              </div>
              <div className="absolute inset-0 shadow-[0_15px_35px_rgba(37,99,235,0.25)] group-hover:shadow-[0_20px_45px_rgba(37,99,235,0.35)] transition-all duration-300" />
            </motion.button>
          </form>


        </motion.div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
        .animate-shimmer {
          animation: shimmer 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
