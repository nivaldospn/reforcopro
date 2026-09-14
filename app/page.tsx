'use client';

import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  AlertCircle, 
  ArrowUpRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  DollarSign,
  RefreshCw,
  ArrowRight,
  Clock,
  ChevronRight,
  Activity,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { Layout } from '@/components/Layout';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import Link from 'next/link';
import { parseISO, format, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const { isInitializing, user, students, classes, payments, clearData } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!isInitializing && !user) {
      router.push('/auth/login');
    }
  }, [isInitializing, user, router]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    
    // Monthly Revenue (Paid payments in current month)
    const monthlyRevenue = payments
      .filter(p => p.status === 'paid' && p.date && isSameMonth(parseISO(p.date), now))
      .reduce((acc, p) => acc + p.amount, 0);

    // Pending Payments (Total amount of pending payments)
    const pendingAmount = payments
      .filter(p => p.status === 'pending')
      .reduce((acc, p) => acc + p.amount, 0);
    
    const pendingCount = payments.filter(p => p.status === 'pending').length;

    return [
      { 
        label: 'Total de Alunos', 
        value: students.length, 
        icon: Users, 
        color: 'from-blue-600 to-indigo-600',
        glow: 'shadow-blue-500/20',
        href: '/students',
        description: 'Alunos matriculados'
      },
      { 
        label: 'Receita no Mês', 
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyRevenue), 
        icon: DollarSign, 
        color: 'from-emerald-500 to-teal-600',
        glow: 'shadow-emerald-500/20',
        href: '/payments',
        description: format(now, 'MMMM', { locale: ptBR })
      },
      { 
        label: 'Total de Turmas', 
        value: classes.length, 
        icon: BookOpen, 
        color: 'from-violet-600 to-purple-600',
        glow: 'shadow-purple-500/20',
        href: '/classes',
        description: 'Turmas cadastradas'
      },
      { 
        label: 'Pagamentos Pendentes', 
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingAmount), 
        icon: AlertCircle, 
        color: 'from-rose-500 to-orange-600',
        glow: 'shadow-rose-500/20',
        href: '/payments',
        description: `${pendingCount} faturas em aberto`
      },
    ];
  }, [students, classes, payments]);

  if (isInitializing || !user) return null;

  return (
    <Layout title="Dashboard">
      <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-10 pb-16">
        {/* Welcome Header with Glassmorphism */}
        <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] md:rounded-[3rem] p-6 sm:p-8 md:p-12 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl shadow-slate-900/5 dark:shadow-slate-900/20 border border-slate-200/50 dark:border-slate-800/50">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                x: [0, 30, 0],
                y: [0, -20, 0]
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute -top-[20%] -left-[10%] w-[80%] h-[80%] rounded-full bg-blue-600/10 dark:bg-blue-600/20 blur-[100px]" 
            />
            <motion.div 
              animate={{ 
                scale: [1.2, 1, 1.2],
                x: [0, -20, 0],
                y: [0, 40, 0]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute top-[10%] -right-[20%] w-[90%] h-[90%] rounded-full bg-indigo-600/5 dark:bg-indigo-600/10 blur-[120px]" 
            />
            {/* Noise Texture */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 md:gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">
                {greeting}, <span className="text-blue-600 dark:text-blue-400">{user.name.split(' ')[0]}</span>!
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-1.5 md:mt-3 text-[11px] sm:text-sm md:text-lg max-w-xl">
                Seu centro está operando com excelência.
              </p>
            </motion.div>

            <div className="flex items-center gap-3 md:gap-4 mt-2 lg:mt-0">
              <div className="flex-1 sm:flex-none px-4 sm:px-6 md:px-6 py-3 sm:py-4 md:py-4 bg-slate-50 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-xl sm:rounded-[2rem] flex items-center gap-3 sm:gap-4 md:gap-4 shadow-sm">
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-12 md:h-12 rounded-xl sm:rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Activity size={20} className="sm:w-6 sm:h-6 md:w-6 md:h-6" />
                </div>
                <div>
                  <p className="text-[8px] sm:text-[10px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Status</p>
                  <p className="text-base md:text-sm font-black text-slate-900 dark:text-white">Ativo</p>
                </div>
              </div>

              <button 
                onClick={() => {
                  if (window.confirm('Deseja realmente limpar todos os dados do sistema? Esta ação é irreversível.')) {
                    clearData();
                    window.location.reload();
                  }
                }}
                className="p-3 sm:p-4 md:px-6 md:py-4 bg-slate-50 dark:bg-white/5 hover:bg-red-500/10 backdrop-blur-xl border border-slate-200 dark:border-white/10 hover:border-red-500/30 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl sm:rounded-[2rem] transition-all duration-300 group shadow-sm"
                title="Limpar Dados"
              >
                <RefreshCw size={20} className="sm:w-6 sm:h-6 group-hover:rotate-180 transition-transform duration-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Stats Grid with Glow Effects */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link 
                href={stat.href}
                className={cn(
                  "group relative h-full flex flex-col justify-between p-4 sm:p-6 md:p-8 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none transition-all duration-500 overflow-hidden",
                  "hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98]",
                  `hover:${stat.glow}`
                )}
              >
                {/* Background Glow */}
                <div className={cn(
                  "absolute -right-4 -top-4 sm:-right-8 sm:-top-8 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br opacity-[0.05] group-hover:opacity-[0.15] transition-opacity rounded-full blur-2xl sm:blur-3xl",
                  stat.color
                )} />
                
                <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8">
                  <div className={cn(
                    "p-3 sm:p-4 md:p-4 rounded-xl sm:rounded-[1.5rem] bg-gradient-to-br text-white shadow-xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
                    stat.color
                  )}>
                    <stat.icon size={20} className="sm:w-6 sm:h-6 md:w-7 md:h-7" />
                  </div>
                  <div className="flex w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-2xl bg-slate-50 dark:bg-slate-800 items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-all shadow-sm">
                    <ChevronRight size={16} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2 md:space-y-2">
                  <p className="text-slate-500 dark:text-slate-400 text-[9px] sm:text-[10px] md:text-[10px] font-black uppercase tracking-widest leading-tight line-clamp-2">{stat.label}</p>
                  <h3 className="text-base sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{stat.value}</h3>
                  <div className="flex items-center justify-between pt-1 sm:pt-2 md:pt-3">
                    <p className="text-[8px] sm:text-[10px] md:text-[11px] text-slate-400 font-bold uppercase tracking-wider leading-tight line-clamp-2">
                      {stat.description}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Recent Students - Premium Feed Style */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl md:rounded-[3rem] border border-slate-200/60 dark:border-slate-800/60 shadow-sm p-6 md:p-10"
          >
            <div className="flex items-center justify-between mb-8 md:mb-10">
              <div>
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest text-[11px] md:text-[10px] mb-2 md:mb-2">
                  <Users size={16} />
                  Matrículas Recentes
                </div>
                <h3 className="text-2xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Novos Alunos</h3>
              </div>
              <Link href="/students" className="group flex items-center gap-2 md:gap-2 px-5 py-3 md:px-5 py-2 md:py-2.5 rounded-2xl md:rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-600 hover:text-white transition-all font-black text-[11px] md:text-[10px] uppercase tracking-widest shadow-sm">
                Ver Todos
                <ArrowUpRight size={18} className="md:w-4 md:h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>

            <div className="space-y-5 md:space-y-5">
              {students.slice(0, 5).map((student, i) => (
                <div key={student.id} className="flex items-center justify-between p-4 sm:p-5 bg-slate-50/30 dark:bg-slate-800/20 rounded-[2rem] sm:rounded-[2rem] border border-slate-100 dark:border-slate-800/50 group hover:border-blue-200 dark:hover:border-blue-900/50 hover:bg-white dark:hover:bg-slate-800/50 transition-all duration-300 shadow-sm gap-2">
                  <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-lg shadow-blue-500/20">
                        {student.name.charAt(0)}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500 border-[3px] sm:border-4 border-white dark:border-slate-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base sm:text-lg md:text-base font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors truncate">{student.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 sm:mt-1.5 md:mt-1">
                        <p className="text-[10px] sm:text-[11px] md:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar size={12} className="sm:w-3.5 sm:h-3.5 md:w-3 md:h-3" />
                          {student.entryDate ? format(parseISO(student.entryDate), "dd MMM", { locale: ptBR }) : '--'}
                        </p>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <div className={cn(
                      "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1 sm:py-2 rounded-full text-[9px] sm:text-[11px] md:text-[9px] font-black uppercase tracking-[0.15em]",
                      student.status === 'active' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    )}>
                      {student.status === 'active' ? 'Ativo' : 'Pendente'}
                    </div>
                    <Link href={`/students?id=${student.id}`} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all shadow-sm shrink-0">
                      <ChevronRight size={20} className="sm:w-6 sm:h-6 md:w-5 md:h-5" />
                    </Link>
                  </div>
                </div>
              ))}
              {students.length === 0 && (
                <div className="text-center py-12 md:py-20 bg-slate-50/30 dark:bg-slate-800/20 rounded-2xl md:rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl flex items-center justify-center text-slate-200 dark:text-slate-800 mx-auto mb-4 md:mb-6 shadow-sm">
                    <Users size={32} className="md:w-10 md:h-10" />
                  </div>
                  <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-1 md:mb-2 tracking-tight">Nenhum aluno ainda</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-medium mb-6 md:mb-8">Comece cadastrando seu primeiro aluno.</p>
                  <Link href="/students" className="inline-flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95">
                    Cadastrar
                    <ArrowRight size={14} className="md:w-4 md:h-4" />
                  </Link>
                </div>
              )}
            </div>
          </motion.div>

          {/* Pending Payments - High Priority Style */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3rem] border border-slate-200/60 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none p-8 md:p-10 flex flex-col"
          >
            <div className="flex items-center justify-between mb-8 md:mb-10">
              <div>
                <div className="flex items-center gap-2 text-rose-500 font-black uppercase tracking-widest text-[11px] md:text-[10px] mb-2 md:mb-2">
                  <AlertCircle size={16} />
                  Atenção Financeira
                </div>
                <h3 className="text-2xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Pendências</h3>
              </div>
              <div className="w-14 h-14 md:w-12 md:h-12 bg-rose-500/10 text-rose-500 rounded-2xl md:rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-rose-500/5">
                <Clock size={28} className="md:w-6 md:h-6" />
              </div>
            </div>

            <div className="space-y-5 md:space-y-4 flex-1">
              {payments.filter(p => p.status === 'pending').slice(0, 6).map((payment) => {
                const student = students.find(s => s.id === payment.studentId);
                return (
                  <div key={payment.id} className="group p-5 md:p-5 bg-rose-500/[0.03] dark:bg-rose-500/[0.05] rounded-[2rem] md:rounded-[2rem] border border-rose-500/10 hover:border-rose-500/30 transition-all duration-300 shadow-sm">
                    <div className="flex items-center justify-between mb-4 md:mb-3">
                      <div className="flex items-center gap-3 md:gap-3 flex-1 min-w-0 mr-4">
                        <div className="w-10 h-10 md:w-8 md:h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 font-black text-sm md:text-xs shrink-0">
                          {student?.name.charAt(0) || '?'}
                        </div>
                        <p className="text-sm md:text-sm font-black text-slate-900 dark:text-white truncate">{student?.name || 'Aluno'}</p>
                      </div>
                      <p className="text-base md:text-sm font-black text-rose-600 dark:text-rose-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 md:gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        <p className="text-[11px] md:text-[10px] text-slate-500 font-bold uppercase tracking-wider">{payment.date ? format(parseISO(payment.date), "dd/MM/yy") : '--/--/--'}</p>
                      </div>
                      <Link href="/payments" className="flex items-center gap-1.5 text-[11px] md:text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors">
                        Resolver <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })}
              {payments.filter(p => p.status === 'pending').length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center py-8 md:py-12 text-center">
                  <div className="w-16 h-16 md:w-24 md:h-24 bg-emerald-500/10 text-emerald-500 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center mb-4 md:mb-6 shadow-xl shadow-emerald-500/5">
                    <CheckCircle2 size={32} className="md:w-12 md:h-12" />
                  </div>
                  <h4 className="text-base md:text-xl font-black text-slate-900 dark:text-white mb-1 md:mb-2 tracking-tight">Fluxo Limpo!</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-medium">Tudo em dia.</p>
                </div>
              )}
            </div>
            
            <Link href="/payments" className="block mt-6 md:mt-8 w-full py-3 md:py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-center hover:bg-slate-800 dark:hover:bg-slate-700 transition-all">
              Relatório Completo
            </Link>
          </motion.div>
        </div>

        {/* Classes Overview - Modern Grid Style */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-200/60 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none p-8 md:p-14"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 md:gap-6 mb-10 md:mb-12">
            <div>
              <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-black uppercase tracking-widest text-[11px] md:text-[10px] mb-2 md:mb-2">
                <BookOpen size={16} />
                Gestão de Turmas
              </div>
              <h3 className="text-3xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Visão Geral das Turmas</h3>
            </div>
            <Link href="/classes" className="inline-flex items-center justify-center gap-3 md:gap-3 px-10 md:px-8 py-5 md:py-4 bg-violet-600 text-white rounded-[2rem] md:rounded-[2rem] font-black text-sm md:text-xs uppercase tracking-widest hover:bg-violet-700 transition-all shadow-xl shadow-violet-600/20 active:scale-95">
              Gerenciar
              <ArrowRight size={18} className="md:w-4 md:h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-8">
            {classes.map((cls) => {
              const classStudents = students.filter(s => s.classId === cls.id);
              
              return (
                <div key={cls.id} className="relative p-5 sm:p-6 md:p-8 bg-slate-50/50 dark:bg-slate-800/30 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800/50 group hover:shadow-2xl hover:bg-white dark:hover:bg-slate-800 transition-all duration-500 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-start sm:items-center justify-between mb-6 md:mb-8 gap-4">
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center text-violet-600 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shrink-0">
                        <BookOpen size={24} className="md:w-7 md:h-7" />
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest shrink-0">
                        <ShieldCheck size={14} className="sm:w-4 sm:h-4 text-emerald-500" />
                        {cls.status === 'active' ? 'Ativa' : 'Inativa'}
                      </div>
                    </div>

                    <div className="mb-6 md:mb-8">
                      <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-2 md:mb-1 tracking-tight line-clamp-2">{cls.name}</h4>
                      <p className="text-[10px] sm:text-[11px] lg:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.1em] flex items-center gap-1.5 md:gap-2 truncate">
                        <Calendar size={14} className="sm:w-3.5 sm:h-3.5 text-violet-400 shrink-0" />
                        <span className="truncate">{cls.schedule || 'A definir'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-black uppercase tracking-widest">Alunos</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-1.5">
                      {classStudents.length} <span className="text-slate-400 text-xs sm:text-sm font-bold lowercase tracking-normal">matriculados</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
