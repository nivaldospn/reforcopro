'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  User, 
  Phone, 
  Mail, 
  BookOpen,
  Camera,
  X,
  Filter,
  ChevronDown,
  Calendar,
  CreditCard,
  MessageSquare,
  Eye,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  PauseCircle,
  ExternalLink,
  Info,
  TrendingUp,
  GraduationCap,
  Target,
  FileText,
  Sparkles,
  Users
} from 'lucide-react';
import { useApp, StudentStatus, calculateAge } from '@/lib/store';
import { Layout } from '@/components/Layout';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SUBJECT_OPTIONS = [
  'Matemática',
  'Português',
  'Inglês',
  'Ciências',
  'História',
  'Geografia',
  'Física',
  'Química',
  'Redação',
  'Alfabetização',
  'Reforço Geral',
  'Outra'
];

const GRADE_LEVEL_OPTIONS = [
  'Educação Infantil',
  '1º ano',
  '2º ano',
  '3º ano',
  '4º ano',
  '5º ano',
  '6º ano',
  '7º ano',
  '8º ano',
  '9º ano',
  '1º Ensino Médio',
  '2º Ensino Médio',
  '3º Ensino Médio',
  'Ensino Superior',
  'Outro'
];

export default function StudentsPage() {
  const { students, guardians, classes, payments, grades, addStudent, updateStudent, deleteStudent, addClass, addGuardian, addGrade, deleteGrade } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StudentStatus | 'all'>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isNewClassModalOpen, setIsNewClassModalOpen] = useState(false);
  const [isNewGuardianModalOpen, setIsNewGuardianModalOpen] = useState(false);
  
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState<'general' | 'performance' | 'financial' | 'observations'>('general');

  const [newGradeData, setNewGradeData] = useState({
    subject: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    grade: '',
    notes: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    guardianId: '',
    classId: '',
    photo: '',
    status: 'active' as StudentStatus,
    entryDate: format(new Date(), 'yyyy-MM-dd'),
    subject: '',
    gradeLevel: '',
    goals: '',
    observations: ''
  });

  const [newClassData, setNewClassData] = useState({
    name: '',
    description: '',
    schedule: 'A definir',
    days: [] as string[],
    status: 'active' as any
  });

  const [newGuardianData, setNewGuardianData] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: '',
    observations: ''
  });

  // Idade calculada dinamicamente para o formulário
  const formCalculatedAge = useMemo(() => {
    return calculateAge(formData.birthDate);
  }, [formData.birthDate]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.subject && s.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.gradeLevel && s.gradeLevel.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      const matchesClass = classFilter === 'all' || s.classId === classFilter;
      const matchesSubject = subjectFilter === 'all' || (s.subject && s.subject.toLowerCase().includes(subjectFilter.toLowerCase()));
      return matchesSearch && matchesStatus && matchesClass && matchesSubject;
    });
  }, [students, searchTerm, statusFilter, classFilter, subjectFilter]);

  const handleOpenModal = (student?: any) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        name: student.name,
        birthDate: student.birthDate || '',
        guardianId: student.guardianId || '',
        classId: student.classId || '',
        photo: student.photo || '',
        status: student.status || 'active',
        entryDate: student.entryDate || format(new Date(), 'yyyy-MM-dd'),
        subject: student.subject || '',
        gradeLevel: student.gradeLevel || '',
        goals: student.goals || '',
        observations: student.observations || ''
      });
    } else {
      setEditingStudent(null);
      setFormData({ 
        name: '', 
        birthDate: '',
        guardianId: '', 
        classId: '', 
        photo: '', 
        status: 'active', 
        entryDate: format(new Date(), 'yyyy-MM-dd'), 
        subject: '',
        gradeLevel: '',
        goals: '',
        observations: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenDetails = (student: any) => {
    setSelectedStudent(student);
    setActiveTab('general');
    setIsDetailsOpen(true);
  };

  const handleCreateNewClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassData.name) return;
    
    const newId = addClass({
      ...newClassData,
      createdAt: new Date().toISOString()
    });
    
    setFormData(prev => ({ ...prev, classId: newId }));
    setIsNewClassModalOpen(false);
    setNewClassData({
      name: '',
      description: '',
      schedule: 'A definir',
      days: [],
      status: 'active'
    });
  };

  const handleCreateNewGuardian = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuardianData.name) return;
    
    const newId = addGuardian({
      name: newGuardianData.name,
      phone: newGuardianData.phone,
      whatsapp: newGuardianData.phone,
      email: newGuardianData.email,
      relationship: newGuardianData.relationship || undefined,
      observations: newGuardianData.observations,
      createdAt: new Date().toISOString()
    });
    
    setFormData(prev => ({ ...prev, guardianId: newId }));
    setIsNewGuardianModalOpen(false);
    setNewGuardianData({
      name: '',
      phone: '',
      email: '',
      relationship: '',
      observations: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('O nome do aluno é obrigatório.');
      return;
    }

    if (editingStudent) {
      updateStudent(editingStudent.id, formData);
    } else {
      addStudent(formData);
    }
    setIsModalOpen(false);
  };

  const getStatusInfo = (status: StudentStatus) => {
    switch (status) {
      case 'active':
        return { 
          label: 'Ativo', 
          color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50',
          icon: <CheckCircle2 size={14} />
        };
      case 'paused':
        return { 
          label: 'Pausado', 
          color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50',
          icon: <PauseCircle size={14} />
        };
      case 'delinquent':
        return { 
          label: 'Inadimplente', 
          color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/50',
          icon: <AlertCircle size={14} />
        };
      case 'new':
        return { 
          label: 'Novo', 
          color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50',
          icon: <Clock size={14} />
        };
      default:
        return { label: status, color: 'text-slate-500 bg-slate-50', icon: null };
    }
  };

  return (
    <Layout title="Gestão de Alunos">
      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12">
        <StatCard 
          label="Total" 
          value={students.length} 
          icon={User} 
          color="bg-gradient-to-br from-blue-500 to-indigo-600" 
        />
        <StatCard 
          label="Ativos" 
          value={students.filter(s => s.status === 'active').length} 
          icon={CheckCircle2} 
          color="bg-gradient-to-br from-emerald-500 to-teal-600" 
        />
        <StatCard 
          label="Atrasos" 
          value={students.filter(s => s.status === 'delinquent').length} 
          icon={AlertCircle} 
          color="bg-gradient-to-br from-rose-500 to-pink-600" 
        />
        <StatCard 
          label="Novos" 
          value={students.filter(s => s.status === 'new').length} 
          icon={Clock} 
          color="bg-gradient-to-br from-amber-500 to-orange-600" 
        />
      </div>

      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full lg:max-w-5xl">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-all duration-300" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar por nome, disciplina ou ano..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all premium-shadow font-medium text-sm"
            />
          </div>
          
          <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
            <div className="relative group shrink-0">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" size={14} />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full pl-9 pr-8 py-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all appearance-none font-bold text-[10px] text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="all">Status</option>
                <option value="active">Ativos</option>
                <option value="paused">Pausados</option>
                <option value="delinquent">Atrasos</option>
                <option value="new">Novos</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>

            <div className="relative group shrink-0">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" size={14} />
              <select 
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all appearance-none font-bold text-[10px] text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="all">Turmas</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>
          </div>
        </div>

        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all hover:shadow-xl active:scale-95 whitespace-nowrap w-full lg:w-auto"
        >
          <Plus size={18} />
          Novo Aluno
        </button>
      </div>

      {/* Desktop View - Modern Table */}
      <div className="hidden lg:block premium-card overflow-hidden border-none premium-shadow">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Aluno</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Acadêmico</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Turma</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Responsável</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              <AnimatePresence mode="popLayout">
                {filteredStudents.map((student, i) => {
                  const guardian = guardians.find(g => g.id === student.guardianId);
                  const cls = classes.find(c => c.id === student.classId);
                  const status = getStatusInfo(student.status);
                  const displayAge = student.birthDate ? calculateAge(student.birthDate) : student.age;
                  
                  return (
                    <motion.tr 
                      key={student.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ delay: i * 0.02 }}
                      className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-all duration-300"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-black text-sm border border-blue-100/50 dark:border-blue-800/50 shadow-sm group-hover:scale-110 transition-transform duration-500 overflow-hidden">
                            {student.photo ? (
                              <Image src={student.photo} alt={student.name} width={48} height={48} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              student.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 transition-colors text-base">{student.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {displayAge !== null && displayAge !== undefined ? (
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">{displayAge} anos</span>
                              ) : null}
                              {student.gradeLevel && (
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                                  {student.gradeLevel}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        {student.subject ? (
                          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                            {student.subject}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Geral</span>
                        )}
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                          {cls?.name || 'Sem turma'}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{guardian?.name || 'Não vinculado'}</span>
                            {guardian?.phone && (
                              <a 
                                href={`https://wa.me/${(guardian.whatsapp || guardian.phone).replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
                                title="Enviar WhatsApp"
                              >
                                <MessageSquare size={14} />
                              </a>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium mt-0.5">{guardian?.phone}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm", status.color)}>
                          {status.icon}
                          {status.label}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleOpenDetails(student)}
                            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-all duration-300"
                            title="Ver Perfil Completo"
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            onClick={() => handleOpenModal(student)}
                            className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-2xl transition-all duration-300"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm(`Deseja realmente excluir o aluno ${student.name}?`)) {
                                deleteStudent(student.id);
                              }
                            }}
                            className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all duration-300"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
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

      {/* Mobile View - Premium Cards */}
      <div className="lg:hidden space-y-4 mb-8">
        <AnimatePresence mode="popLayout">
          {filteredStudents.map((student, i) => {
            const guardian = guardians.find(g => g.id === student.guardianId);
            const cls = classes.find(c => c.id === student.classId);
            const status = getStatusInfo(student.status);
            const displayAge = student.birthDate ? calculateAge(student.birthDate) : student.age;

            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03 }}
                className="premium-card p-5 sm:p-6 active:scale-[0.98] transition-transform border border-slate-100 dark:border-slate-800/50"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-black text-xl overflow-hidden shrink-0 border border-blue-100/50 dark:border-blue-800/50 shadow-sm">
                      {student.photo ? (
                        <Image src={student.photo} alt={student.name} width={64} height={64} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                         student.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate leading-tight">{student.name}</h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {displayAge !== null && displayAge !== undefined && (
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{displayAge} anos</span>
                        )}
                        {student.gradeLevel && (
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                            {student.gradeLevel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => handleOpenModal(student)}
                      className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Deseja realmente excluir o aluno ${student.name}?`)) {
                          deleteStudent(student.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 dark:border-slate-800/50 mb-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Disciplina / Turma</p>
                    <div className="space-y-1">
                      {student.subject && (
                        <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 block truncate">
                          {student.subject}
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate block">
                        {cls?.name || 'Sem turma'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <span className={cn("inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-sm w-full", status.color)}>
                      {status.icon}
                      {status.label}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-3 mb-4 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Responsável</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{guardian?.name || 'Não vinculado'}</p>
                    </div>
                    {guardian?.phone && (
                      <a 
                        href={`https://wa.me/${(guardian.whatsapp || guardian.phone).replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 transition-colors"
                      >
                        <MessageSquare size={16} />
                      </a>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleOpenDetails(student)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md shadow-blue-600/20 active:scale-95 transition-all"
                >
                  <Eye size={16} />
                  Ver Perfil do Aluno
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredStudents.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="py-16 sm:py-32 flex flex-col items-center justify-center text-center"
        >
          <div className="relative mb-6 sm:mb-10">
            <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full animate-pulse" />
            <div className="relative w-24 h-24 sm:w-40 sm:h-40 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 rounded-[2rem] sm:rounded-[3.5rem] flex items-center justify-center border border-slate-200/50 dark:border-slate-800/50 shadow-2xl">
              <User className="w-10 h-10 sm:w-20 sm:h-20" strokeWidth={1.5} />
              <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-8 h-8 sm:w-12 sm:h-12 bg-blue-600 text-white rounded-lg sm:rounded-2xl flex items-center justify-center shadow-lg border-2 sm:border-4 border-white dark:border-slate-900">
                <Plus className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
            </div>
          </div>
          <h3 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Nenhum aluno encontrado</h3>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-sm mt-2 sm:mt-4 max-w-[240px] sm:max-w-sm mx-auto leading-relaxed font-medium">
            Sua lista de alunos está vazia. Comece a organizar seu reforço adicionando o primeiro aluno agora mesmo.
          </p>
          <button 
            onClick={() => handleOpenModal()}
            className="mt-6 sm:mt-10 flex items-center gap-2 sm:gap-3 bg-blue-600 text-white px-6 sm:px-10 py-3 sm:py-5 rounded-xl sm:rounded-[1.5rem] font-black text-[10px] sm:text-sm uppercase tracking-widest shadow-2xl shadow-blue-600/30 hover:scale-105 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Adicionar Aluno
          </button>
        </motion.div>
      )}

      {/* Details Modal (Perfil do Aluno) */}
      <AnimatePresence>
        {isDetailsOpen && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailsOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50 flex flex-col max-h-[92vh] sm:max-h-[90vh]"
            >
              {/* Header do Perfil */}
              <div className="p-4 sm:p-8 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 relative shrink-0">
                <button onClick={() => setIsDetailsOpen(false)} className="absolute top-3 right-3 sm:top-6 sm:right-6 p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all z-10 text-slate-400">
                  <X size={20} />
                </button>

                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white dark:bg-slate-800 rounded-2xl sm:rounded-[1.75rem] flex items-center justify-center text-xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 shadow-lg border-2 border-white dark:border-slate-800 overflow-hidden shrink-0">
                    {selectedStudent.photo ? (
                      <Image src={selectedStudent.photo} alt={selectedStudent.name} width={96} height={96} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      selectedStudent.name.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 text-center sm:text-left min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                      <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">{selectedStudent.name}</h3>
                      <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm mx-auto sm:mx-0 shrink-0", getStatusInfo(selectedStudent.status).color)}>
                        {getStatusInfo(selectedStudent.status).label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-slate-500 dark:text-slate-400 font-bold">
                      {selectedStudent.subject && (
                        <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                          📚 {selectedStudent.subject}
                        </span>
                      )}
                      {selectedStudent.gradeLevel && (
                        <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                          🎓 {selectedStudent.gradeLevel}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <BookOpen size={13} className="text-slate-400" />
                        {classes.find(c => c.id === selectedStudent.classId)?.name || 'Sem turma'}
                      </span>
                    </div>

                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
                      <button 
                        onClick={() => { setIsDetailsOpen(false); handleOpenModal(selectedStudent); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:text-blue-600 text-xs font-bold transition-all active:scale-95"
                      >
                        <Edit2 size={13} />
                        Editar Aluno
                      </button>
                      {guardians.find(g => g.id === selectedStudent.guardianId)?.phone && (
                        <a 
                          href={`https://wa.me/${guardians.find(g => g.id === selectedStudent.guardianId)?.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                        >
                          <MessageSquare size={13} />
                          WhatsApp Responsável
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs de Navegação no Perfil */}
              <div className="flex border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar bg-white dark:bg-slate-900 sticky top-0 z-10 shrink-0">
                {[
                  { id: 'general', label: 'Visão Geral', icon: Info },
                  { id: 'performance', label: 'Evolução & Notas', icon: TrendingUp },
                  { id: 'financial', label: 'Financeiro', icon: CreditCard },
                  { id: 'observations', label: 'Observações', icon: FileText }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-3.5 px-3 text-[10px] font-black uppercase tracking-wider transition-all relative whitespace-nowrap",
                      activeTab === tab.id ? "text-blue-600 dark:text-blue-400" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div layoutId="activeStudentTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* Conteúdo das Abas */}
              <div className="p-4 sm:p-8 overflow-y-auto flex-1 no-scrollbar space-y-6">
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    {/* Dados Básicos */}
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Informações Pessoais & Acadêmicas</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Idade Atual</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                            {selectedStudent.birthDate ? (
                              calculateAge(selectedStudent.birthDate) !== null ? `${calculateAge(selectedStudent.birthDate)} anos` : 'Não informada'
                            ) : (
                              selectedStudent.age ? `${selectedStudent.age} anos` : 'Não informada'
                            )}
                          </p>
                        </div>
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data de Nascimento</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                            {selectedStudent.birthDate ? format(parseISO(selectedStudent.birthDate), "dd/MM/yyyy") : 'Não informada'}
                          </p>
                        </div>
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data de Entrada</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                            {selectedStudent.entryDate ? format(parseISO(selectedStudent.entryDate), "dd/MM/yyyy") : '-'}
                          </p>
                        </div>
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Disciplina(s)</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                            {selectedStudent.subject || 'Geral'}
                          </p>
                        </div>
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ano / Série</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                            {selectedStudent.gradeLevel || 'Não definido'}
                          </p>
                        </div>
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Turma</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                            {classes.find(c => c.id === selectedStudent.classId)?.name || 'Sem turma'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Responsável */}
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Responsável pelo Aluno</h4>
                      {guardians.find(g => g.id === selectedStudent.guardianId) ? (
                        (() => {
                          const guardian = guardians.find(g => g.id === selectedStudent.guardianId);
                          return (
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white text-base">{guardian?.name}</p>
                                  <p className="text-xs text-slate-400">Responsável Vinculado</p>
                                </div>
                                {guardian?.phone && (
                                  <a 
                                    href={`https://wa.me/${guardian.phone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all flex items-center gap-1.5"
                                  >
                                    <MessageSquare size={14} />
                                    {guardian.phone}
                                  </a>
                                )}
                              </div>
                              {guardian?.email && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                  <Mail size={13} className="text-slate-400" />
                                  {guardian.email}
                                </p>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                          <User size={24} className="mx-auto text-slate-300 mb-1" />
                          <p className="text-slate-500 font-bold text-xs">Nenhum responsável vinculado a este aluno.</p>
                        </div>
                      )}
                    </div>

                    {/* Objetivo do Reforço */}
                    {selectedStudent.goals && (
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                          <Target size={14} className="text-blue-500" />
                          Objetivo do Reforço
                        </h4>
                        <div className="p-4 bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                          <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-200 leading-relaxed whitespace-pre-wrap">
                            {selectedStudent.goals}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Observações Iniciais */}
                    {selectedStudent.observations && (
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                          <FileText size={14} className="text-slate-400" />
                          Observações Iniciais
                        </h4>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {selectedStudent.observations}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Aba de Evolução e Desempenho */}
                {activeTab === 'performance' && (
                  <div className="space-y-6">
                    <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-4">Curva de Desempenho</h4>
                      <div className="h-48 w-full">
                        {grades.filter(g => g.studentId === selectedStudent.id).length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={
                              grades.filter(g => g.studentId === selectedStudent.id)
                                .sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
                            }>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                              <XAxis dataKey="date" tickFormatter={(tick) => format(parseISO(tick), 'dd/MM')} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                              <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} width={25} />
                              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                              <Line type="monotone" dataKey="grade" stroke="#2563eb" strokeWidth={3} dot={{ strokeWidth: 2, r: 4, fill: 'white' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center">
                            <TrendingUp size={28} className="text-slate-300 mb-1" />
                            <p className="text-xs text-slate-400 font-bold">Lance notas abaixo para visualizar a evolução gráfica.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Lançar nova nota / parecer */}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if(!newGradeData.subject || !newGradeData.grade) return;
                        addGrade({
                          studentId: selectedStudent.id,
                          subject: newGradeData.subject,
                          date: newGradeData.date,
                          grade: Number(newGradeData.grade),
                          notes: newGradeData.notes
                        });
                        setNewGradeData({ subject: '', date: format(new Date(), 'yyyy-MM-dd'), grade: '', notes: ''});
                      }}
                      className="p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex flex-col gap-3 shadow-sm"
                    >
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-blue-500">Lançar Novo Registro de Evolução</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <input 
                          type="text" 
                          placeholder="Disciplina (ex: Matemática)" 
                          required 
                          value={newGradeData.subject} 
                          onChange={e => setNewGradeData(prev => ({...prev, subject: e.target.value}))} 
                          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 text-xs font-bold col-span-2" 
                        />
                        <input 
                          type="number" 
                          placeholder="Nota (0-10)" 
                          min="0" 
                          max="10" 
                          step="0.1" 
                          required 
                          value={newGradeData.grade} 
                          onChange={e => setNewGradeData(prev => ({...prev, grade: e.target.value}))} 
                          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 text-xs font-bold" 
                        />
                        <input 
                          type="date" 
                          required 
                          value={newGradeData.date} 
                          onChange={e => setNewGradeData(prev => ({...prev, date: e.target.value}))} 
                          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 text-xs font-bold" 
                        />
                        <input 
                          type="text" 
                          placeholder="Parecer / Observação pedagógica (opcional)..." 
                          value={newGradeData.notes} 
                          onChange={e => setNewGradeData(prev => ({...prev, notes: e.target.value}))} 
                          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 text-xs font-medium col-span-2 sm:col-span-4" 
                        />
                        <button 
                          type="submit" 
                          className="col-span-2 sm:col-span-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <Plus size={14} /> Registrar Desempenho
                        </button>
                      </div>
                    </form>

                    {/* Histórico Cronológico de Evolução */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400">Histórico de Registros</h4>
                      {grades.filter(g => g.studentId === selectedStudent.id).length === 0 ? (
                        <p className="text-xs text-slate-400 font-medium py-3 text-center">Nenhum registro de evolução adicionado ainda.</p>
                      ) : (
                        grades.filter(g => g.studentId === selectedStudent.id).sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()).map(g => (
                          <div key={g.id} className="flex flex-row items-center justify-between p-3.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl hover:shadow-sm transition-all">
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">{g.subject}</span>
                                <span className="text-[10px] font-bold text-slate-500 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">{format(parseISO(g.date), 'dd/MM/yyyy')}</span>
                              </div>
                              {g.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{g.notes}</p>}
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-3">
                              <span className="text-xl font-black text-blue-600 dark:text-blue-400 w-12 text-right">{g.grade.toFixed(1)}</span>
                              <button onClick={() => deleteGrade(g.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Aba Financeiro */}
                {activeTab === 'financial' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                      <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-md text-white">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/70 mb-1">Mensalidade Cadastrada</p>
                        <p className="text-xl font-black">
                          R$ {payments.find(p => p.studentId === selectedStudent.id)?.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                        </p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-md text-white">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/70 mb-1">Último Pagamento</p>
                        <p className="text-sm font-black truncate mt-1">
                          {(() => {
                            const lastPaid = payments
                              .filter(p => p.studentId === selectedStudent.id && p.status === 'paid')
                              .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0];
                            return lastPaid ? format(parseISO(lastPaid.date), "dd/MM/yyyy") : 'Nenhum';
                          })()}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Histórico de Mensalidades</h4>
                      <div className="space-y-2">
                        {payments.filter(p => p.studentId === selectedStudent.id).map((p, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", p.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600')}>
                                <CreditCard size={14} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-slate-700 dark:text-slate-300 truncate">{format(parseISO(p.date), 'MMMM yyyy', { locale: ptBR })}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Vencimento: {format(parseISO(p.date), 'dd/MM/yyyy')}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <p className="text-xs font-black text-slate-900 dark:text-white">R$ {p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              <span className={cn("text-[9px] font-black uppercase tracking-widest", p.status === 'paid' ? 'text-emerald-500' : 'text-amber-500')}>
                                {p.status === 'paid' ? 'Pago' : 'Pendente'}
                              </span>
                            </div>
                          </div>
                        ))}
                        {payments.filter(p => p.studentId === selectedStudent.id).length === 0 && (
                          <div className="text-center py-6">
                            <p className="text-xs text-slate-400 font-medium">Nenhum registro de mensalidade encontrado para este aluno.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Aba de Observações */}
                {activeTab === 'observations' && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Anotações e Histórico Pedagógico</p>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 min-h-[140px]">
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {selectedStudent.observations || 'Nenhuma observação registrada para este aluno.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
                <button 
                  onClick={() => setIsDetailsOpen(false)}
                  className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all active:scale-95"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Form Modal (Novo Aluno / Editar Aluno) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50 flex flex-col max-h-[92vh] sm:max-h-[90vh]"
            >
              {/* Header do Modal */}
              <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/30 shrink-0">
                <div>
                  <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {editingStudent ? 'Editar Aluno' : 'Novo Aluno'}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                    Preencha os dados do estudante no Reforço Pro
                  </p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-6 overflow-y-auto flex-1 no-scrollbar">
                {/* 1. SEÇÃO: FOTO DO ALUNO */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative group">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-50 dark:bg-slate-800/50 rounded-2xl sm:rounded-[1.75rem] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden transition-all group-hover:border-blue-500 shadow-inner">
                      {formData.photo ? (
                        <Image src={formData.photo} alt="Preview" width={96} height={96} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <>
                          <Camera size={20} strokeWidth={1.5} className="sm:w-6 sm:h-6" />
                          <span className="text-[7px] sm:text-[8px] font-black mt-1 uppercase tracking-widest">Foto</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setFormData({ ...formData, photo: reader.result as string });
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900">
                      <Plus size={13} />
                    </div>
                  </div>
                </div>

                {/* 2. SEÇÃO: DADOS DO ALUNO */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <User size={16} className="text-blue-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Dados do Aluno</h4>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">
                      Nome Completo <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                      <input 
                        type="text" 
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm text-slate-900 dark:text-white"
                        placeholder="Ex: João Silva"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Data de Nascimento com Idade Calculada */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between ml-1">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">
                          Data de Nascimento
                        </label>
                        {formCalculatedAge !== null && (
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                            🎉 {formCalculatedAge} anos
                          </span>
                        )}
                      </div>
                      <div className="relative group">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <input 
                          type="date" 
                          value={formData.birthDate}
                          onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Data de Entrada */}
                    <div className="space-y-2">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">
                        Data de Entrada
                      </label>
                      <div className="relative group">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <input 
                          type="date" 
                          value={formData.entryDate}
                          onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. SEÇÃO: INFORMAÇÕES ACADÊMICAS */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <GraduationCap size={16} className="text-blue-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Informações Acadêmicas</h4>
                  </div>

                  {/* Disciplina com Chips Rápidos */}
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">
                      Disciplina(s) do Reforço
                    </label>
                    <div className="flex flex-wrap gap-1.5 pb-1">
                      {SUBJECT_OPTIONS.map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => {
                            if (!formData.subject) {
                              setFormData({ ...formData, subject: sub });
                            } else if (formData.subject.includes(sub)) {
                              const updated = formData.subject.split(', ').filter(s => s !== sub).join(', ');
                              setFormData({ ...formData, subject: updated });
                            } else {
                              setFormData({ ...formData, subject: `${formData.subject}, ${sub}` });
                            }
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-xl text-xs font-bold transition-all",
                            formData.subject?.includes(sub)
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                          )}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                    <input 
                      type="text"
                      placeholder="Selecionar disciplina..."
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Ano / Série */}
                    <div className="space-y-2">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">
                        Ano / Série
                      </label>
                      <div className="relative group">
                        <select 
                          value={formData.gradeLevel}
                          onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                          className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer font-bold text-sm text-slate-700 dark:text-slate-300"
                        >
                          <option value="">Selecionar ano/série...</option>
                          {GRADE_LEVEL_OPTIONS.map(lvl => (
                            <option key={lvl} value={lvl}>{lvl}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                      </div>
                    </div>

                    {/* Turma com Botão + Nova */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between ml-1">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">
                          Turma
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsNewClassModalOpen(true)}
                          className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase"
                        >
                          + Nova turma
                        </button>
                      </div>
                      <div className="relative group">
                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <select 
                          value={formData.classId}
                          onChange={(e) => {
                            if (e.target.value === 'new') {
                              setIsNewClassModalOpen(true);
                            } else {
                              setFormData({ ...formData, classId: e.target.value });
                            }
                          }}
                          className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer font-bold text-sm text-slate-700 dark:text-slate-300"
                        >
                          <option value="">Selecionar turma...</option>
                          <option value="new" className="text-blue-600 font-bold">+ Criar nova turma</option>
                          {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. SEÇÃO: RESPONSÁVEL */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-blue-600" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Responsável</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsNewGuardianModalOpen(true)}
                      className="px-3 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1"
                    >
                      <Plus size={13} />
                      Novo Responsável
                    </button>
                  </div>

                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <select 
                      value={formData.guardianId}
                      onChange={(e) => {
                        if (e.target.value === 'new') {
                          setIsNewGuardianModalOpen(true);
                        } else {
                          setFormData({ ...formData, guardianId: e.target.value });
                        }
                      }}
                      className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer font-bold text-sm text-slate-700 dark:text-slate-300"
                    >
                      <option value="">Selecionar responsável...</option>
                      <option value="new" className="text-blue-600 font-bold">+ Criar novo responsável</option>
                      {guardians.map(g => (
                        <option key={g.id} value={g.id}>{g.name} {g.phone ? `(${g.phone})` : ''}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>

                {/* 5. SEÇÃO: OBJETIVO E OBSERVAÇÕES */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Target size={16} className="text-blue-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Objetivo e Observações</h4>
                  </div>

                  {/* Objetivo do Reforço */}
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">
                      Objetivo do Reforço
                    </label>
                    <input 
                      type="text"
                      value={formData.goals}
                      onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                      placeholder="Ex.: melhorar o desempenho em matemática e interpretação de texto..."
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium text-sm text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Observações Iniciais */}
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">
                      Observações Iniciais
                    </label>
                    <textarea 
                      rows={3}
                      value={formData.observations}
                      onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                      placeholder="Ex.: dificuldades, objetivos, informações importantes sobre o aluno..."
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium text-sm text-slate-800 dark:text-slate-200 resize-none"
                    />
                  </div>
                </div>

                {/* 6. SEÇÃO: SITUAÇÃO / STATUS */}
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">
                    Situação do Aluno
                  </label>
                  <div className="relative group">
                    <Info className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as StudentStatus })}
                      className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer font-bold text-sm text-slate-700 dark:text-slate-300"
                    >
                      <option value="active">Ativo</option>
                      <option value="paused">Pausado</option>
                      <option value="delinquent">Inadimplente</option>
                      <option value="new">Novo</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>

                {/* Footer / Botões */}
                <div className="pt-4 flex flex-col sm:flex-row gap-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="order-2 sm:order-1 flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="order-1 sm:order-2 flex-1 px-6 py-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-95"
                  >
                    {editingStudent ? 'Salvar Alterações' : 'Cadastrar Aluno'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Modal de Nova Turma Rápida */}
      <AnimatePresence>
        {isNewClassModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewClassModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 30, stiffness: 500 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/30">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Nova Turma</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Criar turma rapidamente</p>
                </div>
                <button onClick={() => setIsNewClassModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateNewClass} className="p-6 space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Nome da Turma</label>
                  <input 
                    type="text" 
                    required
                    autoFocus
                    value={newClassData.name}
                    onChange={(e) => setNewClassData({ ...newClassData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-sm text-slate-900 dark:text-white"
                    placeholder="Ex: Português - Manhã"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Descrição (Opcional)</label>
                  <textarea 
                    value={newClassData.description}
                    onChange={(e) => setNewClassData({ ...newClassData, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-medium text-sm text-slate-700 dark:text-slate-300 resize-none"
                    placeholder="Breve descrição da turma..."
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsNewClassModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-95"
                  >
                    Criar Turma
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Novo Responsável Rápido */}
      <AnimatePresence>
        {isNewGuardianModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewGuardianModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 30, stiffness: 500 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/30">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Novo Responsável</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Cadastrar e vincular ao aluno</p>
                </div>
                <button onClick={() => setIsNewGuardianModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateNewGuardian} className="p-6 space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">
                    Nome Completo <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    autoFocus
                    value={newGuardianData.name}
                    onChange={(e) => setNewGuardianData({ ...newGuardianData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-sm text-slate-900 dark:text-white"
                    placeholder="Ex: Maria Oliveira"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">
                    Telefone / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="tel" 
                    required
                    value={newGuardianData.phone}
                    onChange={(e) => setNewGuardianData({ ...newGuardianData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-sm text-slate-900 dark:text-white"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Parentesco (Opcional)</label>
                  <input 
                    type="text" 
                    value={newGuardianData.relationship}
                    onChange={(e) => setNewGuardianData({ ...newGuardianData, relationship: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-sm text-slate-900 dark:text-white"
                    placeholder="Ex: Mãe, Pai, Avó, Tutor"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">E-mail (Opcional)</label>
                  <input 
                    type="email" 
                    value={newGuardianData.email}
                    onChange={(e) => setNewGuardianData({ ...newGuardianData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-sm text-slate-900 dark:text-white"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsNewGuardianModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-95"
                  >
                    Salvar e Vincular
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="premium-card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 group transition-all duration-500 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className={cn("w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shrink-0 relative z-10", color)}>
        <Icon size={20} className="sm:w-8 sm:h-8 text-white" />
      </div>
      <div className="min-w-0 relative z-10">
        <p className="text-[9px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest sm:tracking-[0.25em] mb-0.5 sm:mb-1.5 truncate">{label}</p>
        <div className="flex items-baseline gap-1 sm:gap-2">
          <h4 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter truncate">{value}</h4>
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0 sm:mb-1">total</span>
        </div>
      </div>
    </motion.div>
  );
}
