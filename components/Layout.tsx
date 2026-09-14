'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  UserSquare2, 
  BookOpen, 
  CreditCard, 
  LogOut, 
  Sun, 
  Moon,
  ChevronLeft,
  Settings
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { useTheme } from './ThemeProvider';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
}

export function Layout({ children, title, showBackButton }: LayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isInitializing, user, logout } = useApp();
  const { theme, toggleTheme, mounted } = useTheme();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', shortLabel: 'Início', href: '/' },
    { icon: Users, label: 'Alunos', shortLabel: 'Alunos', href: '/students' },
    { icon: UserSquare2, label: 'Responsáveis', shortLabel: 'Pais', href: '/guardians' },
    { icon: BookOpen, label: 'Turmas', shortLabel: 'Turmas', href: '/classes' },
    { icon: CreditCard, label: 'Pagamentos', shortLabel: 'Pagos', href: '/payments' },
    { icon: Settings, label: 'Configurações', shortLabel: 'Ajustes', href: '/settings' },
  ];

  useEffect(() => {
    if (isInitializing) return;
    if (!user) {
      if (pathname !== '/auth/login' && pathname !== '/auth/register') {
        router.replace('/auth/login');
      }
    } else if (!user.isPaid && pathname !== '/payment-wall') {
      router.replace('/payment-wall');
    }
  }, [isInitializing, user, pathname, router]);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 w-full">
        <div className="flex flex-col items-center gap-6">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
            className="w-20 h-20 relative"
          >
            <Image src="/logo.png" alt="Carregando..." fill className="object-contain drop-shadow-2xl rounded-full" priority />
          </motion.div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <div className="w-6 h-6 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">
              Preparando ambiente...
            </p>
          </div>
        </div>
      </div>
    );
  }
  if (!user) {
    if (pathname !== '/auth/login' && pathname !== '/auth/register') {
      return null;
    }
    return <>{children}</>;
  }

  if (!user.isPaid && pathname !== '/payment-wall') {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-50/50 dark:bg-slate-950/50 border-r border-slate-200/50 dark:border-slate-800/50 transition-colors duration-300">
        <div className="p-8 flex items-center gap-3">
          <div className="w-12 h-12 relative group-hover:scale-110 transition-transform duration-500">
            <Image src="/logo.png" alt="Reforço Pro Logo" fill className="object-contain rounded-full" priority />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Reforço Pro</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 relative overflow-hidden",
                pathname === item.href 
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-semibold shadow-sm border border-slate-200/50 dark:border-slate-800/50" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-900/50"
              )}
            >
              {pathname === item.href && (
                <motion.div 
                  layoutId="active-nav"
                  className="absolute left-0 w-1 h-6 bg-blue-600 dark:bg-blue-500 rounded-r-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon size={20} className={cn("transition-transform duration-300 group-hover:scale-110", pathname === item.href ? "text-blue-600 dark:text-blue-400" : "text-slate-400")} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-6 space-y-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white transition-all duration-300 border border-transparent hover:border-slate-200/50 dark:hover:border-slate-800/50"
          >
            {mounted ? (
              <>
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                <span className="text-sm font-medium">{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>
              </>
            ) : (
              <div className="h-5 w-full bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg" />
            )}
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all duration-300"
          >
            <LogOut size={20} />
            <span className="text-sm font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-800/50 z-50 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around h-16 w-full px-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 h-full transition-all duration-300 relative",
                pathname === item.href 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-slate-400 dark:text-slate-500"
              )}
            >
              <div className={cn(
                "p-1 rounded-xl transition-all duration-300",
                pathname === item.href && "bg-blue-50 dark:bg-blue-900/30 scale-105"
              )}>
                <item.icon size={18} strokeWidth={pathname === item.href ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-tighter transition-all duration-300 truncate w-full text-center px-0.5",
                pathname === item.href ? "opacity-100 translate-y-0" : "opacity-60 translate-y-0.5"
              )}>
                {item.shortLabel}
              </span>
              {pathname === item.href && (
                <motion.div 
                  layoutId="active-nav-mobile"
                  className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 dark:bg-blue-400 rounded-b-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          ))}
        </div>
      </nav>
      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-950">

        {/* Page Title Header (Desktop & Mobile) */}
        <div className="flex items-center justify-between px-4 md:px-8 py-2 md:py-10 bg-transparent">
          <div className="flex items-center gap-3 md:gap-6">
            {showBackButton && (
              <button 
                onClick={() => router.back()}
                className="p-1.5 md:p-3 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg md:rounded-2xl transition-all duration-300 premium-shadow active:scale-95"
              >
                <ChevronLeft size={16} className="md:w-6 md:h-6" />
              </button>
            )}
            <div>
              <h1 className="text-base md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{title || 'Reforço Pro'}</h1>
              <p className="hidden md:block text-slate-500 dark:text-slate-400 text-sm mt-1">Gerencie seu negócio com elegância.</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{user.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Professor</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-bold text-lg border border-blue-200/50 dark:border-blue-800/50 premium-shadow overflow-hidden">
              {user.photo ? (
                <Image src={user.photo} alt={user.name} width={48} height={48} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                user.name.charAt(0)
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-8 pb-24 md:pb-12">
          {children}
        </main>
      </div>
    </div>
  );
}
