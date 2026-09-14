'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  BookOpen, 
  Clock, 
  Users,
  X,
  ChevronRight,
  Calendar,
  Info,
  UserPlus,
  UserMinus,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  MoreVertical,
  Filter,
  LayoutGrid,
  List as ListIcon,
  ExternalLink,
  Share2
} from 'lucide-react';
import { useApp, ClassStatus } from '@/lib/store';
import { Layout } from '@/components/Layout';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DAYS_OF_WEEK = [
  'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'
];

export default function ClassesPage() {
  const { classes, students, addClass, updateClass, deleteClass, updateStudent } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'geral' | 'alunos' | 'horarios' | 'obs'>('geral');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [isLinkingStudent, setIsLinkingStudent] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    schedule: '',
    description: '',
    days: [] as string[],
    observations: '',
    status: 'active' as ClassStatus
  });

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'active': 'Ativo',
      'paused': 'Pausado',
      'delinquent': 'Inadimplente',
      'new': 'Novo'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800';
      case 'paused': return 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-800';
      case 'delinquent': return 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 border-rose-100 dark:border-rose-800';
      case 'new': return 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800';
      default: return 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  };

  const editingClass = classes.find(c => c.id === editingClassId);
  const selectedClass = classes.find(c => c.id === selectedClassId);

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (statusFilter === 'all' || c.status === statusFilter)
  );

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const handleOpenModal = (cls?: any) => {
    if (cls) {
      setEditingClassId(cls.id);
      setFormData({
        name: cls.name,
        schedule: cls.schedule,
        description: cls.description || '',
        days: cls.days || [],
        observations: cls.observations || '',
        status: cls.status || 'active'
      });
    } else {
      setEditingClassId(null);
      setFormData({ 
        name: '', 
        schedule: '',
        description: '',
        days: [],
        observations: '',
        status: 'active'
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenDetails = (cls: any) => {
    setSelectedClassId(cls.id);
    setActiveTab('geral');
    setIsDetailsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      createdAt: editingClass ? editingClass.createdAt : new Date().toISOString()
    };

    if (editingClassId && editingClass) {
      updateClass(editingClassId, data);
    } else {
      addClass(data);
    }
    setIsModalOpen(false);
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const handleShare = (cls: any) => {
    const classStudents = students.filter(s => s.classId === cls.id);
    const text = `*Turma: ${cls.name}*\n📅 Dias: ${cls.days.join(', ')}\n⏰ Horário: ${cls.schedule}\n👥 Alunos (${classStudents.length}):\n${classStudents.map(s => `- ${s.name}`).join('\n')}\n\n_Gerado por Reforço Pro_`;
    
    navigator.clipboard.writeText(text);
    setToastMessage('Resumo da turma copiado para a área de transferência!');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleLinkStudent = (studentId: string) => {
    if (selectedClassId) {
      updateStudent(studentId, { classId: selectedClassId });
      setIsLinkingStudent(false);
      setStudentSearchTerm('');
      setToastMessage('Aluno vinculado com sucesso!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const handleUnlinkStudent = (studentId: string) => {
    updateStudent(studentId, { classId: undefined });
    setToastMessage('Aluno removido da turma.');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleDelete = (cls: any) => {
    setSelectedClassId(cls.id);
    setIsDeleteModalOpen(true);
  };

  return (
    <Layout title="Turmas">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-10">
        <StatCard 
          label="Total de Turmas" 
          value={classes.length} 
          icon={BookOpen} 
          color="bg-gradient-to-br from-indigo-500 to-blue-600" 
        />
        <StatCard 
          label="Alunos Ativos" 
          value={students.filter(s => s.classId && s.status === 'active').length} 
          icon={Users} 
          color="bg-gradient-to-br from-emerald-500 to-teal-600" 
        />
        <StatCard 
          label="Aulas Hoje" 
          value={classes.filter(c => c.days.includes(format(new Date(), 'EEEE', { locale: ptBR }))).length} 
          icon={Calendar} 
          color="bg-gradient-to-br from-amber-500 to-orange-600" 
        />
        <StatCard 
          label="Turmas Inativas" 
          value={classes.filter(c => c.status === 'inactive').length} 
          icon={AlertCircle} 
          color="bg-gradient-to-br from-rose-500 to-rose-600" 
        />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1 max-w-5xl">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Buscar turma por nome..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all premium-shadow font-medium"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl premium-shadow">
            {(['all', 'active', 'inactive'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  statusFilter === status
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {status === 'all' ? 'Todas' : status === 'active' ? 'Ativas' : 'Inativas'}
              </button>
            ))}
          </div>

          {(searchTerm || statusFilter !== 'all') && (
            <button 
              onClick={clearFilters}
              className="flex items-center justify-center gap-2 px-4 py-4 text-slate-500 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest transition-all"
            >
              <Filter size={16} />
              Limpar
            </button>
          )}

          <div className="hidden md:flex items-center gap-1 p-1.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl premium-shadow">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-xl transition-all ${
                viewMode === 'grid'
                  ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Grade"
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-xl transition-all ${
                viewMode === 'list'
                  ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Lista"
            >
              <ListIcon size={20} />
            </button>
          </div>
        </div>

        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-3 bg-gradient-to-br from-indigo-600 to-blue-700 text-white px-8 py-4 rounded-[1.5rem] font-bold shadow-lg shadow-indigo-600/20 transition-all hover:shadow-xl hover:shadow-indigo-600/30 active:scale-95 whitespace-nowrap"
        >
          <Plus size={20} />
          Nova Turma
        </button>
      </div>

      {filteredClasses.length > 0 ? (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-4"}>
          <AnimatePresence mode="popLayout">
            {filteredClasses.map((cls, i) => {
              const classStudents = students.filter(s => s.classId === cls.id);

              if (viewMode === 'list') {
                return (
                  <motion.div
                    key={cls.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.03 }}
                    className="premium-card p-4 flex items-center gap-6 group hover:border-indigo-500/30"
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner transition-colors shrink-0 ${
                      cls.status === 'active' 
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100/50'
                        : 'bg-slate-50 dark:bg-slate-900/20 text-slate-400 border-slate-100'
                    }`}>
                      <BookOpen size={24} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">{cls.name}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar size={12} className="text-indigo-500" />
                          <span>{cls.days.join(', ')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock size={12} className="text-indigo-500" />
                          <span>{cls.schedule}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Users size={12} className="text-indigo-500" />
                          <span>{classStudents.length} alunos</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        onClick={() => handleShare(cls)}
                        className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-all"
                        title="Compartilhar"
                      >
                        <Share2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleOpenModal(cls)}
                        className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(cls)}
                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleOpenDetails(cls)}
                        className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-all"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={cls.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                  className="premium-card p-5 sm:p-6 group relative active:scale-[0.98] transition-transform flex flex-col h-full"
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center border shadow-inner transition-colors shrink-0 ${
                        cls.status === 'active' 
                          ? 'bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100/50 dark:border-indigo-800/50'
                          : 'bg-slate-50 dark:bg-slate-900/20 text-slate-400 border-slate-100 dark:border-slate-800'
                      }`}>
                        <BookOpen size={28} className="sm:w-8 sm:h-8" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate leading-tight">{cls.name}</h3>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                          <Calendar size={14} className="text-indigo-500 shrink-0" />
                          <span className="truncate">{cls.days.length > 0 ? cls.days.join(', ') : 'A definir'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={() => handleShare(cls)}
                        className="p-2 sm:p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-all"
                        title="Compartilhar"
                      >
                        <Share2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleOpenModal(cls)}
                        className="p-2 sm:p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl transition-all"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(cls)}
                        className="p-2 sm:p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-indigo-500 shrink-0" />
                      <span className="font-bold">{cls.schedule || 'A definir'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-indigo-500 shrink-0" />
                      <span className="font-bold">{classStudents.length} {classStudents.length === 1 ? 'aluno' : 'alunos'}</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleOpenDetails(cls)}
                      className="px-6 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest active:scale-95 transition-all shrink-0 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                    >
                      Gerenciar
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
            <BookOpen size={48} className="text-slate-300" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Nenhuma turma encontrada</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm text-center">
            {searchTerm ? `Não encontramos resultados para "${searchTerm}". Tente outro termo.` : 'Comece criando sua primeira turma para organizar seus alunos.'}
          </p>
          {searchTerm ? (
            <button 
              onClick={() => setSearchTerm('')}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-8 py-4 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              <X size={20} />
              Limpar Busca
            </button>
          ) : (
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:scale-105 transition-all"
            >
              <Plus size={20} />
              Criar Primeira Turma
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50"
            >
              <div className="p-5 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {editingClass ? 'Editar Turma' : 'Nova Turma'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto p-5 sm:p-8 space-y-8 sm:space-y-10 custom-scrollbar no-scrollbar">
                <div className="space-y-10">
                  {/* Basic Info Section */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center">
                        <Info size={20} />
                      </div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Informações Básicas</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Nome da Turma <span className="text-rose-500">*</span></label>
                        <input 
                          type="text" 
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                          placeholder="Ex: Reforço Matemática - 5º Ano"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Horário <span className="text-rose-500">*</span></label>
                        <div className="relative">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type="text" 
                            required
                            value={formData.schedule}
                            onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                            className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                            placeholder="Ex: 14:00 - 15:30"
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Schedule & Status Section */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center">
                        <Calendar size={20} />
                      </div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Agenda & Status</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Dias da Semana</label>
                        <div className="flex flex-wrap gap-2">
                          {DAYS_OF_WEEK.map((day) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleDay(day)}
                              className={`px-4 py-2.5 rounded-xl text-[10px] font-bold transition-all border flex items-center gap-2 ${
                                formData.days.includes(day)
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                              }`}
                            >
                              {day.substring(0, 3)}
                              {formData.days.includes(day) && <CheckCircle2 size={12} />}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Status da Turma</label>
                        <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                          {(['active', 'inactive'] as ClassStatus[]).map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => setFormData({ ...formData, status })}
                              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                formData.status === status
                                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                                  : 'text-slate-500 hover:text-slate-700'
                              }`}
                            >
                              {status === 'active' ? 'Ativa' : 'Inativa'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Details Section */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl flex items-center justify-center">
                        <BookOpen size={20} />
                      </div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Detalhes & Notas</h4>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Descrição Curta</label>
                        <textarea 
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium resize-none h-24"
                          placeholder="Uma breve descrição da turma..."
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Observações Internas</label>
                        <textarea 
                          value={formData.observations}
                          onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                          className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium resize-none h-32"
                          placeholder="Anotações sobre a rotina, material necessário, etc..."
                        />
                      </div>
                    </div>
                  </section>
                </div>

                <div className="pt-6 flex gap-4 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-4 bg-gradient-to-br from-indigo-600 to-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:shadow-lg hover:shadow-indigo-600/20 transition-all active:scale-95"
                  >
                    {editingClass ? 'Salvar Alterações' : 'Criar Turma'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {isDetailsOpen && selectedClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 sm:p-8 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 relative z-10">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-indigo-600/20 group-hover:scale-105 transition-transform shrink-0">
                      <BookOpen size={40} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-2">
                        <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{selectedClass.name}</h3>
                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${
                          selectedClass.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' 
                            : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}>
                          {selectedClass.status === 'active' ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-y-2 gap-x-6 text-slate-500 dark:text-slate-400 font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-indigo-500" />
                          <span className="text-sm">{selectedClass.days.join(', ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-indigo-500" />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{selectedClass.schedule}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-indigo-500" />
                          <span className="text-sm">{students.filter(s => s.classId === selectedClass.id).length} Alunos</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center md:justify-end gap-2">
                    <button 
                      onClick={() => handleShare(selectedClass)}
                      className="p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-emerald-600 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm hover:shadow-md"
                      title="Compartilhar Resumo"
                    >
                      <Share2 size={20} />
                    </button>
                    <button 
                      onClick={() => { setIsDetailsOpen(false); handleOpenModal(selectedClass); }}
                      className="p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm hover:shadow-md"
                      title="Editar Turma"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button 
                      onClick={() => setIsDetailsOpen(false)}
                      className="p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-2xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm hover:shadow-md"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 p-1.5 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl w-full md:w-fit relative z-10 border border-slate-200/50 dark:border-slate-700/50 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'geral', label: 'Geral', icon: Info },
                    { id: 'alunos', label: 'Alunos', icon: Users },
                    { id: 'horarios', label: 'Horários', icon: Clock },
                    { id: 'obs', label: 'Observações', icon: BookOpen },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      <tab.icon size={16} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-10 custom-scrollbar no-scrollbar">
                {activeTab === 'geral' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-8">
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Informações Estruturais</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-indigo-600 shadow-sm">
                                <BookOpen size={16} />
                              </div>
                              <span className="text-sm text-slate-500 font-medium">Nome da Turma</span>
                            </div>
                            <span className="text-sm font-black text-slate-900 dark:text-white">{selectedClass.name}</span>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-indigo-600 shadow-sm">
                                <Users size={16} />
                              </div>
                              <span className="text-sm text-slate-500 font-medium">Alunos</span>
                            </div>
                            <span className="text-sm font-black text-slate-900 dark:text-white">{students.filter(s => s.classId === selectedClass.id).length} matriculados</span>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-indigo-600 shadow-sm">
                                <Calendar size={16} />
                              </div>
                              <span className="text-sm text-slate-500 font-medium">Criação</span>
                            </div>
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              {format(parseISO(selectedClass.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-8">
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Descrição da Turma</h4>
                        <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 relative group">
                          <div className="absolute -top-3 -left-3 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Info size={16} />
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                            {selectedClass.description ? `"${selectedClass.description}"` : 'Nenhuma descrição detalhada informada para esta turma.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'alunos' && (
                  <div className="space-y-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Alunos Matriculados</h4>
                        <p className="text-xs text-slate-500">
                          {students.filter(s => s.classId === selectedClass.id).length} alunos matriculados
                        </p>
                      </div>
                      <button 
                        onClick={() => setIsLinkingStudent(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-105 transition-all"
                      >
                        <UserPlus size={16} />
                        Vincular Aluno
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {students.filter(s => s.classId === selectedClass.id).map((student) => (
                        <div key={student.id} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-indigo-200 dark:hover:border-indigo-800 transition-all shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 relative overflow-hidden ring-2 ring-slate-100 dark:ring-slate-800 group-hover:ring-indigo-100 dark:group-hover:ring-indigo-900 transition-all">
                              {student.photo ? (
                                <Image src={student.photo} alt={student.name} fill className="object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                                  {student.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{student.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md border ${getStatusColor(student.status)}`}>
                                  {getStatusLabel(student.status)}
                                </span>
                                <span className="text-[10px] text-slate-400">{student.age} anos</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => {
                                // Navigate to student details or open student modal
                                // For now, just a placeholder
                              }}
                              className="p-2 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                              title="Ver Aluno"
                            >
                              <ExternalLink size={18} />
                            </button>
                            <button 
                              onClick={() => handleUnlinkStudent(student.id)}
                              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                              title="Remover da Turma"
                            >
                              <UserMinus size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {students.filter(s => s.classId === selectedClass.id).length === 0 && (
                        <div className="col-span-full py-16 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/30 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                          <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mb-4 shadow-sm">
                            <Users size={32} className="text-slate-300" />
                          </div>
                          <p className="text-sm text-slate-500 font-bold">Nenhum aluno nesta turma ainda.</p>
                          <p className="text-xs text-slate-400 mt-1">Clique em &quot;Vincular Aluno&quot; para começar.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'horarios' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-8">
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Dias de Aula</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {DAYS_OF_WEEK.map(day => (
                            <div 
                              key={day}
                              className={`px-4 py-4 rounded-2xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-2 text-center ${
                                selectedClass.days.includes(day)
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-800'
                              }`}
                            >
                              <span className="text-[10px] uppercase tracking-widest opacity-60">{day.substring(0, 3)}</span>
                              <span className="text-sm">{day}</span>
                              {selectedClass.days.includes(day) && <CheckCircle2 size={14} className="mt-1" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-8">
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Horário Definido</h4>
                        <div className="p-10 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-800 flex flex-col items-center justify-center text-center gap-6">
                          <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-indigo-600 shadow-xl shadow-indigo-600/10">
                            <Clock size={40} />
                          </div>
                          <div>
                            <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{selectedClass.schedule}</p>
                            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-[0.2em] mt-3">Horário de Brasília</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'obs' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Anotações do Professor</h4>
                      <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg border border-amber-100 dark:border-amber-800">
                        <AlertCircle size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Uso Interno</span>
                      </div>
                    </div>
                    <div className="p-10 bg-amber-50/30 dark:bg-amber-900/5 rounded-[3rem] border-2 border-dashed border-amber-100 dark:border-amber-900/20 min-h-[300px] relative">
                      <div className="absolute top-8 left-8 text-amber-200 dark:text-amber-900/40">
                        <BookOpen size={48} />
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap relative z-10 font-medium">
                        {selectedClass.observations || 'Nenhuma observação interna cadastrada para esta turma. Use este espaço para anotar detalhes sobre a rotina, materiais específicos ou necessidades especiais do grupo.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Link Student Modal */}
      <AnimatePresence>
        {isLinkingStudent && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLinkingStudent(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50 flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Vincular Aluno</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-widest">Selecione um aluno sem turma</p>
                </div>
                <button onClick={() => setIsLinkingStudent(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                  <input 
                    type="text" 
                    placeholder="Buscar aluno por nome..." 
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30 dark:bg-slate-900/30">
                <div className="grid grid-cols-1 gap-3">
                  {students
                    .filter(s => !s.classId && s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()))
                    .map((student) => (
                      <button
                        key={student.id}
                        onClick={() => handleLinkStudent(student.id)}
                        className="w-full p-5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-[1.5rem] flex items-center gap-5 transition-all group border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 shadow-sm hover:shadow-md"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-900 relative overflow-hidden ring-2 ring-slate-100 dark:ring-slate-800 group-hover:ring-indigo-200 dark:group-hover:ring-indigo-800 transition-all">
                          {student.photo ? (
                            <Image src={student.photo} alt={student.name} fill className="object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-lg">
                              {student.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-base font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors tracking-tight">{student.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border ${getStatusColor(student.status)}`}>
                              {getStatusLabel(student.status)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">• Pronto para vincular</span>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <Plus size={20} />
                        </div>
                      </button>
                    ))}
                  {students.filter(s => !s.classId && s.name.toLowerCase().includes(studentSearchTerm.toLowerCase())).length === 0 && (
                    <div className="py-16 text-center bg-white dark:bg-slate-800/50 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users size={32} className="text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-500 font-bold">Nenhum aluno disponível para vínculo.</p>
                      <p className="text-xs text-slate-400 mt-1">Todos os alunos já possuem uma turma ou não existem alunos cadastrados.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && selectedClass && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 text-center border border-slate-200/50 dark:border-slate-800/50"
            >
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Excluir Turma?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                Você está prestes a excluir a turma <span className="font-bold text-slate-900 dark:text-white">&quot;{selectedClass.name}&quot;</span>. 
                Os alunos vinculados não serão excluídos, apenas ficarão sem turma. Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    deleteClass(selectedClass.id);
                    setIsDeleteModalOpen(false);
                    setIsDetailsOpen(false);
                  }}
                  className="flex-1 px-6 py-4 bg-rose-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-all active:scale-95"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10 dark:border-slate-200"
          >
            <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 size={18} />
            </div>
            <p className="text-sm font-bold tracking-tight">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: string }) {
  return (
    <div className="premium-card p-4 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 group hover:-translate-y-1.5 transition-all relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/5 rounded-full translate-x-10 -translate-y-10 blur-3xl group-hover:bg-slate-500/10 transition-colors" />
      <div className={`w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center text-white shadow-xl ${color} group-hover:scale-110 transition-transform relative z-10 shrink-0 shadow-indigo-500/20`}>
        <Icon size={20} className="sm:w-8 sm:h-8" />
      </div>
      <div className="min-w-0 relative z-10">
        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest sm:tracking-[0.25em] mb-0.5 sm:mb-2 truncate">{label}</p>
        <div className="flex items-baseline gap-3">
          <h3 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter truncate">{value}</h3>
        </div>
      </div>
    </div>
  );
}
