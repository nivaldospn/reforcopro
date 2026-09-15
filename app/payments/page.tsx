'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Calendar,
  DollarSign,
  Edit2,
  Trash2,
  User,
  ChevronDown,
  RefreshCw,
  LayoutGrid,
  List,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Activity,
  FileText,
  CreditCard,
  ArrowLeftRight,
  BookOpen,
  SlidersHorizontal,
  ChevronRight,
  Info,
  MoreVertical,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import type { FinancialEntry, FinancialExpense, AccountPayable, FinancialEntryCategory, FinancialPaymentMethod, FinancialEntryStatus, FinancialExpenseCategory, FinancialExpenseStatus, AccountPayableStatus } from '@/lib/store';
import { Layout } from '@/components/Layout';
import { motion, AnimatePresence } from 'motion/react';
import {
  format, isBefore, startOfDay, parseISO,
  startOfMonth, endOfMonth, isWithinInterval,
  startOfWeek, endOfWeek, startOfYear, endOfYear,
  subMonths, isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

type FinancialTab = 'dashboard' | 'mensalidades' | 'entradas' | 'saidas' | 'a-receber' | 'a-pagar' | 'fluxo' | 'relatorios';
type PeriodFilter = 'hoje' | 'semana' | 'mes' | 'mes-anterior' | 'ano' | 'personalizado';

// ─── Constants ────────────────────────────────────────────────────────────────

const ENTRY_CATEGORIES: Record<FinancialEntryCategory, string> = {
  mensalidade: 'Mensalidade', aula_particular: 'Aula Particular',
  matricula: 'Matrícula', material: 'Material', outros: 'Outros'
};

const EXPENSE_CATEGORIES: Record<FinancialExpenseCategory, string> = {
  aluguel: 'Aluguel', energia: 'Energia', internet: 'Internet',
  material_escolar: 'Material Escolar', funcionarios: 'Funcionários',
  transporte: 'Transporte', marketing: 'Marketing', equipamentos: 'Equipamentos',
  manutencao: 'Manutenção', outros: 'Outros'
};

const PAYMENT_METHODS: Record<FinancialPaymentMethod, string> = {
  pix: 'Pix', cartao: 'Cartão', dinheiro: 'Dinheiro',
  transferencia: 'Transferência', outro: 'Outro'
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function getPeriodRange(period: PeriodFilter, customStart?: string, customEnd?: string): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case 'hoje': return { start: startOfDay(now), end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59) };
    case 'semana': return { start: startOfWeek(now, { locale: ptBR }), end: endOfWeek(now, { locale: ptBR }) };
    case 'mes': return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'mes-anterior': { const prev = subMonths(now, 1); return { start: startOfMonth(prev), end: endOfMonth(prev) }; }
    case 'ano': return { start: startOfYear(now), end: endOfYear(now) };
    case 'personalizado':
      return { start: customStart ? parseISO(customStart) : startOfMonth(now), end: customEnd ? parseISO(customEnd) : endOfMonth(now) };
    default: return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

function inRange(dateStr: string, range: { start: Date; end: Date }) {
  try { return isWithinInterval(parseISO(dateStr), range); } catch { return false; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, subtitle, onAction, actionLabel }: {
  icon: React.ElementType; title: string; subtitle: string; onAction?: () => void; actionLabel?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-24 flex flex-col items-center justify-center text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full animate-pulse" />
        <div className="relative w-32 h-32 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 rounded-[2.5rem] flex items-center justify-center border border-slate-200/50 dark:border-slate-800/50 shadow-2xl">
          <Icon size={56} strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 max-w-xs mx-auto leading-relaxed font-medium">{subtitle}</p>
      {onAction && actionLabel && (
        <button onClick={onAction} className="mt-8 flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-600/25 hover:scale-105 transition-all active:scale-95">
          <Plus size={18} />{actionLabel}
        </button>
      )}
    </motion.div>
  );
}

function StatCard({ label, value, icon: Icon, color, trend }: {
  label: string; value: string; icon: React.ElementType; color: 'blue' | 'emerald' | 'rose' | 'amber' | 'violet'; trend?: 'up' | 'down' | 'neutral';
}) {
  const colorMap = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    rose: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    violet: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
  };
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="premium-card p-5 sm:p-6 group relative overflow-hidden">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3', colorMap[color])}>
          <Icon size={20} className="sm:w-6 sm:h-6" />
        </div>
        {trend && (
          <div className={cn('flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full', trend === 'up' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : trend === 'down' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-500')}>
            {trend === 'up' ? <ArrowUpRight size={10} /> : trend === 'down' ? <ArrowDownRight size={10} /> : null}
          </div>
        )}
      </div>
      <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
      <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">{value}</p>
    </motion.div>
  );
}

// ─── Period Selector ─────────────────────────────────────────────────────────

function PeriodSelector({ period, setPeriod, customStart, setCustomStart, customEnd, setCustomEnd }: {
  period: PeriodFilter; setPeriod: (p: PeriodFilter) => void;
  customStart: string; setCustomStart: (s: string) => void;
  customEnd: string; setCustomEnd: (s: string) => void;
}) {
  const options: { value: PeriodFilter; label: string }[] = [
    { value: 'hoje', label: 'Hoje' },
    { value: 'semana', label: 'Esta Semana' },
    { value: 'mes', label: 'Este Mês' },
    { value: 'mes-anterior', label: 'Mês Anterior' },
    { value: 'ano', label: 'Este Ano' },
    { value: 'personalizado', label: 'Personalizado' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map(o => (
        <button key={o.value} onClick={() => setPeriod(o.value)}
          className={cn('px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200', period === o.value ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200/60 dark:border-slate-800/60 hover:border-blue-400 hover:text-blue-600')}>
          {o.label}
        </button>
      ))}
      {period === 'personalizado' && (
        <div className="flex items-center gap-2 mt-1 sm:mt-0">
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500" />
          <span className="text-slate-400 text-xs font-bold">até</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500" />
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FinanceiroPage() {
  const {
    payments, students, guardians,
    addPayment, updatePayment, deletePayment, togglePaymentStatus,
    whatsappConnection, sendManualPaymentReminder, clearData,
    financialEntries, financialExpenses, accountsPayable,
    addFinancialEntry, updateFinancialEntry, deleteFinancialEntry,
    addFinancialExpense, updateFinancialExpense, deleteFinancialExpense,
    addAccountPayable, updateAccountPayable, deleteAccountPayable,
  } = useApp();

  const [activeTab, setActiveTab] = useState<FinancialTab>('dashboard');
  const [period, setPeriod] = useState<PeriodFilter>('mes');
  const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const range = useMemo(() => getPeriodRange(period, customStart, customEnd), [period, customStart, customEnd]);

  const tabs: { id: FinancialTab; label: string; shortLabel: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Painel', icon: Activity },
    { id: 'mensalidades', label: 'Mensalidades', shortLabel: 'Mensais', icon: CreditCard },
    { id: 'entradas', label: 'Entradas', shortLabel: 'Entradas', icon: ArrowUpRight },
    { id: 'saidas', label: 'Saídas', shortLabel: 'Saídas', icon: ArrowDownRight },
    { id: 'a-receber', label: 'A Receber', shortLabel: 'Receber', icon: TrendingUp },
    { id: 'a-pagar', label: 'A Pagar', shortLabel: 'Pagar', icon: TrendingDown },
    { id: 'fluxo', label: 'Fluxo de Caixa', shortLabel: 'Fluxo', icon: ArrowLeftRight },
    { id: 'relatorios', label: 'Relatórios', shortLabel: 'Relats', icon: BarChart3 },
  ];

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mobileMenuOpen]);

  // Menu items for the ⋮ dropdown (all tabs except dashboard)
  const mobileMenuTabs = tabs.filter(t => t.id !== 'dashboard');

  return (
    <Layout title="Financeiro">
      {/* ── Desktop Tab Navigation (hidden on mobile) ── */}
      <div className="hidden md:block mb-8">
        <div className="flex overflow-x-auto no-scrollbar gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
          {tabs.map(tab => (
            <button key={tab.id} id={`fin-tab-${tab.id}`} onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all duration-200 flex-shrink-0',
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              )}>
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Mobile: ⋮ dropdown button (visible only on mobile) ── */}
      <div className="md:hidden flex items-center justify-between mb-4">
        {/* Active section label */}
        <div className="flex items-center gap-2">
          {(() => { const t = tabs.find(t => t.id === activeTab); return t ? <><t.icon size={16} className="text-blue-600 dark:text-blue-400" /><span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">{t.label}</span></> : null; })()}
        </div>

        {/* Three-dot menu */}
        <div ref={mobileMenuRef} className="relative">
          <button
            id="fin-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label="Opções do Financeiro"
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-200 active:scale-95',
              mobileMenuOpen
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60 text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600'
            )}
          >
            <MoreVertical size={18} strokeWidth={2.5} />
          </button>

          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                id="fin-mobile-menu"
                initial={{ opacity: 0, scale: 0.92, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -6 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 top-11 z-50 min-w-[200px] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-2xl shadow-slate-900/15 dark:shadow-slate-950/40 overflow-hidden"
              >
                <div className="py-1.5">
                  {mobileMenuTabs.map((tab, idx) => (
                    <button
                      key={tab.id}
                      id={`fin-mobile-tab-${tab.id}`}
                      onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                      className={cn(
                        'flex items-center gap-3 w-full px-4 py-3 text-sm font-bold transition-all duration-150 text-left',
                        activeTab === tab.id
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      )}
                    >
                      <tab.icon size={16} className={activeTab === tab.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
                      {tab.label}
                      {activeTab === tab.id && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
          {activeTab === 'dashboard' && <DashboardTab period={period} setPeriod={setPeriod} customStart={customStart} setCustomStart={setCustomStart} customEnd={customEnd} setCustomEnd={setCustomEnd} range={range} payments={payments} students={students} financialEntries={financialEntries} financialExpenses={financialExpenses} accountsPayable={accountsPayable} setActiveTab={setActiveTab} />}
          {activeTab === 'mensalidades' && <MensalidadesTab payments={payments} students={students} guardians={guardians} addPayment={addPayment} updatePayment={updatePayment} deletePayment={deletePayment} togglePaymentStatus={togglePaymentStatus} whatsappConnection={whatsappConnection} sendManualPaymentReminder={sendManualPaymentReminder} clearData={clearData} />}
          {activeTab === 'entradas' && <EntradasTab entries={financialEntries} onAdd={addFinancialEntry} onUpdate={updateFinancialEntry} onDelete={deleteFinancialEntry} />}
          {activeTab === 'saidas' && <SaidasTab expenses={financialExpenses} onAdd={addFinancialExpense} onUpdate={updateFinancialExpense} onDelete={deleteFinancialExpense} />}
          {activeTab === 'a-receber' && <AReceberTab payments={payments} students={students} guardians={guardians} entries={financialEntries} />}
          {activeTab === 'a-pagar' && <APagarTab accounts={accountsPayable} onAdd={addAccountPayable} onUpdate={updateAccountPayable} onDelete={deleteAccountPayable} />}
          {activeTab === 'fluxo' && <FluxoCaixaTab payments={payments} students={students} entries={financialEntries} expenses={financialExpenses} accounts={accountsPayable} />}
          {activeTab === 'relatorios' && <RelatoriosTab payments={payments} students={students} entries={financialEntries} expenses={financialExpenses} accounts={accountsPayable} />}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

function DashboardTab({ period, setPeriod, customStart, setCustomStart, customEnd, setCustomEnd, range, payments, students, financialEntries, financialExpenses, accountsPayable, setActiveTab }: {
  period: PeriodFilter; setPeriod: (p: PeriodFilter) => void;
  customStart: string; setCustomStart: (s: string) => void;
  customEnd: string; setCustomEnd: (s: string) => void;
  range: { start: Date; end: Date };
  payments: any[]; students: any[];
  financialEntries: FinancialEntry[]; financialExpenses: FinancialExpense[]; accountsPayable: AccountPayable[];
  setActiveTab: (t: FinancialTab) => void;
}) {
  const now = startOfDay(new Date());

  const stats = useMemo(() => {
    // Entradas recebidas no período (mensalidades pagas + entradas manuais recebidas)
    const paidMensalidadesInPeriod = payments
      .filter(p => p.status === 'paid' && inRange(p.date, range))
      .reduce((acc, p) => acc + p.amount, 0);

    const manualEntriesReceived = financialEntries
      .filter(e => e.status === 'recebido' && inRange(e.date, range))
      .reduce((acc, e) => acc + e.amount, 0);

    const totalEntradas = paidMensalidadesInPeriod + manualEntriesReceived;

    // Saídas pagas no período
    const paidExpenses = financialExpenses
      .filter(e => e.status === 'pago' && inRange(e.date, range))
      .reduce((acc, e) => acc + e.amount, 0);

    const paidAccounts = accountsPayable
      .filter(a => a.status === 'pago' && a.paidAt && inRange(a.paidAt, range))
      .reduce((acc, a) => acc + a.amount, 0);

    const totalSaidas = paidExpenses + paidAccounts;

    const saldoAtual = totalEntradas - totalSaidas;
    const resultado = totalEntradas - totalSaidas;

    // A receber
    const pendingMensalidades = payments
      .filter(p => p.status === 'pending')
      .reduce((acc, p) => acc + p.amount, 0);

    const pendingEntries = financialEntries
      .filter(e => e.status === 'pendente')
      .reduce((acc, e) => acc + e.amount, 0);

    const totalAReceber = pendingMensalidades + pendingEntries;

    // A pagar
    const pendingAccounts = accountsPayable
      .filter(a => a.status === 'pendente')
      .reduce((acc, a) => acc + a.amount, 0);

    const pendingExpenses = financialExpenses
      .filter(e => e.status === 'pendente')
      .reduce((acc, e) => acc + e.amount, 0);

    const totalAPagar = pendingAccounts + pendingExpenses;

    // Vencidos
    const overdueMensalidades = payments
      .filter(p => p.status === 'pending' && isBefore(parseISO(p.date), now))
      .reduce((acc, p) => acc + p.amount, 0);

    const overdueAccounts = accountsPayable
      .filter(a => (a.status === 'pendente' || a.status === 'vencido') && isBefore(parseISO(a.dueDate), now))
      .reduce((acc, a) => acc + a.amount, 0);

    const totalVencidos = overdueMensalidades + overdueAccounts;

    return { totalEntradas, totalSaidas, saldoAtual, resultado, totalAReceber, totalAPagar, totalVencidos };
  }, [payments, financialEntries, financialExpenses, accountsPayable, range, now]);

  // Mini chart data — últimos 6 meses
  const chartData = useMemo(() => {
    const months: { name: string; entradas: number; saidas: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const r = { start: startOfMonth(d), end: endOfMonth(d) };
      const name = format(d, 'MMM', { locale: ptBR });
      const entradas = payments.filter(p => p.status === 'paid' && inRange(p.date, r)).reduce((a, p) => a + p.amount, 0)
        + financialEntries.filter(e => e.status === 'recebido' && inRange(e.date, r)).reduce((a, e) => a + e.amount, 0);
      const saidas = financialExpenses.filter(e => e.status === 'pago' && inRange(e.date, r)).reduce((a, e) => a + e.amount, 0)
        + accountsPayable.filter(a => a.status === 'pago' && a.paidAt && inRange(a.paidAt, r)).reduce((a, acc) => a + acc.amount, 0);
      months.push({ name: name.charAt(0).toUpperCase() + name.slice(1), entradas, saidas });
    }
    return months;
  }, [payments, financialEntries, financialExpenses, accountsPayable]);

  const quickActions: { label: string; tab: FinancialTab; icon: React.ElementType; color: string }[] = [
    { label: 'Nova Entrada', tab: 'entradas', icon: ArrowUpRight, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Nova Saída', tab: 'saidas', icon: ArrowDownRight, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' },
    { label: 'Conta a Pagar', tab: 'a-pagar', icon: TrendingDown, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Mensalidades', tab: 'mensalidades', icon: CreditCard, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
  ];

  return (
    <div className="space-y-6 md:space-y-8 pb-8">
      {/* Period Selector */}
      <div className="premium-card p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} className="text-slate-400" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Período de análise</p>
        </div>
        <PeriodSelector period={period} setPeriod={setPeriod} customStart={customStart} setCustomStart={setCustomStart} customEnd={customEnd} setCustomEnd={setCustomEnd} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Saldo Atual" value={fmtCurrency(stats.saldoAtual)} icon={Wallet} color={stats.saldoAtual >= 0 ? 'emerald' : 'rose'} />
        <StatCard label="Total Entradas" value={fmtCurrency(stats.totalEntradas)} icon={ArrowUpRight} color="blue" trend="up" />
        <StatCard label="Total Saídas" value={fmtCurrency(stats.totalSaidas)} icon={ArrowDownRight} color="rose" trend="down" />
        <StatCard label="Resultado" value={fmtCurrency(stats.resultado)} icon={TrendingUp} color={stats.resultado >= 0 ? 'emerald' : 'rose'} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="A Receber" value={fmtCurrency(stats.totalAReceber)} icon={TrendingUp} color="blue" />
        <StatCard label="A Pagar" value={fmtCurrency(stats.totalAPagar)} icon={TrendingDown} color="amber" />
        <StatCard label="Valores Vencidos" value={fmtCurrency(stats.totalVencidos)} icon={AlertCircle} color="rose" />
      </div>

      {/* Mini Chart */}
      <div className="premium-card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Evolução Financeira</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Entradas vs Saídas — últimos 6 meses</p>
          </div>
          <BarChart3 size={20} className="text-slate-400" />
        </div>
        {chartData.every(d => d.entradas === 0 && d.saidas === 0) ? (
          <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
            <div className="text-center">
              <Activity size={32} className="mx-auto mb-2 opacity-30" />
              <p className="font-medium">Nenhuma movimentação registrada</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <Tooltip formatter={(v: any) => fmtCurrency(Number(v))} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700 }} />
              <Bar dataKey="entradas" name="Entradas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map(qa => (
            <button key={qa.tab} onClick={() => setActiveTab(qa.tab)}
              className="premium-card p-4 flex flex-col items-start gap-3 hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-200 group text-left">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110', qa.color)}>
                <qa.icon size={18} />
              </div>
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 tracking-tight">{qa.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: MENSALIDADES (preserved from original)
// ═══════════════════════════════════════════════════════════════════════════════

function MensalidadesTab({ payments, students, guardians, addPayment, updatePayment, deletePayment, togglePaymentStatus, whatsappConnection, sendManualPaymentReminder, clearData }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [selectedPaymentForWa, setSelectedPaymentForWa] = useState<any>(null);
  const [waMessagePreview, setWaMessagePreview] = useState('');
  const [isSendingWa, setIsSendingWa] = useState(false);
  const [waSendResult, setWaSendResult] = useState<{ status: 'idle' | 'success' | 'error'; message?: string }>({ status: 'idle' });
  const [formData, setFormData] = useState({ studentId: '', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), status: 'pending' as 'paid' | 'pending' });
  const [mounted, setMounted] = useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  const now = startOfDay(new Date());

  const stats = useMemo(() => {
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const received = payments.filter((p: any) => p.status === 'paid' && isWithinInterval(parseISO(p.date), { start: currentMonthStart, end: currentMonthEnd })).reduce((acc: number, p: any) => acc + p.amount, 0);
    const pending = payments.filter((p: any) => p.status === 'pending').reduce((acc: number, p: any) => acc + p.amount, 0);
    const overdue = payments.filter((p: any) => p.status === 'pending' && isBefore(parseISO(p.date), now)).reduce((acc: number, p: any) => acc + p.amount, 0);
    return { received, pending, overdue };
  }, [payments]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    payments.forEach((p: any) => { months.add(format(parseISO(p.date), 'yyyy-MM')); });
    return Array.from(months).sort().reverse();
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p: any) => {
      const student = students.find((s: any) => s.id === p.studentId);
      const matchesSearch = !searchTerm || student?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const pDate = parseISO(p.date);
      const isOverdue = p.status === 'pending' && isBefore(pDate, now);
      let matchesStatus = true;
      if (statusFilter === 'paid') matchesStatus = p.status === 'paid';
      if (statusFilter === 'pending') matchesStatus = p.status === 'pending' && !isOverdue;
      if (statusFilter === 'overdue') matchesStatus = isOverdue;
      const matchesMonth = monthFilter === 'all' || format(pDate, 'yyyy-MM') === monthFilter;
      return matchesSearch && matchesStatus && matchesMonth;
    }).sort((a: any, b: any) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [payments, students, searchTerm, statusFilter, monthFilter]);

  const handleWhatsAppCharge = (payment: any, student: any, guardian: any) => {
    if (!guardian || (!guardian.whatsapp && !guardian.phone)) { alert('Responsável não possui telefone cadastrado.'); return; }
    const rawPhone = guardian.whatsapp || guardian.phone;
    let phone = rawPhone.replace(/\D/g, '');
    if (!phone.startsWith('55') && (phone.length === 10 || phone.length === 11)) phone = '55' + phone;
    const amount = payment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formattedDate = format(parseISO(payment.date), 'dd/MM/yyyy');
    const defaultMsg = `Olá, ${guardian.name.split(' ')[0]}! 😊\n\nPassando para lembrar que a mensalidade do aluno ${student?.name || 'Aluno'} vence ou venceu no valor de ${amount} (vencimento: ${formattedDate}).\n\nObrigado!`;
    setSelectedPaymentForWa({ payment, student, guardian, phone });
    setWaMessagePreview(defaultMsg);
    setWaSendResult({ status: 'idle' });
    setIsWaModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPayment) { updatePayment(editingPayment, { ...formData, amount: Number(formData.amount) }); }
    else { addPayment({ ...formData, amount: Number(formData.amount) }); }
    closeModal();
  };

  const openEditModal = (payment: any) => {
    setEditingPayment(payment.id);
    setFormData({ studentId: payment.studentId, amount: payment.amount, date: payment.date, status: payment.status });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false); setEditingPayment(null);
    setFormData({ studentId: '', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), status: 'pending' });
  };

  const getStatusInfo = (payment: any) => {
    const pDate = parseISO(payment.date);
    if (payment.status === 'paid') return { label: 'Pago', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50', icon: <CheckCircle2 size={14} /> };
    if (isBefore(pDate, now)) return { label: 'Atrasado', color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/50', icon: <AlertCircle size={14} /> };
    return { label: 'Pendente', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50', icon: <Clock size={14} /> };
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-6">
        {[
          { label: 'Receita Mensal', value: stats.received, color: 'emerald', icon: DollarSign },
          { label: 'Total Pendente', value: stats.pending, color: 'amber', icon: Clock },
          { label: 'Total Atrasado', value: stats.overdue, color: 'rose', icon: AlertCircle },
        ].map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className={cn('premium-card p-4 sm:p-6 group relative overflow-hidden', item.color === 'rose' && 'border-rose-100 dark:border-rose-900/30')}>
            <div className={cn('w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4 transition-transform group-hover:scale-110 group-hover:rotate-3', `bg-${item.color}-100 dark:bg-${item.color}-900/30 text-${item.color}-600 dark:text-${item.color}-400`)}>
              <item.icon size={20} className="sm:w-6 sm:h-6" />
            </div>
            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
            <h3 className={cn('text-lg sm:text-3xl font-black tracking-tighter truncate', item.color === 'rose' ? 'text-rose-600' : 'text-slate-900 dark:text-white')}>
              <span className="text-[10px] sm:text-sm font-bold mr-0.5 opacity-50">R$</span>
              {mounted ? item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
            </h3>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" size={18} />
            <input type="text" placeholder="Buscar por nome do aluno..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm" />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="pl-4 pr-10 py-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl outline-none focus:border-blue-500 appearance-none font-bold text-sm cursor-pointer text-slate-700 dark:text-slate-300">
                <option value="all">Todos Status</option><option value="paid">Pagos</option><option value="pending">Pendentes</option><option value="overdue">Atrasados</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
            </div>
            <div className="relative">
              <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="pl-4 pr-10 py-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl outline-none focus:border-blue-500 appearance-none font-bold text-sm cursor-pointer text-slate-700 dark:text-slate-300">
                <option value="all">Todos os Meses</option>
                {availableMonths.map(m => <option key={m} value={m}>{format(parseISO(`${m}-01`), 'MMMM yyyy', { locale: ptBR })}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button onClick={() => setViewMode('table')} className={cn('p-2.5 rounded-lg transition-all', viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400')}><List size={18} /></button>
            <button onClick={() => setViewMode('grid')} className={cn('p-2.5 rounded-lg transition-all', viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400')}><LayoutGrid size={18} /></button>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:shadow-2xl hover:-translate-y-0.5 transition-all active:scale-95 whitespace-nowrap">
            <Plus size={18} />Nova Mensalidade
          </button>
        </div>
      </div>

      {/* Table */}
      {filteredPayments.length === 0 ? (
        <EmptyState icon={CreditCard} title="Nenhum pagamento encontrado" subtitle="Registre a primeira mensalidade para começar a controlar seu financeiro." onAction={() => setIsModalOpen(true)} actionLabel="Registrar Mensalidade" />
      ) : (
        <>
          <div className={cn('premium-card overflow-hidden', viewMode === 'grid' ? 'hidden' : 'hidden lg:block')}>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                    {['Aluno / Responsável', 'Vencimento', 'Valor', 'Status', 'Ações'].map(h => (
                      <th key={h} className={cn('px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]', h === 'Ações' && 'text-right')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  <AnimatePresence mode="popLayout">
                    {filteredPayments.map((payment: any, i: number) => {
                      const student = students.find((s: any) => s.id === payment.studentId);
                      const guardian = guardians.find((g: any) => g.id === student?.guardianId);
                      const status = getStatusInfo(payment);
                      return (
                        <motion.tr key={payment.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.02 }} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-all">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center font-black border border-blue-100/50 dark:border-blue-800/50 group-hover:scale-110 transition-transform">
                                {student?.name.charAt(0) || '?'}
                              </div>
                              <div>
                                <p className="font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{student?.name || 'Aluno Desconhecido'}</p>
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><User size={10} />{guardian?.name || 'Responsável não vinculado'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{format(parseISO(payment.date), 'dd/MM/yyyy')}</span>
                            <p className="text-[10px] text-slate-400 mt-0.5">{format(parseISO(payment.date), 'EEEE', { locale: ptBR })}</p>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-lg font-black text-slate-900 dark:text-white"><span className="text-xs opacity-40 mr-1">R$</span>{payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </td>
                          <td className="px-8 py-5"><span className={cn('status-badge', status.color)}>{status.icon}{status.label}</span></td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {payment.status !== 'paid' && (
                                <button onClick={() => handleWhatsAppCharge(payment, student, guardian)} className="p-2.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all" title="Cobrar via WhatsApp"><MessageCircle size={18} /></button>
                              )}
                              <button onClick={() => togglePaymentStatus(payment.id)} className={cn('p-2.5 rounded-xl transition-all', payment.status === 'paid' ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 bg-emerald-50/50')} title={payment.status === 'paid' ? 'Marcar Pendente' : 'Marcar Pago'}>
                                {payment.status === 'paid' ? <Clock size={18} /> : <CheckCircle2 size={18} />}
                              </button>
                              <button onClick={() => openEditModal(payment)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all" title="Editar"><Edit2 size={18} /></button>
                              <button onClick={() => deletePayment(payment.id)} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all" title="Excluir"><Trash2 size={18} /></button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>

          {/* Grid / Mobile */}
          <div className={cn('grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4', viewMode === 'table' ? 'lg:hidden' : '')}>
            <AnimatePresence mode="popLayout">
              {filteredPayments.map((payment: any, i: number) => {
                const student = students.find((s: any) => s.id === payment.studentId);
                const guardian = guardians.find((g: any) => g.id === student?.guardianId);
                const status = getStatusInfo(payment);
                return (
                  <motion.div key={payment.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.04 }} className="premium-card p-6">
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center font-black text-lg border border-blue-100/50 dark:border-blue-800/50">{student?.name.charAt(0) || '?'}</div>
                        <div><h4 className="font-black text-slate-900 dark:text-white">{student?.name || 'Aluno'}</h4><p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><User size={10} />{guardian?.name || 'Responsável'}</p></div>
                      </div>
                      <span className={cn('status-badge', status.color)}>{status.label}</span>
                    </div>
                    <div className="space-y-2 mb-5">
                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-2"><Calendar size={13} />Vencimento</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">{format(parseISO(payment.date), 'dd/MM/yyyy')}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-2"><DollarSign size={13} />Valor</span>
                        <span className="text-lg font-black text-slate-900 dark:text-white">R$ {payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className={cn('grid gap-2', payment.status !== 'paid' ? 'grid-cols-4' : 'grid-cols-3')}>
                      {payment.status !== 'paid' && <button onClick={() => handleWhatsAppCharge(payment, student, guardian)} className="flex items-center justify-center py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/40"><MessageCircle size={16} /></button>}
                      <button onClick={() => togglePaymentStatus(payment.id)} className={cn('flex items-center justify-center py-3 rounded-xl transition-all', payment.status === 'paid' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20')}>{payment.status === 'paid' ? <Clock size={16} /> : <CheckCircle2 size={16} />}</button>
                      <button onClick={() => openEditModal(payment)} className="flex items-center justify-center py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl transition-all hover:bg-blue-100 dark:hover:bg-blue-900/40"><Edit2 size={16} /></button>
                      <button onClick={() => deletePayment(payment.id)} className="flex items-center justify-center py-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl transition-all hover:bg-rose-100 dark:hover:bg-rose-900/40"><Trash2 size={16} /></button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }} className="relative w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/50 dark:border-slate-800/50 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
                <div><h3 className="text-xl font-black text-slate-900 dark:text-white">{editingPayment ? 'Editar Mensalidade' : 'Nova Mensalidade'}</h3><p className="text-xs text-slate-500 mt-0.5">Preencha os dados da mensalidade.</p></div>
                <button onClick={closeModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Aluno</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select required value={formData.studentId} onChange={e => setFormData({ ...formData, studentId: e.target.value })} className="w-full pl-12 pr-10 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 appearance-none font-bold text-slate-700 dark:text-slate-300 text-sm cursor-pointer">
                      <option value="">Selecionar aluno...</option>
                      {students.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="number" required step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })} className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 font-black text-slate-900 dark:text-white" placeholder="0,00" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vencimento</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-900 dark:text-white" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Status</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['pending', 'paid'] as const).map(s => (
                      <label key={s} className={cn('flex items-center justify-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all', formData.status === s ? (s === 'paid' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20') : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800')}>
                        <input type="radio" name="status" className="hidden" checked={formData.status === s} onChange={() => setFormData({ ...formData, status: s })} />
                        {s === 'paid' ? <CheckCircle2 size={20} className={formData.status === 'paid' ? 'text-emerald-500' : 'text-slate-400'} /> : <Clock size={20} className={formData.status === 'pending' ? 'text-blue-500' : 'text-slate-400'} />}
                        <span className={cn('text-sm font-black uppercase tracking-wider', formData.status === s ? (s === 'paid' ? 'text-emerald-600' : 'text-blue-600') : 'text-slate-500')}>{s === 'paid' ? 'Pago' : 'Pendente'}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeModal} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:shadow-2xl hover:shadow-blue-600/30 hover:-translate-y-0.5 transition-all active:scale-95">{editingPayment ? 'Salvar' : 'Confirmar'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WhatsApp Modal */}
      <AnimatePresence>
        {isWaModalOpen && selectedPaymentForWa && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsWaModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} className="relative w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/60 dark:border-slate-800/60 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><MessageCircle size={20} /></div>
                  <div><h3 className="text-lg font-black text-slate-900 dark:text-white">Cobrança via WhatsApp</h3><p className="text-xs text-slate-400">Prévia da mensagem ao responsável</p></div>
                </div>
                <button onClick={() => setIsWaModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-400 font-bold">Aluno:</span><span className="font-black text-slate-800 dark:text-slate-200">{selectedPaymentForWa.student?.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-400 font-bold">Responsável:</span><span className="font-black text-slate-800 dark:text-slate-200">{selectedPaymentForWa.guardian?.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-400 font-bold">Telefone:</span><span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedPaymentForWa.phone}</span></div>
                <div className="flex justify-between"><span className="text-slate-400 font-bold">Conexão:</span><span className={cn('font-bold', whatsappConnection?.status === 'connected' ? 'text-emerald-600' : 'text-amber-500')}>{whatsappConnection?.status === 'connected' ? '🟢 Conectada' : '🟡 Desconectada'}</span></div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mensagem</label>
                <textarea rows={5} value={waMessagePreview} onChange={e => setWaMessagePreview(e.target.value)} className="w-full mt-2 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500 resize-none font-medium" />
              </div>
              {waSendResult.status !== 'idle' && (
                <div className={cn('flex items-center gap-2 p-3 rounded-xl text-sm font-bold', waSendResult.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
                  {waSendResult.status === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}{waSendResult.message}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setIsWaModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 font-black text-sm uppercase tracking-wider rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
                <button disabled={isSendingWa} onClick={async () => {
                  setIsSendingWa(true);
                  const r = await sendManualPaymentReminder(selectedPaymentForWa.payment.id, selectedPaymentForWa.phone, waMessagePreview);
                  setWaSendResult({ status: r.success ? 'success' : 'error', message: r.success ? 'Mensagem enviada com sucesso!' : r.error });
                  setIsSendingWa(false);
                  if (r.success) setTimeout(() => setIsWaModalOpen(false), 2000);
                }} className="flex-1 py-3 bg-emerald-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl hover:bg-emerald-600 transition-all disabled:opacity-60 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
                  {isSendingWa ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <MessageCircle size={16} />}
                  {isSendingWa ? 'Enviando...' : 'Enviar Agora'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERIC FORM MODAL for Entries & Expenses
// ═══════════════════════════════════════════════════════════════════════════════

type FinancialFormType = 'entrada' | 'saida';

function FinancialFormModal({ type, item, onClose, onSubmit }: {
  type: FinancialFormType;
  item?: FinancialEntry | FinancialExpense;
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const isEntrada = type === 'entrada';
  const [form, setForm] = useState({
    description: item?.description || '',
    amount: item?.amount || 0,
    date: item?.date || format(new Date(), 'yyyy-MM-dd'),
    category: item?.category || (isEntrada ? 'outros' : 'outros'),
    paymentMethod: (item as any)?.paymentMethod || 'pix',
    status: item?.status || (isEntrada ? 'recebido' : 'pago'),
    notes: item?.notes || '',
  });

  const categories = isEntrada ? ENTRY_CATEGORIES : EXPENSE_CATEGORIES;
  const statuses = isEntrada
    ? { recebido: 'Recebido', pendente: 'Pendente', cancelado: 'Cancelado' }
    : { pago: 'Pago', pendente: 'Pendente', cancelado: 'Cancelado' };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }} className="relative w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/50 dark:border-slate-800/50 max-h-[92vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {item ? 'Editar' : 'Nova'} {isEntrada ? 'Entrada' : 'Saída'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{isEntrada ? 'Registre uma receita financeira.' : 'Registre uma despesa.'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"><X size={20} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSubmit(form); onClose(); }} className="p-6 space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrição *</label>
            <input required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={isEntrada ? 'Ex: Mensalidade João' : 'Ex: Aluguel do espaço'} className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 font-medium text-slate-900 dark:text-white text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor *</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="number" required step="0.01" min="0" value={form.amount || ''} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 font-black text-slate-900 dark:text-white" placeholder="0,00" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data *</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-900 dark:text-white" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoria</label>
              <div className="relative">
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as any })} className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 appearance-none font-bold text-slate-700 dark:text-slate-300 text-sm cursor-pointer">
                  {Object.entries(categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Forma de Pag.</label>
              <div className="relative">
                <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value as any })} className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 appearance-none font-bold text-slate-700 dark:text-slate-300 text-sm cursor-pointer">
                  {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(statuses).map(([k, v]) => (
                <label key={k} className={cn('flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all text-xs font-black uppercase tracking-wider', form.status === k ? (k === 'recebido' || k === 'pago' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : k === 'pendente' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 'border-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-600') : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800')}>
                  <input type="radio" name="status" className="hidden" checked={form.status === k} onChange={() => setForm({ ...form, status: k as any })} />{v}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Observação</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Informações adicionais..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 font-medium text-slate-700 dark:text-slate-300 text-sm resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Cancelar</button>
            <button type="submit" className={cn('flex-1 py-4 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:-translate-y-0.5 transition-all active:scale-95 shadow-lg', isEntrada ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20' : 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/20')}>
              {item ? 'Salvar Alterações' : 'Confirmar Registro'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: ENTRADAS
// ═══════════════════════════════════════════════════════════════════════════════

function EntradasTab({ entries, onAdd, onUpdate, onDelete }: {
  entries: FinancialEntry[];
  onAdd: (e: Omit<FinancialEntry, 'id' | 'createdAt'>) => string;
  onUpdate: (id: string, e: Partial<FinancialEntry>) => void;
  onDelete: (id: string) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FinancialEntry | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | FinancialEntryStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | FinancialEntryCategory>('all');

  const filtered = useMemo(() => entries.filter(e => {
    const matchSearch = !search || e.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    const matchCat = categoryFilter === 'all' || e.category === categoryFilter;
    return matchSearch && matchStatus && matchCat;
  }), [entries, search, statusFilter, categoryFilter]);

  const totalRecebido = filtered.filter(e => e.status === 'recebido').reduce((a, e) => a + e.amount, 0);
  const totalPendente = filtered.filter(e => e.status === 'pendente').reduce((a, e) => a + e.amount, 0);

  const statusColors: Record<string, string> = {
    recebido: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50',
    pendente: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50',
    cancelado: 'text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700',
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Recebido" value={fmtCurrency(totalRecebido)} icon={CheckCircle2} color="emerald" />
        <StatCard label="Total Pendente" value={fmtCurrency(totalPendente)} icon={Clock} color="amber" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Buscar entradas..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl outline-none focus:border-blue-500 text-sm font-medium" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="pl-3 pr-8 py-3.5 text-xs bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl outline-none focus:border-blue-500 appearance-none font-bold cursor-pointer text-slate-700 dark:text-slate-300">
              <option value="all">Todos Status</option><option value="recebido">Recebido</option><option value="pendente">Pendente</option><option value="cancelado">Cancelado</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
          </div>
          <div className="relative">
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as any)} className="pl-3 pr-8 py-3.5 text-xs bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl outline-none focus:border-blue-500 appearance-none font-bold cursor-pointer text-slate-700 dark:text-slate-300">
              <option value="all">Todas Categorias</option>
              {Object.entries(ENTRY_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
          </div>
          <button onClick={() => { setEditingItem(undefined); setIsModalOpen(true); }} className="flex items-center gap-2 bg-gradient-to-br from-emerald-500 to-teal-600 text-white px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all active:scale-95 whitespace-nowrap">
            <Plus size={15} />Nova Entrada
          </button>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState icon={ArrowUpRight} title="Nenhuma entrada registrada" subtitle="Registre suas receitas manualmente para acompanhar o financeiro." onAction={() => setIsModalOpen(true)} actionLabel="Nova Entrada" />
      ) : (
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                  {['Descrição', 'Data', 'Categoria', 'Forma Pag.', 'Valor', 'Status', 'Ações'].map(h => (
                    <th key={h} className={cn('px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest', h === 'Ações' && 'text-right')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                <AnimatePresence mode="popLayout">
                  {filtered.map((entry, i) => (
                    <motion.tr key={entry.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.02 }} className="group hover:bg-emerald-50/20 dark:hover:bg-emerald-900/5 transition-all">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0"><ArrowUpRight size={14} /></div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{entry.description}</p>
                            {entry.notes && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[160px]">{entry.notes}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">{format(parseISO(entry.date), 'dd/MM/yyyy')}</td>
                      <td className="px-5 py-4 text-xs font-bold text-slate-500 whitespace-nowrap">{ENTRY_CATEGORIES[entry.category]}</td>
                      <td className="px-5 py-4 text-xs font-bold text-slate-500 whitespace-nowrap">{PAYMENT_METHODS[entry.paymentMethod]}</td>
                      <td className="px-5 py-4 whitespace-nowrap"><span className="text-base font-black text-emerald-600 dark:text-emerald-400">{fmtCurrency(entry.amount)}</span></td>
                      <td className="px-5 py-4"><span className={cn('status-badge', statusColors[entry.status])}>{entry.status === 'recebido' ? <CheckCircle2 size={11} /> : entry.status === 'pendente' ? <Clock size={11} /> : <X size={11} />}{entry.status === 'recebido' ? 'Recebido' : entry.status === 'pendente' ? 'Pendente' : 'Cancelado'}</span></td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditingItem(entry); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"><Edit2 size={15} /></button>
                          <button onClick={() => { if (confirm('Excluir esta entrada?')) onDelete(entry.id); }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <FinancialFormModal type="entrada" item={editingItem} onClose={() => { setIsModalOpen(false); setEditingItem(undefined); }}
            onSubmit={data => { if (editingItem) { onUpdate(editingItem.id, data); } else { onAdd(data); } }} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: SAÍDAS
// ═══════════════════════════════════════════════════════════════════════════════

function SaidasTab({ expenses, onAdd, onUpdate, onDelete }: {
  expenses: FinancialExpense[];
  onAdd: (e: Omit<FinancialExpense, 'id' | 'createdAt'>) => string;
  onUpdate: (id: string, e: Partial<FinancialExpense>) => void;
  onDelete: (id: string) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FinancialExpense | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | FinancialExpenseStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | FinancialExpenseCategory>('all');

  const filtered = useMemo(() => expenses.filter(e => {
    const matchSearch = !search || e.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    const matchCat = categoryFilter === 'all' || e.category === categoryFilter;
    return matchSearch && matchStatus && matchCat;
  }), [expenses, search, statusFilter, categoryFilter]);

  const totalPago = filtered.filter(e => e.status === 'pago').reduce((a, e) => a + e.amount, 0);
  const totalPendente = filtered.filter(e => e.status === 'pendente').reduce((a, e) => a + e.amount, 0);

  const statusColors: Record<string, string> = {
    pago: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50',
    pendente: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50',
    cancelado: 'text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700',
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Pago" value={fmtCurrency(totalPago)} icon={CheckCircle2} color="rose" />
        <StatCard label="Total Pendente" value={fmtCurrency(totalPendente)} icon={Clock} color="amber" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Buscar despesas..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl outline-none focus:border-blue-500 text-sm font-medium" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="pl-3 pr-8 py-3.5 text-xs bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl outline-none focus:border-blue-500 appearance-none font-bold cursor-pointer text-slate-700 dark:text-slate-300">
              <option value="all">Todos Status</option><option value="pago">Pago</option><option value="pendente">Pendente</option><option value="cancelado">Cancelado</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
          </div>
          <div className="relative">
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as any)} className="pl-3 pr-8 py-3.5 text-xs bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl outline-none focus:border-blue-500 appearance-none font-bold cursor-pointer text-slate-700 dark:text-slate-300">
              <option value="all">Todas Categorias</option>
              {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
          </div>
          <button onClick={() => { setEditingItem(undefined); setIsModalOpen(true); }} className="flex items-center gap-2 bg-gradient-to-br from-rose-500 to-pink-600 text-white px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-500/20 hover:shadow-rose-500/40 hover:-translate-y-0.5 transition-all active:scale-95 whitespace-nowrap">
            <Plus size={15} />Nova Saída
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ArrowDownRight} title="Nenhuma saída registrada" subtitle="Registre suas despesas para acompanhar os gastos do negócio." onAction={() => setIsModalOpen(true)} actionLabel="Nova Saída" />
      ) : (
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                  {['Descrição', 'Data', 'Categoria', 'Forma Pag.', 'Valor', 'Status', 'Ações'].map(h => (
                    <th key={h} className={cn('px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest', h === 'Ações' && 'text-right')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                <AnimatePresence mode="popLayout">
                  {filtered.map((expense, i) => (
                    <motion.tr key={expense.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.02 }} className="group hover:bg-rose-50/20 dark:hover:bg-rose-900/5 transition-all">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center shrink-0"><ArrowDownRight size={14} /></div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{expense.description}</p>
                            {expense.notes && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[160px]">{expense.notes}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">{format(parseISO(expense.date), 'dd/MM/yyyy')}</td>
                      <td className="px-5 py-4 text-xs font-bold text-slate-500 whitespace-nowrap">{EXPENSE_CATEGORIES[expense.category]}</td>
                      <td className="px-5 py-4 text-xs font-bold text-slate-500 whitespace-nowrap">{PAYMENT_METHODS[expense.paymentMethod]}</td>
                      <td className="px-5 py-4 whitespace-nowrap"><span className="text-base font-black text-rose-600 dark:text-rose-400">{fmtCurrency(expense.amount)}</span></td>
                      <td className="px-5 py-4"><span className={cn('status-badge', statusColors[expense.status])}>{expense.status === 'pago' ? <CheckCircle2 size={11} /> : expense.status === 'pendente' ? <Clock size={11} /> : <X size={11} />}{expense.status === 'pago' ? 'Pago' : expense.status === 'pendente' ? 'Pendente' : 'Cancelado'}</span></td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditingItem(expense); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"><Edit2 size={15} /></button>
                          <button onClick={() => { if (confirm('Excluir esta saída?')) onDelete(expense.id); }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <FinancialFormModal type="saida" item={editingItem} onClose={() => { setIsModalOpen(false); setEditingItem(undefined); }}
            onSubmit={data => { if (editingItem) { onUpdate(editingItem.id, data); } else { onAdd(data); } }} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: A RECEBER
// ═══════════════════════════════════════════════════════════════════════════════

function AReceberTab({ payments, students, guardians, entries }: {
  payments: any[]; students: any[]; guardians: any[]; entries: FinancialEntry[];
}) {
  const [filter, setFilter] = useState<'todas' | 'pendentes' | 'recebidas' | 'vencidas'>('pendentes');
  const [search, setSearch] = useState('');
  const now = startOfDay(new Date());

  // Unify mensalidades + manual entries
  const allReceivables = useMemo(() => {
    const fromPayments = payments.map(p => {
      const student = students.find((s: any) => s.id === p.studentId);
      const guardian = guardians.find((g: any) => g.id === student?.guardianId);
      const isOverdue = p.status === 'pending' && isBefore(parseISO(p.date), now);
      const status = p.status === 'paid' ? 'recebida' : isOverdue ? 'vencida' : 'pendente';
      return {
        id: p.id, description: `Mensalidade — ${student?.name || 'Aluno'}`,
        studentName: student?.name, guardianName: guardian?.name,
        amount: p.amount, dueDate: p.date,
        receivedAt: p.status === 'paid' ? p.date : undefined,
        status, origin: 'mensalidade' as const,
      };
    });
    const fromEntries = entries.map(e => ({
      id: e.id, description: e.description,
      studentName: undefined, guardianName: undefined,
      amount: e.amount, dueDate: e.date,
      receivedAt: e.status === 'recebido' ? e.date : undefined,
      status: e.status === 'recebido' ? 'recebida' : e.status === 'cancelado' ? 'cancelada' : (isBefore(parseISO(e.date), now) ? 'vencida' : 'pendente'),
      origin: 'entrada' as const,
    }));
    return [...fromPayments, ...fromEntries].sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());
  }, [payments, students, guardians, entries, now]);

  const filtered = useMemo(() => allReceivables.filter(r => {
    const matchSearch = !search || r.description.toLowerCase().includes(search.toLowerCase()) || r.studentName?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'todas' || (filter === 'pendentes' && r.status === 'pendente') || (filter === 'recebidas' && r.status === 'recebida') || (filter === 'vencidas' && r.status === 'vencida');
    return matchSearch && matchFilter;
  }), [allReceivables, filter, search]);

  const totals = useMemo(() => ({
    pendente: allReceivables.filter(r => r.status === 'pendente').reduce((a, r) => a + r.amount, 0),
    recebida: allReceivables.filter(r => r.status === 'recebida').reduce((a, r) => a + r.amount, 0),
    vencida: allReceivables.filter(r => r.status === 'vencida').reduce((a, r) => a + r.amount, 0),
  }), [allReceivables]);

  const statusColors: Record<string, string> = {
    pendente: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50',
    recebida: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50',
    vencida: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/50',
    cancelada: 'text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700',
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="A Receber" value={fmtCurrency(totals.pendente)} icon={TrendingUp} color="blue" />
        <StatCard label="Recebido" value={fmtCurrency(totals.recebida)} icon={CheckCircle2} color="emerald" />
        <StatCard label="Vencido" value={fmtCurrency(totals.vencida)} icon={AlertCircle} color="rose" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl outline-none focus:border-blue-500 text-sm font-medium" />
        </div>
        <div className="flex gap-2">
          {(['todas', 'pendentes', 'recebidas', 'vencidas'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={cn('px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all', filter === f ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200/60 dark:border-slate-800/60')}>{f}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={TrendingUp} title="Nenhuma conta a receber" subtitle="As mensalidades e entradas pendentes aparecerão aqui." />
      ) : (
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                  {['Descrição', 'Aluno / Responsável', 'Vencimento', 'Valor', 'Status', 'Origem'].map(h => (
                    <th key={h} className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                <AnimatePresence mode="popLayout">
                  {filtered.map((r, i) => (
                    <motion.tr key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.02 }} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-white text-sm max-w-[180px] truncate">{r.description}</td>
                      <td className="px-5 py-4">
                        {r.studentName ? (
                          <div><p className="text-xs font-bold text-slate-700 dark:text-slate-300">{r.studentName}</p><p className="text-[10px] text-slate-400">{r.guardianName || '—'}</p></div>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">{format(parseISO(r.dueDate), 'dd/MM/yyyy')}</td>
                      <td className="px-5 py-4 whitespace-nowrap"><span className="text-base font-black text-blue-600 dark:text-blue-400">{fmtCurrency(r.amount)}</span></td>
                      <td className="px-5 py-4"><span className={cn('status-badge', statusColors[r.status] || statusColors.cancelada)}>{r.status}</span></td>
                      <td className="px-5 py-4"><span className={cn('px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider', r.origin === 'mensalidade' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'bg-violet-50 dark:bg-violet-900/20 text-violet-600')}>{r.origin === 'mensalidade' ? 'Mensalidade' : 'Entrada'}</span></td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: A PAGAR
// ═══════════════════════════════════════════════════════════════════════════════

function APagarTab({ accounts, onAdd, onUpdate, onDelete }: {
  accounts: AccountPayable[];
  onAdd: (a: Omit<AccountPayable, 'id' | 'createdAt'>) => string;
  onUpdate: (id: string, a: Partial<AccountPayable>) => void;
  onDelete: (id: string) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AccountPayable | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AccountPayableStatus>('all');
  const now = startOfDay(new Date());

  const processedAccounts = useMemo(() => accounts.map(a => {
    let status: AccountPayableStatus = a.status;
    if (a.status === 'pendente' && isBefore(parseISO(a.dueDate), now)) status = 'vencido';
    return { ...a, computedStatus: status };
  }), [accounts, now]);

  const filtered = useMemo(() => processedAccounts.filter(a => {
    const matchSearch = !search || a.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.computedStatus === statusFilter;
    return matchSearch && matchStatus;
  }), [processedAccounts, search, statusFilter]);

  const totals = useMemo(() => ({
    pendente: processedAccounts.filter(a => a.computedStatus === 'pendente').reduce((s, a) => s + a.amount, 0),
    pago: processedAccounts.filter(a => a.computedStatus === 'pago').reduce((s, a) => s + a.amount, 0),
    vencido: processedAccounts.filter(a => a.computedStatus === 'vencido').reduce((s, a) => s + a.amount, 0),
  }), [processedAccounts]);

  const statusColors: Record<string, string> = {
    pendente: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50',
    pago: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50',
    vencido: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/50',
    cancelado: 'text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700',
  };

  const [form, setForm] = useState({
    description: '', amount: 0, dueDate: format(new Date(), 'yyyy-MM-dd'),
    paidAt: '', category: 'outros' as FinancialExpenseCategory, status: 'pendente' as AccountPayableStatus, notes: '',
  });

  const openAdd = () => { setForm({ description: '', amount: 0, dueDate: format(new Date(), 'yyyy-MM-dd'), paidAt: '', category: 'outros', status: 'pendente', notes: '' }); setEditingItem(undefined); setIsModalOpen(true); };
  const openEdit = (a: AccountPayable) => { setEditingItem(a); setForm({ description: a.description, amount: a.amount, dueDate: a.dueDate, paidAt: a.paidAt || '', category: a.category, status: a.status, notes: a.notes || '' }); setIsModalOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, paidAt: form.paidAt || undefined };
    if (editingItem) { onUpdate(editingItem.id, payload); } else { onAdd(payload); }
    setIsModalOpen(false);
  };

  const markPaid = (a: AccountPayable) => {
    onUpdate(a.id, { status: 'pago', paidAt: format(new Date(), 'yyyy-MM-dd') });
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="A Pagar" value={fmtCurrency(totals.pendente)} icon={TrendingDown} color="amber" />
        <StatCard label="Pago" value={fmtCurrency(totals.pago)} icon={CheckCircle2} color="emerald" />
        <StatCard label="Vencido" value={fmtCurrency(totals.vencido)} icon={AlertCircle} color="rose" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Buscar contas..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl outline-none focus:border-blue-500 text-sm font-medium" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="pl-3 pr-8 py-3.5 text-xs bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl outline-none focus:border-blue-500 appearance-none font-bold cursor-pointer text-slate-700 dark:text-slate-300">
              <option value="all">Todos</option><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="vencido">Vencido</option><option value="cancelado">Cancelado</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 bg-gradient-to-br from-amber-500 to-orange-600 text-white px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:-translate-y-0.5 transition-all active:scale-95 whitespace-nowrap">
            <Plus size={15} />Nova Conta
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={TrendingDown} title="Nenhuma conta a pagar" subtitle="Registre suas contas a pagar para controlar os compromissos financeiros." onAction={openAdd} actionLabel="Nova Conta a Pagar" />
      ) : (
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[620px]">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                  {['Descrição', 'Vencimento', 'Categoria', 'Valor', 'Status', 'Ações'].map(h => (
                    <th key={h} className={cn('px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest', h === 'Ações' && 'text-right')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                <AnimatePresence mode="popLayout">
                  {filtered.map((account, i) => (
                    <motion.tr key={account.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.02 }} className="hover:bg-amber-50/20 dark:hover:bg-amber-900/5 transition-all">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{account.description}</p>
                        {account.notes && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[180px]">{account.notes}</p>}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">{format(parseISO(account.dueDate), 'dd/MM/yyyy')}</p>
                        {account.paidAt && <p className="text-[10px] text-emerald-500 mt-0.5">Pago em {format(parseISO(account.paidAt), 'dd/MM/yyyy')}</p>}
                      </td>
                      <td className="px-5 py-4 text-xs font-bold text-slate-500 whitespace-nowrap">{EXPENSE_CATEGORIES[account.category]}</td>
                      <td className="px-5 py-4 whitespace-nowrap"><span className="text-base font-black text-amber-600 dark:text-amber-400">{fmtCurrency(account.amount)}</span></td>
                      <td className="px-5 py-4"><span className={cn('status-badge', statusColors[account.computedStatus])}>{account.computedStatus === 'pago' ? <CheckCircle2 size={11} /> : account.computedStatus === 'pendente' ? <Clock size={11} /> : <AlertCircle size={11} />}{account.computedStatus}</span></td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {account.computedStatus !== 'pago' && account.computedStatus !== 'cancelado' && (
                            <button onClick={() => markPaid(account)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all" title="Marcar como Pago"><CheckCircle2 size={15} /></button>
                          )}
                          <button onClick={() => openEdit(account)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"><Edit2 size={15} /></button>
                          <button onClick={() => { if (confirm('Excluir esta conta?')) onDelete(account.id); }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }} className="relative w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/50 dark:border-slate-800/50 max-h-[92vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
                <div><h3 className="text-xl font-black text-slate-900 dark:text-white">{editingItem ? 'Editar' : 'Nova'} Conta a Pagar</h3><p className="text-xs text-slate-500 mt-0.5">Registre um compromisso financeiro.</p></div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrição *</label>
                  <input required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ex: Aluguel mês de outubro" className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 font-medium text-slate-900 dark:text-white text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input type="number" required step="0.01" min="0" value={form.amount || ''} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 font-black text-slate-900 dark:text-white" placeholder="0,00" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vencimento *</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input type="date" required value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-900 dark:text-white" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoria</label>
                    <div className="relative">
                      <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as any })} className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 appearance-none font-bold text-slate-700 dark:text-slate-300 text-sm cursor-pointer">
                        {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data de Pagamento</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input type="date" value={form.paidAt} onChange={e => setForm({ ...form, paidAt: e.target.value })} className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-900 dark:text-white" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['pendente', 'pago', 'vencido', 'cancelado'] as const).map(s => (
                      <label key={s} className={cn('flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all text-[10px] font-black uppercase tracking-wider', form.status === s ? (s === 'pago' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : s === 'vencido' ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-600' : s === 'pendente' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 'border-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-500') : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800')}>
                        <input type="radio" name="apagar-status" className="hidden" checked={form.status === s} onChange={() => setForm({ ...form, status: s })} />{s}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Observação</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 font-medium text-slate-700 dark:text-slate-300 text-sm resize-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:-translate-y-0.5 transition-all active:scale-95 shadow-lg shadow-amber-500/20">{editingItem ? 'Salvar' : 'Confirmar'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: FLUXO DE CAIXA
// ═══════════════════════════════════════════════════════════════════════════════

function FluxoCaixaTab({ payments, students, entries, expenses, accounts }: {
  payments: any[]; students: any[];
  entries: FinancialEntry[]; expenses: FinancialExpense[]; accounts: AccountPayable[];
}) {
  const [period, setPeriod] = useState<PeriodFilter>('mes');
  const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [typeFilter, setTypeFilter] = useState<'all' | 'entrada' | 'saida'>('all');
  const range = useMemo(() => getPeriodRange(period, customStart, customEnd), [period, customStart, customEnd]);

  const movements = useMemo(() => {
    const list: { id: string; date: string; description: string; type: 'entrada' | 'saida'; category: string; amount: number; origin: string }[] = [];

    payments.forEach(p => {
      if (p.status === 'paid' && inRange(p.date, range)) {
        const s = students.find((st: any) => st.id === p.studentId);
        list.push({ id: p.id, date: p.date, description: `Mensalidade — ${s?.name || 'Aluno'}`, type: 'entrada', category: 'Mensalidade', amount: p.amount, origin: 'Mensalidade' });
      }
    });

    entries.forEach(e => {
      if (e.status === 'recebido' && inRange(e.date, range)) {
        list.push({ id: e.id, date: e.date, description: e.description, type: 'entrada', category: ENTRY_CATEGORIES[e.category], amount: e.amount, origin: 'Entrada Manual' });
      }
    });

    expenses.forEach(e => {
      if (e.status === 'pago' && inRange(e.date, range)) {
        list.push({ id: e.id, date: e.date, description: e.description, type: 'saida', category: EXPENSE_CATEGORIES[e.category], amount: e.amount, origin: 'Saída Manual' });
      }
    });

    accounts.forEach(a => {
      if (a.status === 'pago' && a.paidAt && inRange(a.paidAt, range)) {
        list.push({ id: a.id, date: a.paidAt, description: a.description, type: 'saida', category: EXPENSE_CATEGORIES[a.category], amount: a.amount, origin: 'Conta a Pagar' });
      }
    });

    return list
      .filter(m => typeFilter === 'all' || m.type === typeFilter)
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [payments, students, entries, expenses, accounts, range, typeFilter]);

  // Running balance
  const movementsWithBalance = useMemo(() => {
    let balance = 0;
    return movements.map(m => {
      balance += m.type === 'entrada' ? m.amount : -m.amount;
      return { ...m, balance };
    });
  }, [movements]);

  const totalEntradas = movements.filter(m => m.type === 'entrada').reduce((a, m) => a + m.amount, 0);
  const totalSaidas = movements.filter(m => m.type === 'saida').reduce((a, m) => a + m.amount, 0);

  return (
    <div className="space-y-6 pb-8">
      <div className="premium-card p-4 sm:p-5">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Período</p>
        <PeriodSelector period={period} setPeriod={setPeriod} customStart={customStart} setCustomStart={setCustomStart} customEnd={customEnd} setCustomEnd={setCustomEnd} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Entradas" value={fmtCurrency(totalEntradas)} icon={ArrowUpRight} color="emerald" />
        <StatCard label="Saídas" value={fmtCurrency(totalSaidas)} icon={ArrowDownRight} color="rose" />
        <StatCard label="Saldo" value={fmtCurrency(totalEntradas - totalSaidas)} icon={Wallet} color={totalEntradas - totalSaidas >= 0 ? 'blue' : 'rose'} />
      </div>

      <div className="flex gap-2 flex-wrap">
        {([['all', 'Todas'], ['entrada', 'Entradas'], ['saida', 'Saídas']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setTypeFilter(v as any)} className={cn('px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all', typeFilter === v ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200/60 dark:border-slate-800/60')}>{l}</button>
        ))}
      </div>

      {movementsWithBalance.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="Nenhuma movimentação no período" subtitle="As movimentações financeiras efetivadas aparecerão aqui conforme o período selecionado." />
      ) : (
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                  {['Data', 'Descrição', 'Tipo', 'Categoria', 'Entrada', 'Saída', 'Saldo', 'Origem'].map(h => (
                    <th key={h} className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {movementsWithBalance.map((m, i) => (
                  <motion.tr key={`${m.id}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }} className={cn('transition-all', m.type === 'entrada' ? 'hover:bg-emerald-50/20 dark:hover:bg-emerald-900/5' : 'hover:bg-rose-50/20 dark:hover:bg-rose-900/5')}>
                    <td className="px-5 py-3.5 text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">{format(parseISO(m.date), 'dd/MM/yyyy')}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white max-w-[180px] truncate">{m.description}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn('flex items-center gap-1 text-[10px] font-black uppercase w-fit px-2 py-1 rounded-full', m.type === 'entrada' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600')}>
                        {m.type === 'entrada' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}{m.type === 'entrada' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 font-bold whitespace-nowrap">{m.category}</td>
                    <td className="px-5 py-3.5 font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{m.type === 'entrada' ? fmtCurrency(m.amount) : '—'}</td>
                    <td className="px-5 py-3.5 font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">{m.type === 'saida' ? fmtCurrency(m.amount) : '—'}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap"><span className={cn('font-black text-sm', m.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600')}>{fmtCurrency(m.balance)}</span></td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 font-bold whitespace-nowrap">{m.origin}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: RELATÓRIOS
// ═══════════════════════════════════════════════════════════════════════════════

function RelatoriosTab({ payments, students, entries, expenses, accounts }: {
  payments: any[]; students: any[];
  entries: FinancialEntry[]; expenses: FinancialExpense[]; accounts: AccountPayable[];
}) {
  const [period, setPeriod] = useState<PeriodFilter>('mes');
  const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const range = useMemo(() => getPeriodRange(period, customStart, customEnd), [period, customStart, customEnd]);
  const now = startOfDay(new Date());

  // Monthly evolution (6 months)
  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      const r = { start: startOfMonth(d), end: endOfMonth(d) };
      const name = format(d, 'MMM/yy', { locale: ptBR });
      const entradas = payments.filter(p => p.status === 'paid' && inRange(p.date, r)).reduce((a, p) => a + p.amount, 0)
        + entries.filter(e => e.status === 'recebido' && inRange(e.date, r)).reduce((a, e) => a + e.amount, 0);
      const saidas = expenses.filter(e => e.status === 'pago' && inRange(e.date, r)).reduce((a, e) => a + e.amount, 0)
        + accounts.filter(a => a.status === 'pago' && a.paidAt && inRange(a.paidAt, r)).reduce((a, acc) => a + acc.amount, 0);
      return { name, entradas, saidas, resultado: entradas - saidas };
    });
  }, [payments, entries, expenses, accounts]);

  // Expenses by category (in period)
  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.filter(e => e.status === 'pago' && inRange(e.date, range)).forEach(e => {
      const cat = EXPENSE_CATEGORIES[e.category];
      map[cat] = (map[cat] || 0) + e.amount;
    });
    accounts.filter(a => a.status === 'pago' && a.paidAt && inRange(a.paidAt, range)).forEach(a => {
      const cat = EXPENSE_CATEGORIES[a.category];
      map[cat] = (map[cat] || 0) + a.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses, accounts, range]);

  // Entries by category (in period)
  const entriesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    payments.filter(p => p.status === 'paid' && inRange(p.date, range)).forEach(() => {
      map['Mensalidade'] = (map['Mensalidade'] || 0) + 1;
    });
    // Just count by category
    const catMap: Record<string, number> = {};
    payments.filter(p => p.status === 'paid' && inRange(p.date, range)).forEach(p => { catMap['Mensalidade'] = (catMap['Mensalidade'] || 0) + p.amount; });
    entries.filter(e => e.status === 'recebido' && inRange(e.date, range)).forEach(e => {
      const cat = ENTRY_CATEGORIES[e.category];
      catMap[cat] = (catMap[cat] || 0) + e.amount;
    });
    return Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [payments, entries, range]);

  // Inadimplência
  const overdueMensalidades = payments.filter(p => p.status === 'pending' && isBefore(parseISO(p.date), now));
  const inadimplenciaTotal = overdueMensalidades.reduce((a, p) => a + p.amount, 0);
  const inadimplenciaCount = overdueMensalidades.length;
  const inadimplenciaStudents = new Set(overdueMensalidades.map(p => p.studentId)).size;

  const hasData = monthlyData.some(m => m.entradas > 0 || m.saidas > 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 shadow-xl text-xs">
        <p className="font-black text-slate-700 dark:text-slate-300 mb-2">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }} className="font-bold">{p.name}: {fmtCurrency(p.value)}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Period */}
      <div className="premium-card p-4 sm:p-5">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Período dos relatórios</p>
        <PeriodSelector period={period} setPeriod={setPeriod} customStart={customStart} setCustomStart={setCustomStart} customEnd={customEnd} setCustomEnd={setCustomEnd} />
      </div>

      {/* Inadimplência */}
      <div className={cn('premium-card p-5 sm:p-6', inadimplenciaTotal > 0 ? 'border-rose-200 dark:border-rose-800/30' : '')}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Inadimplência</h3>
            <p className="text-xs text-slate-500 mt-0.5">Mensalidades vencidas e não pagas</p>
          </div>
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', inadimplenciaTotal > 0 ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600')}>
            {inadimplenciaTotal > 0 ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          </div>
        </div>
        {inadimplenciaTotal === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Parabéns! Nenhuma mensalidade vencida em aberto.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl text-center">
              <p className="text-xs font-black text-rose-400 uppercase tracking-wider mb-1">Valor Total</p>
              <p className="text-xl font-black text-rose-600">{fmtCurrency(inadimplenciaTotal)}</p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl text-center">
              <p className="text-xs font-black text-amber-400 uppercase tracking-wider mb-1">Cobranças</p>
              <p className="text-xl font-black text-amber-600">{inadimplenciaCount}</p>
            </div>
            <div className="p-4 bg-violet-50 dark:bg-violet-900/10 rounded-2xl text-center">
              <p className="text-xs font-black text-violet-400 uppercase tracking-wider mb-1">Alunos</p>
              <p className="text-xl font-black text-violet-600">{inadimplenciaStudents}</p>
            </div>
          </div>
        )}
      </div>

      {/* Monthly chart */}
      <div className="premium-card p-5 sm:p-6">
        <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">Evolução Mensal</h3>
        <p className="text-xs text-slate-500 mb-5">Entradas × Saídas — últimos 6 meses</p>
        {!hasData ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-400">
            <BarChart3 size={36} className="mb-2 opacity-30" />
            <p className="text-sm font-medium">Nenhuma movimentação registrada ainda.</p>
            <p className="text-xs mt-1">Registre entradas e saídas para ver o gráfico.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradEntradas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradSaidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
              <Area type="monotone" dataKey="entradas" name="Entradas" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gradEntradas)" dot={{ r: 4, fill: '#3b82f6' }} />
              <Area type="monotone" dataKey="saidas" name="Saídas" stroke="#ef4444" strokeWidth={2.5} fill="url(#gradSaidas)" dot={{ r: 4, fill: '#ef4444' }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Two column charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Saídas por categoria */}
        <div className="premium-card p-5 sm:p-6">
          <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">Despesas por Categoria</h3>
          <p className="text-xs text-slate-500 mb-5">Saídas no período selecionado</p>
          {expensesByCategory.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400">
              <ArrowDownRight size={32} className="mb-2 opacity-30" />
              <p className="text-sm font-medium">Nenhuma despesa no período.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={expensesByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {expensesByCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmtCurrency(Number(v))} contentStyle={{ borderRadius: '12px', fontSize: 12, fontWeight: 700 }} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Entradas por categoria */}
        <div className="premium-card p-5 sm:p-6">
          <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">Receitas por Categoria</h3>
          <p className="text-xs text-slate-500 mb-5">Entradas no período selecionado</p>
          {entriesByCategory.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400">
              <ArrowUpRight size={32} className="mb-2 opacity-30" />
              <p className="text-sm font-medium">Nenhuma receita no período.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={entriesByCategory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip formatter={(v: any) => fmtCurrency(Number(v))} contentStyle={{ borderRadius: '12px', fontSize: 12, fontWeight: 700 }} />
                <Bar dataKey="value" name="Valor" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {entriesByCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Resultado summary table */}
      <div className="premium-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-black text-slate-900 dark:text-white">Resumo do Período</h3>
          <p className="text-xs text-slate-500 mt-0.5">Consolidado financeiro com base nas movimentações efetivadas</p>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
          {[
            { label: 'Total de Entradas', value: payments.filter(p => p.status === 'paid' && inRange(p.date, range)).reduce((a, p) => a + p.amount, 0) + entries.filter(e => e.status === 'recebido' && inRange(e.date, range)).reduce((a, e) => a + e.amount, 0), color: 'text-emerald-600', icon: ArrowUpRight },
            { label: 'Total de Saídas', value: expenses.filter(e => e.status === 'pago' && inRange(e.date, range)).reduce((a, e) => a + e.amount, 0) + accounts.filter(a => a.status === 'pago' && a.paidAt && inRange(a.paidAt, range)).reduce((a, acc) => a + acc.amount, 0), color: 'text-rose-600', icon: ArrowDownRight },
            { label: 'Contas a Receber (pendentes)', value: payments.filter(p => p.status === 'pending').reduce((a, p) => a + p.amount, 0) + entries.filter(e => e.status === 'pendente').reduce((a, e) => a + e.amount, 0), color: 'text-blue-600', icon: TrendingUp },
            { label: 'Contas a Pagar (pendentes)', value: accounts.filter(a => a.status === 'pendente').reduce((a, acc) => a + acc.amount, 0) + expenses.filter(e => e.status === 'pendente').reduce((a, e) => a + e.amount, 0), color: 'text-amber-600', icon: TrendingDown },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', item.color === 'text-emerald-600' ? 'bg-emerald-50 dark:bg-emerald-900/20' : item.color === 'text-rose-600' ? 'bg-rose-50 dark:bg-rose-900/20' : item.color === 'text-blue-600' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-amber-50 dark:bg-amber-900/20')}>
                  <item.icon size={15} className={item.color} />
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
              </div>
              <span className={cn('text-base font-black', item.color)}>{fmtCurrency(item.value)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-6 py-5 bg-slate-50 dark:bg-slate-800/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-600/10"><Activity size={15} className="text-blue-600" /></div>
              <span className="text-sm font-black text-slate-900 dark:text-white">Resultado do Período</span>
            </div>
            {(() => {
              const ent = payments.filter(p => p.status === 'paid' && inRange(p.date, range)).reduce((a, p) => a + p.amount, 0) + entries.filter(e => e.status === 'recebido' && inRange(e.date, range)).reduce((a, e) => a + e.amount, 0);
              const sai = expenses.filter(e => e.status === 'pago' && inRange(e.date, range)).reduce((a, e) => a + e.amount, 0) + accounts.filter(a => a.status === 'pago' && a.paidAt && inRange(a.paidAt, range)).reduce((a, acc) => a + acc.amount, 0);
              const res = ent - sai;
              return <span className={cn('text-lg font-black', res >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{fmtCurrency(res)}</span>;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
