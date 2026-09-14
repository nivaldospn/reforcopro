'use client';

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  CreditCard,
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
  MessageCircle
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { Layout } from '@/components/Layout';
import { motion, AnimatePresence } from 'motion/react';
import { format, isBefore, startOfDay, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function PaymentsPage() {
  const { 
    payments, 
    students, 
    guardians, 
    addPayment, 
    updatePayment, 
    deletePayment, 
    togglePaymentStatus, 
    clearData,
    whatsappConnection,
    sendManualPaymentReminder
  } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // WhatsApp Reminder Modal State
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [selectedPaymentForWa, setSelectedPaymentForWa] = useState<any>(null);
  const [waMessagePreview, setWaMessagePreview] = useState('');
  const [isSendingWa, setIsSendingWa] = useState(false);
  const [waSendResult, setWaSendResult] = useState<{ status: 'idle' | 'success' | 'error'; message?: string }>({ status: 'idle' });
  
  const [formData, setFormData] = useState({
    studentId: '',
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'pending' as 'paid' | 'pending'
  });

  // Calculate stats
  const stats = useMemo(() => {
    const now = startOfDay(new Date());
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    const received = payments
      .filter(p => {
        const pDate = parseISO(p.date);
        return p.status === 'paid' && isWithinInterval(pDate, { start: currentMonthStart, end: currentMonthEnd });
      })
      .reduce((acc, p) => acc + p.amount, 0);

    const pending = payments
      .filter(p => p.status === 'pending')
      .reduce((acc, p) => acc + p.amount, 0);

    const overdue = payments
      .filter(p => p.status === 'pending' && isBefore(parseISO(p.date), now))
      .reduce((acc, p) => acc + p.amount, 0);

    const pendingCount = payments.filter(p => p.status === 'pending').length;
    const overdueCount = payments.filter(p => p.status === 'pending' && isBefore(parseISO(p.date), now)).length;

    return { received, pending, overdue, pendingCount, overdueCount };
  }, [payments]);

  const [mounted, setMounted] = useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Available months for filter
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    payments.forEach(p => {
      months.add(format(parseISO(p.date), 'yyyy-MM'));
    });
    return Array.from(months).sort().reverse();
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const now = startOfDay(new Date());
    
    return payments.filter(p => {
      const student = students.find(s => s.id === p.studentId);
      const matchesSearch = student?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const pDate = parseISO(p.date);
      const isOverdue = p.status === 'pending' && isBefore(pDate, now);
      
      let matchesStatus = true;
      if (statusFilter === 'paid') matchesStatus = p.status === 'paid';
      if (statusFilter === 'pending') matchesStatus = p.status === 'pending' && !isOverdue;
      if (statusFilter === 'overdue') matchesStatus = isOverdue;

      const matchesMonth = monthFilter === 'all' || format(pDate, 'yyyy-MM') === monthFilter;

      return matchesSearch && matchesStatus && matchesMonth;
    }).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [payments, students, searchTerm, statusFilter, monthFilter]);

  const handleWhatsAppCharge = (payment: any, student: any, guardian: any) => {
    if (!guardian || (!guardian.whatsapp && !guardian.phone)) {
      alert('Responsável não possui telefone cadastrado.');
      return;
    }
    const rawPhone = guardian.whatsapp || guardian.phone;
    let phone = rawPhone.replace(/\D/g, '');
    if (!phone.startsWith('55') && (phone.length === 10 || phone.length === 11)) {
      phone = '55' + phone;
    }

    const amount = payment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formattedDate = format(parseISO(payment.date), 'dd/MM/yyyy');
    const defaultMsg = `Olá, ${guardian.name.split(' ')[0]}! 😊\n\nPassando para lembrar que a mensalidade do aluno ${student?.name || 'Aluno'} vence ou venceu no valor de ${amount} (vencimento: ${formattedDate}).\n\nObrigado!`;

    setSelectedPaymentForWa({
      payment,
      student,
      guardian,
      phone
    });
    setWaMessagePreview(defaultMsg);
    setWaSendResult({ status: 'idle' });
    setIsWaModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPayment) {
      updatePayment(editingPayment, {
        ...formData,
        amount: Number(formData.amount)
      });
    } else {
      addPayment({
        ...formData,
        amount: Number(formData.amount)
      });
    }
    closeModal();
  };

  const openEditModal = (payment: any) => {
    setEditingPayment(payment.id);
    setFormData({
      studentId: payment.studentId,
      amount: payment.amount,
      date: payment.date,
      status: payment.status
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPayment(null);
    setFormData({
      studentId: '',
      amount: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      status: 'pending'
    });
  };

  const getStatusInfo = (payment: any) => {
    const now = startOfDay(new Date());
    const pDate = parseISO(payment.date);
    
    if (payment.status === 'paid') {
      return { 
        label: 'Pago', 
        color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50',
        icon: <CheckCircle2 size={14} />
      };
    }
    
    if (isBefore(pDate, now)) {
      return { 
        label: 'Atrasado', 
        color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/50',
        icon: <AlertCircle size={14} />
      };
    }
    
    return { 
      label: 'Pendente', 
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50',
      icon: <Clock size={14} />
    };
  };

  return (
    <Layout title="Gestão Financeira">
      {/* Financial Dashboard - Premium Refinement */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-8 md:mb-12">
        {[
          { 
            label: 'Receita Mensal', 
            value: stats.received, 
            icon: DollarSign, 
            color: 'emerald'
          },
          { 
            label: 'Total Pendente', 
            value: stats.pending, 
            icon: Clock, 
            color: 'amber'
          },
          { 
            label: 'Total Atrasado', 
            value: stats.overdue, 
            icon: AlertCircle, 
            color: 'rose'
          }
        ].map((item, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className={cn(
              "premium-card p-4 sm:p-8 group relative overflow-hidden flex flex-col justify-between",
              item.color === 'rose' && "border-rose-100 dark:border-rose-900/30"
            )}
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700 scale-0 group-hover:scale-100" />
            
            <div className="flex items-center justify-between mb-4 sm:mb-6 relative z-10">
              <div className={cn(
                "w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-[1.25rem] flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shrink-0",
                `bg-${item.color}-100 dark:bg-${item.color}-900/30 text-${item.color}-600 dark:text-${item.color}-400`
              )}>
                <item.icon size={20} className="sm:w-7 sm:h-7" />
              </div>
            </div>
            
            <div className="relative z-10">
              <p className="text-[9px] sm:text-xs font-black text-slate-400 uppercase tracking-widest sm:tracking-[0.2em] mb-1 sm:mb-2 truncate">{item.label}</p>
              <h3 className={cn(
                "text-lg sm:text-4xl font-black tracking-tighter truncate",
                item.color === 'rose' ? "text-rose-600" : "text-slate-900 dark:text-white"
              )}>
                <span className="text-[10px] sm:text-lg font-bold mr-0.5 sm:mr-1 opacity-50">R$</span>
                {mounted ? item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Advanced Filters & Search - Premium Refinement */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div className="flex flex-1 flex-col sm:flex-row gap-4 max-w-5xl">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-all duration-300" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome do aluno..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-4 py-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-[1.5rem] outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all premium-shadow font-medium"
            />
          </div>
          
          <div className="flex gap-4">
            <div className="relative min-w-[180px] group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" size={18} />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full pl-11 pr-10 py-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-[1.5rem] outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all appearance-none font-bold text-sm text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="all">Todos Status</option>
                <option value="paid">Pagos</option>
                <option value="pending">Pendentes</option>
                <option value="overdue">Atrasados</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>

            <div className="relative min-w-[180px] group">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" size={18} />
              <select 
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full pl-11 pr-10 py-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-[1.5rem] outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all appearance-none font-bold text-sm text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="all">Todos os Meses</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>
                    {format(parseISO(`${m}-01`), 'MMMM yyyy', { locale: ptBR })}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
            <button 
              onClick={() => setViewMode('table')}
              className={cn(
                "p-3 rounded-xl transition-all",
                viewMode === 'table' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <List size={20} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-3 rounded-xl transition-all",
                viewMode === 'grid' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <LayoutGrid size={20} />
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={() => {
                if (window.confirm('Deseja realmente limpar todos os dados financeiros? Esta ação é irreversível.')) {
                  clearData();
                  window.location.reload();
                }
              }}
              className="w-full sm:w-auto p-4 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-slate-400 hover:text-red-500 rounded-2xl transition-all duration-300 premium-shadow active:scale-95 group flex items-center justify-center"
              title="Limpar todos os dados"
            >
              <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
              <span className="sm:hidden ml-2 font-bold text-[10px] uppercase tracking-widest">Limpar Dados</span>
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-8 py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all hover:shadow-2xl hover:shadow-blue-600/30 hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
            >
              <Plus size={20} />
              Novo Pagamento
            </button>
          </div>
        </div>
      </div>

      {/* Table View */}
      <div className={cn("premium-card overflow-hidden border-none premium-shadow", viewMode === 'grid' ? "hidden" : "hidden lg:block")}>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Aluno / Responsável</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vencimento</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Valor</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                <AnimatePresence mode="popLayout">
                  {filteredPayments.map((payment, i) => {
                    const student = students.find(s => s.id === payment.studentId);
                    const guardian = guardians.find(g => g.id === student?.guardianId);
                    const status = getStatusInfo(payment);
                    
                    return (
                      <motion.tr 
                        key={payment.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ delay: i * 0.02 }}
                        className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-all duration-300"
                      >
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-black text-sm border border-blue-100/50 dark:border-blue-800/50 shadow-sm group-hover:scale-110 transition-transform duration-500">
                              {student?.name.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="font-black text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 transition-colors text-base">{student?.name || 'Aluno Desconhecido'}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                                <User size={12} className="text-slate-400" />
                                {guardian?.name || 'Responsável não vinculado'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{format(parseISO(payment.date), 'dd/MM/yyyy')}</span>
                            <span className="text-[10px] text-slate-400 font-medium mt-1">{format(parseISO(payment.date), 'EEEE', { locale: ptBR })}</span>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <span className="text-lg font-black text-slate-900 dark:text-white">
                            <span className="text-xs font-bold mr-1 opacity-40">R$</span>
                            {payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-10 py-6">
                          <span className={cn("status-badge", status.color)}>
                            {status.icon}
                            {status.label}
                          </span>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {payment.status !== 'paid' && (
                              <button 
                                onClick={() => handleWhatsAppCharge(payment, student, guardian)}
                                className="p-3 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-2xl transition-all duration-300"
                                title="Cobrar via WhatsApp"
                              >
                                <MessageCircle size={20} />
                              </button>
                            )}
                            <button 
                              onClick={() => togglePaymentStatus(payment.id)}
                              className={cn(
                                "p-3 rounded-2xl transition-all duration-300",
                                payment.status === 'paid'
                                  ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                  : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 bg-emerald-50/50 dark:bg-emerald-900/10'
                              )}
                              title={payment.status === 'paid' ? 'Marcar como Pendente' : 'Marcar como Pago'}
                            >
                              {payment.status === 'paid' ? <Clock size={20} /> : <CheckCircle2 size={20} />}
                            </button>
                            <button 
                              onClick={() => openEditModal(payment)}
                              className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-all duration-300"
                              title="Editar"
                            >
                              <Edit2 size={20} />
                            </button>
                            <button 
                              onClick={() => deletePayment(payment.id)}
                              className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all duration-300"
                              title="Excluir"
                            >
                              <Trash2 size={20} />
                            </button>
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

      {/* Grid View - Always active on mobile, or when viewMode is grid on desktop */}
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8", viewMode === 'table' ? "lg:hidden" : "")}>
          <AnimatePresence mode="popLayout">
            {filteredPayments.map((payment, i) => {
              const student = students.find(s => s.id === payment.studentId);
              const guardian = guardians.find(g => g.id === student?.guardianId);
              const status = getStatusInfo(payment);
              
              return (
                <motion.div 
                  key={payment.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  className="premium-card p-8 group"
                >
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-black text-xl border border-blue-100/50 dark:border-blue-800/50">
                        {student?.name.charAt(0) || '?'}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 dark:text-white tracking-tight">{student?.name || 'Aluno'}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                          <User size={12} />
                          {guardian?.name || 'Responsável'}
                        </p>
                      </div>
                    </div>
                    <span className={cn("status-badge", status.color)}>
                      {status.label}
                    </span>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <Calendar size={16} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Vencimento</span>
                      </div>
                      <span className="text-sm font-black text-slate-900 dark:text-white">{format(parseISO(payment.date), 'dd/MM/yyyy')}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <DollarSign size={16} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Valor Total</span>
                      </div>
                      <span className="text-xl font-black text-slate-900 dark:text-white">R$ {payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className={cn("grid gap-3", payment.status !== 'paid' ? "grid-cols-4" : "grid-cols-3")}>
                    {payment.status !== 'paid' && (
                      <button 
                        onClick={() => handleWhatsAppCharge(payment, student, guardian)}
                        className="flex items-center justify-center py-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                        title="Cobrar via WhatsApp"
                      >
                        <MessageCircle size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => togglePaymentStatus(payment.id)}
                      className={cn(
                        "flex items-center justify-center py-4 rounded-2xl transition-all duration-300",
                        payment.status === 'paid'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40'
                      )}
                    >
                      {payment.status === 'paid' ? <Clock size={18} /> : <CheckCircle2 size={18} />}
                    </button>
                    <button 
                      onClick={() => openEditModal(payment)}
                      className="flex items-center justify-center py-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl transition-all hover:bg-blue-100 dark:hover:bg-blue-900/40"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => deletePayment(payment.id)}
                      className="flex items-center justify-center py-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl transition-all hover:bg-rose-100 dark:hover:bg-rose-900/40"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

      {/* Empty State - Premium Illustration Style */}
      {filteredPayments.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="py-32 flex flex-col items-center justify-center text-center"
        >
          <div className="relative mb-10">
            <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full animate-pulse" />
            <div className="relative w-40 h-40 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 rounded-[3.5rem] flex items-center justify-center border border-slate-200/50 dark:border-slate-800/50 shadow-2xl">
              <CreditCard size={80} strokeWidth={1.5} />
              <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-900">
                <Plus size={24} />
              </div>
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Nenhum pagamento encontrado</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-4 max-w-sm mx-auto leading-relaxed font-medium">
            Sua lista de mensalidades está vazia. Comece a organizar seu financeiro registrando o primeiro pagamento hoje mesmo.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="mt-10 flex items-center gap-3 bg-blue-600 text-white px-10 py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-600/30 hover:scale-105 transition-all active:scale-95"
          >
            <Plus size={20} />
            Registrar Primeiro Pagamento
          </button>
        </motion.div>
      )}

      {/* Modal - Premium Refinement */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 max-h-[90vh] overflow-y-auto sm:max-h-full sm:overflow-visible rounded-3xl sm:rounded-[3rem] shadow-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col"
            >
              <div className="p-6 sm:p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/30 shrink-0">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {editingPayment ? 'Editar Mensalidade' : 'Nova Mensalidade'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Preencha os dados para controle financeiro.</p>
                </div>
                <button onClick={closeModal} className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-all duration-300">
                  <X size={28} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-8 sm:space-y-10 overflow-y-auto no-scrollbar">
                <div className="space-y-8">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Aluno Beneficiário</label>
                    <div className="relative group">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                      <select 
                        required
                        value={formData.studentId}
                        onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                        className="w-full pl-14 pr-10 py-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all appearance-none cursor-pointer font-black text-slate-700 dark:text-slate-300"
                      >
                        <option value="">Selecionar aluno...</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Valor da Mensalidade</label>
                      <div className="relative group">
                        <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input 
                          type="number" 
                          required
                          step="0.01"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                          className="w-full pl-14 pr-5 py-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-black text-slate-900 dark:text-white text-lg"
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Data de Vencimento</label>
                      <div className="relative group">
                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input 
                          type="date" 
                          required
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="w-full pl-14 pr-5 py-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-black text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Status do Pagamento</label>
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                      <label className="flex-1 flex items-center justify-center gap-4 p-6 rounded-[1.5rem] border-2 cursor-pointer transition-all duration-300 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20 has-[:checked]:shadow-xl has-[:checked]:shadow-blue-500/10 group">
                        <input 
                          type="radio" 
                          name="status" 
                          className="hidden" 
                          checked={formData.status === 'pending'}
                          onChange={() => setFormData({ ...formData, status: 'pending' })}
                        />
                        <Clock size={24} className={formData.status === 'pending' ? 'text-blue-500' : 'text-slate-400 group-hover:text-blue-400'} />
                        <span className={cn("text-sm font-black uppercase tracking-widest", formData.status === 'pending' ? 'text-blue-600' : 'text-slate-500')}>Pendente</span>
                      </label>
                      <label className="flex-1 flex items-center justify-center gap-4 p-6 rounded-[1.5rem] border-2 cursor-pointer transition-all duration-300 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 dark:has-[:checked]:bg-emerald-900/20 has-[:checked]:shadow-xl has-[:checked]:shadow-emerald-500/10 group">
                        <input 
                          type="radio" 
                          name="status" 
                          className="hidden" 
                          checked={formData.status === 'paid'}
                          onChange={() => setFormData({ ...formData, status: 'paid' })}
                        />
                        <CheckCircle2 size={24} className={formData.status === 'paid' ? 'text-emerald-500' : 'text-slate-400 group-hover:text-emerald-400'} />
                        <span className={cn("text-sm font-black uppercase tracking-widest", formData.status === 'paid' ? 'text-emerald-600' : 'text-slate-500')}>Pago</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex flex-col sm:flex-row gap-4 sm:gap-6 shrink-0">
                  <button 
                    type="button" 
                    onClick={closeModal}
                    className="flex-1 px-8 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-sm uppercase tracking-widest rounded-[1.5rem] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-300"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-8 py-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-sm uppercase tracking-widest rounded-[1.5rem] hover:shadow-2xl hover:shadow-blue-600/30 hover:-translate-y-1 transition-all duration-300 active:scale-95"
                  >
                    {editingPayment ? 'Salvar Alterações' : 'Confirmar Registro'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Disparo Manual de WhatsApp com Datafy API */}
      <AnimatePresence>
        {isWaModalOpen && selectedPaymentForWa && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWaModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200/60 dark:border-slate-800/60 p-6 sm:p-10 space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <MessageCircle size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Cobrança via WhatsApp</h3>
                    <p className="text-xs text-slate-400">Prévia da mensagem ao responsável</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsWaModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Informações do Destinatário */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold">Aluno:</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">{selectedPaymentForWa.student?.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold">Responsável:</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">{selectedPaymentForWa.guardian?.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold">Telefone:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedPaymentForWa.phone}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold">Conexão:</span>
                  <span className={cn(
                    "font-bold",
                    whatsappConnection?.status === 'connected' ? "text-emerald-600" : "text-amber-500"
                  )}>
                    {whatsappConnection?.status === 'connected' ? '🟢 Datafy API Conectada' : '🟡 WhatsApp Não Conectado'}
                  </span>
                </div>
              </div>

              {/* Prévia Editável da Mensagem */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Mensagem (Personalize antes de enviar)
                </label>
                <textarea
                  rows={5}
                  value={waMessagePreview}
                  onChange={(e) => setWaMessagePreview(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-sans text-sm leading-relaxed text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Feedback de Envio */}
              {waSendResult.status !== 'idle' && (
                <div className={cn(
                  "p-3 rounded-xl text-xs font-bold flex items-center gap-2",
                  waSendResult.status === 'success' 
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" 
                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                )}>
                  {waSendResult.status === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {waSendResult.message}
                </div>
              )}

              {/* Botões de Ação */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Fallback WhatsApp Web */}
                <button
                  type="button"
                  onClick={() => {
                    const encoded = encodeURIComponent(waMessagePreview);
                    window.open(`https://wa.me/${selectedPaymentForWa.phone}?text=${encoded}`, '_blank');
                  }}
                  className="w-full sm:w-auto px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  Abrir no WhatsApp Web
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsWaModalOpen(false)}
                    className="px-4 py-3 text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    Fechar
                  </button>

                  <button
                    type="button"
                    disabled={isSendingWa || whatsappConnection?.status !== 'connected'}
                    onClick={async () => {
                      setIsSendingWa(true);
                      setWaSendResult({ status: 'idle' });
                      const res = await sendManualPaymentReminder(
                        selectedPaymentForWa.payment.id,
                        selectedPaymentForWa.phone,
                        waMessagePreview
                      );
                      setIsSendingWa(false);
                      if (res.success) {
                        setWaSendResult({
                          status: 'success',
                          message: '🟢 Lembrete enviado com sucesso via Datafy!'
                        });
                        setTimeout(() => setIsWaModalOpen(false), 2000);
                      } else {
                        setWaSendResult({
                          status: 'error',
                          message: res.error || 'Não foi possível enviar a mensagem.'
                        });
                      }
                    }}
                    className="flex-1 sm:flex-initial px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isSendingWa ? <RefreshCw size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                    {isSendingWa ? 'Enviando...' : 'Enviar pela Datafy'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
