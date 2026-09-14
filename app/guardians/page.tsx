'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Mail, 
  User,
  Camera,
  X,
  MessageCircle,
  MapPin,
  Info,
  Users,
  ExternalLink,
  Filter,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Clock,
  Link as LinkIcon,
  Unlink,
  Copy,
  Check,
  CreditCard,
  HeartHandshake,
  Star
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { Layout } from '@/components/Layout';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const RELATIONSHIP_OPTIONS = [
  'Mãe',
  'Pai',
  'Avó',
  'Avô',
  'Tia',
  'Tio',
  'Irmão',
  'Irmã',
  'Responsável legal',
  'Outro'
];

function formatWhatsApp(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function formatCPF(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

function isValidCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length === 0) return true; // CPF é opcional!
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10))) return false;

  return true;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy}
      type="button"
      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-blue-600"
      title="Copiar"
    >
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  );
}

export default function GuardiansPage() {
  const { 
    guardians, 
    students, 
    addGuardian, 
    updateGuardian, 
    deleteGuardian,
    updateStudent,
    classes
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedGuardian, setSelectedGuardian] = useState<any>(null);
  const [editingGuardian, setEditingGuardian] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'students' | 'contact' | 'observations'>('general');
  const [filterNoStudents, setFilterNoStudents] = useState(false);
  const [cpfError, setCpfError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    cpf: '',
    relationship: 'Mãe',
    customRelationship: '',
    isPrimary: false,
    email: '',
    address: '',
    observations: '',
    photo: ''
  });

  const filteredGuardians = useMemo(() => {
    return guardians.filter(g => {
      const gName = g.name.toLowerCase();
      const gEmail = (g.email || '').toLowerCase();
      const gCpf = (g.cpf || '').replace(/\D/g, '');
      const search = searchTerm.toLowerCase();
      const searchClean = searchTerm.replace(/\D/g, '');
      
      const linkedStudents = students.filter(s => s.guardianId === g.id);
      if (filterNoStudents && linkedStudents.length > 0) return false;

      const matchesGuardian = gName.includes(search) || 
                              gEmail.includes(search) || 
                              (searchClean.length > 0 && gCpf.includes(searchClean)) ||
                              (g.relationship && g.relationship.toLowerCase().includes(search));
      
      const matchesStudent = linkedStudents.some(s => s.name.toLowerCase().includes(search));
      
      return matchesGuardian || matchesStudent;
    });
  }, [guardians, students, searchTerm, filterNoStudents]);

  const handleOpenModal = (guardian?: any) => {
    setCpfError('');
    if (guardian) {
      setEditingGuardian(guardian);
      const isCustomRel = guardian.relationship && !RELATIONSHIP_OPTIONS.includes(guardian.relationship);
      setFormData({
        name: guardian.name || '',
        whatsapp: formatWhatsApp(guardian.whatsapp || guardian.phone || ''),
        cpf: guardian.cpf ? formatCPF(guardian.cpf) : '',
        relationship: isCustomRel ? 'Outro' : (guardian.relationship || 'Mãe'),
        customRelationship: isCustomRel ? guardian.relationship : '',
        isPrimary: guardian.isPrimary ?? false,
        email: guardian.email || '',
        address: guardian.address || '',
        observations: guardian.observations || '',
        photo: guardian.photo || ''
      });
    } else {
      setEditingGuardian(null);
      setFormData({ 
        name: '', 
        whatsapp: '', 
        cpf: '', 
        relationship: 'Mãe', 
        customRelationship: '',
        isPrimary: false,
        email: '', 
        address: '', 
        observations: '', 
        photo: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenDetails = (guardian: any) => {
    setSelectedGuardian(guardian);
    setActiveTab('general');
    setIsDetailsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCpfError('');

    if (!formData.name.trim()) {
      alert('O Nome Completo do responsável é obrigatório.');
      return;
    }

    if (!formData.whatsapp.trim()) {
      alert('O WhatsApp do responsável é obrigatório.');
      return;
    }

    if (formData.cpf && !isValidCPF(formData.cpf)) {
      setCpfError('CPF inválido. Verifique os dígitos informados ou deixe em branco.');
      return;
    }

    const finalRelationship = formData.relationship === 'Outro' && formData.customRelationship.trim() 
      ? formData.customRelationship.trim() 
      : formData.relationship;

    const data = {
      name: formData.name.trim(),
      phone: formData.whatsapp,
      whatsapp: formData.whatsapp,
      cpf: formData.cpf ? formData.cpf.replace(/\D/g, '') : undefined,
      relationship: finalRelationship,
      isPrimary: formData.isPrimary,
      email: formData.email.trim(),
      address: formData.address.trim(),
      observations: formData.observations.trim(),
      photo: formData.photo,
      createdAt: editingGuardian?.createdAt || new Date().toISOString()
    };
    
    if (editingGuardian) {
      updateGuardian(editingGuardian.id, data);
    } else {
      addGuardian(data);
    }
    setIsModalOpen(false);
  };

  const handleLinkStudent = (studentId: string) => {
    if (selectedGuardian) {
      updateStudent(studentId, { guardianId: selectedGuardian.id });
    }
  };

  const handleUnlinkStudent = (studentId: string) => {
    updateStudent(studentId, { guardianId: undefined });
  };

  const getLinkedStudents = (guardianId: string) => {
    return students.filter(s => s.guardianId === guardianId);
  };

  return (
    <Layout title="Gestão de Responsáveis">
      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-10">
        <StatCard 
          label="Total Responsáveis" 
          value={guardians.length} 
          icon={Users} 
          color="bg-gradient-to-br from-blue-600 to-indigo-700" 
        />
        <StatCard 
          label="Contatos Ativos" 
          value={guardians.filter(g => getLinkedStudents(g.id).length > 0).length} 
          icon={CheckCircle2} 
          color="bg-gradient-to-br from-emerald-500 to-teal-600" 
        />
        <StatCard 
          label="Sem Vínculo" 
          value={guardians.filter(g => getLinkedStudents(g.id).length === 0).length} 
          icon={AlertCircle} 
          color="bg-gradient-to-br from-amber-500 to-orange-600" 
        />
        <StatCard 
          label="Novos Contatos" 
          value={guardians.filter(g => {
            const date = g.createdAt ? parseISO(g.createdAt) : new Date();
            const now = new Date();
            return (now.getTime() - date.getTime()) < (7 * 24 * 60 * 60 * 1000);
          }).length} 
          icon={Clock} 
          color="bg-gradient-to-br from-cyan-500 to-blue-600" 
        />
      </div>

      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div className="relative flex-1 max-w-2xl group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-all duration-300" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome do responsável, CPF ou aluno vinculado..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-4 py-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-[1.5rem] outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all premium-shadow font-medium"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <button 
            onClick={() => setFilterNoStudents(!filterNoStudents)}
            className={cn(
              "flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-4 sm:py-5 rounded-[1.25rem] sm:rounded-[1.5rem] font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all border",
              filterNoStudents 
                ? "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20" 
                : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <Filter size={18} />
            {filterNoStudents ? 'Sem Alunos (Ativo)' : 'Sem Alunos'}
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-3 w-full sm:w-auto bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-8 py-4 sm:py-5 rounded-[1.25rem] sm:rounded-[1.5rem] font-black text-xs sm:text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all hover:shadow-2xl hover:shadow-blue-600/30 hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
          >
            <Plus size={20} />
            Novo Responsável
          </button>
        </div>
      </div>

      {/* Desktop View - Refined Table */}
      <div className="hidden lg:block premium-card overflow-hidden border-none premium-shadow">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Responsável</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">WhatsApp / Contato</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Alunos Vinculados</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              <AnimatePresence mode="popLayout">
                {filteredGuardians.map((guardian, i) => {
                  const linkedStudents = getLinkedStudents(guardian.id);
                  const displayPhone = guardian.whatsapp || guardian.phone;
                  
                  return (
                    <motion.tr 
                      key={guardian.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ delay: i * 0.02 }}
                      className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-all duration-300"
                    >
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-black text-lg border border-blue-100/50 dark:border-blue-800/50 shadow-sm group-hover:scale-110 transition-transform duration-500 overflow-hidden relative">
                            {guardian.photo ? (
                              <Image src={guardian.photo} alt={guardian.name} width={56} height={56} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              guardian.name.charAt(0)
                            )}
                            {guardian.isPrimary && (
                              <div className="absolute top-1 right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white dark:border-slate-900" title="Responsável Principal" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-black text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 transition-colors text-base">{guardian.name}</p>
                              {guardian.isPrimary && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg text-[9px] font-black uppercase tracking-wider border border-amber-200/50">
                                  <Star size={10} className="fill-amber-400 text-amber-400" />
                                  Principal
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {guardian.relationship && (
                                <span className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
                                  <HeartHandshake size={12} />
                                  {guardian.relationship}
                                </span>
                              )}
                              {guardian.cpf && (
                                <span>• CPF: {formatCPF(guardian.cpf)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            <MessageCircle size={15} className="text-emerald-500 shrink-0" />
                            {formatWhatsApp(displayPhone)}
                          </div>
                          {guardian.email && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <Mail size={13} className="text-blue-500 shrink-0" />
                              {guardian.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex flex-wrap gap-2">
                          {linkedStudents.length > 0 ? (
                            linkedStudents.map(s => (
                              <span key={s.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl text-[10px] font-black uppercase tracking-wider border border-blue-100 dark:border-blue-800/50">
                                <User size={10} />
                                {s.name.split(' ')[0]}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">Nenhum aluno</span>
                          )}
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <a 
                            href={`https://wa.me/55${displayPhone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-2xl transition-all duration-300"
                            title="Conversar no WhatsApp"
                          >
                            <MessageCircle size={20} />
                          </a>
                          <button 
                            onClick={() => handleOpenDetails(guardian)}
                            className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-all duration-300"
                            title="Ver Detalhes"
                          >
                            <ExternalLink size={20} />
                          </button>
                          <button 
                            onClick={() => handleOpenModal(guardian)}
                            className="p-3 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-2xl transition-all duration-300"
                            title="Editar"
                          >
                            <Edit2 size={20} />
                          </button>
                          <button 
                            onClick={() => { setSelectedGuardian(guardian); setIsDeleteModalOpen(true); }}
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

      {/* Mobile View - Premium Cards */}
      <div className="lg:hidden space-y-4 mb-8">
        <AnimatePresence mode="popLayout">
          {filteredGuardians.map((guardian, i) => {
            const linkedStudents = getLinkedStudents(guardian.id);
            const displayPhone = guardian.whatsapp || guardian.phone;

            return (
              <motion.div
                key={guardian.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03 }}
                className="premium-card p-5 sm:p-6 active:scale-[0.98] transition-transform border border-slate-100 dark:border-slate-800/50"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-black text-xl overflow-hidden shrink-0 border border-blue-100/50 dark:border-blue-800/50 shadow-sm relative">
                      {guardian.photo ? (
                        <Image src={guardian.photo} alt={guardian.name} width={64} height={64} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        guardian.name.charAt(0)
                      )}
                      {guardian.isPrimary && (
                        <div className="absolute top-1 right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white dark:border-slate-900" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate leading-tight">{guardian.name}</h4>
                        {guardian.isPrimary && (
                          <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-md text-[8px] font-black uppercase tracking-wider border border-amber-200/50">
                            Principal
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {guardian.relationship && (
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{guardian.relationship} •</span>
                        )}
                        <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
                          {linkedStudents.length} {linkedStudents.length === 1 ? 'aluno' : 'alunos'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenModal(guardian)}
                      className="p-2 sm:p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => { setSelectedGuardian(guardian); setIsDeleteModalOpen(true); }}
                      className="p-2 sm:p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 py-3 border-y border-slate-100 dark:border-slate-800/80 mb-4">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-400 font-bold flex items-center gap-1.5">
                      <MessageCircle size={14} className="text-emerald-500" /> WhatsApp
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatWhatsApp(displayPhone)}</span>
                  </div>
                  {guardian.cpf && (
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-slate-400 font-bold flex items-center gap-1.5">
                        <CreditCard size={14} className="text-blue-500" /> CPF
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{formatCPF(guardian.cpf)}</span>
                    </div>
                  )}
                  {guardian.email && (
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-slate-400 font-bold flex items-center gap-1.5">
                        <Mail size={14} className="text-blue-500" /> E-mail
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{guardian.email}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/55${displayPhone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl text-center hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={16} /> WhatsApp
                  </a>
                  <button
                    onClick={() => handleOpenDetails(guardian)}
                    className="flex-1 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 border border-blue-100 dark:border-blue-800/50"
                  >
                    <ExternalLink size={16} /> Detalhes
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Details Slide-Over / Modal */}
      <AnimatePresence>
        {isDetailsOpen && selectedGuardian && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailsOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 100 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50 flex flex-col max-h-[92dvh] sm:max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-4 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-base sm:text-xl shadow-lg shadow-blue-600/20 overflow-hidden shrink-0">
                    {selectedGuardian.photo ? (
                      <Image src={selectedGuardian.photo} alt={selectedGuardian.name} width={56} height={56} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      selectedGuardian.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{selectedGuardian.name}</h3>
                    <p className="text-[9px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">
                      {selectedGuardian.relationship ? `${selectedGuardian.relationship} • ` : ''}Responsável
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsDetailsOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400">
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar bg-white dark:bg-slate-900 sticky top-0 z-10 shrink-0">
                {[
                  { id: 'general', label: 'Geral', icon: Info },
                  { id: 'students', label: 'Alunos', icon: Users },
                  { id: 'contact', label: 'Contato', icon: MapPin },
                  { id: 'observations', label: 'Observações', icon: MessageSquare }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-3.5 sm:py-4 px-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all relative min-w-[100px] sm:min-w-[150px]",
                      activeTab === tab.id ? "text-blue-600 font-black" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-4 sm:p-8 overflow-y-auto flex-1 no-scrollbar">
                {activeTab === 'general' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                    <div className="space-y-0.5 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Nome Completo</p>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{selectedGuardian.name}</p>
                    </div>
                    <div className="space-y-0.5 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Parentesco</p>
                      <p className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">{selectedGuardian.relationship || 'Não informado'}</p>
                    </div>
                    <div className="space-y-0.5 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">CPF</p>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{selectedGuardian.cpf ? formatCPF(selectedGuardian.cpf) : 'Não informado (Opcional)'}</p>
                    </div>
                    <div className="space-y-0.5 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Responsável Principal</p>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{selectedGuardian.isPrimary ? 'Sim (Contato prioritário)' : 'Não'}</p>
                    </div>
                    <div className="sm:col-span-2 space-y-0.5 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Resumo de Vínculos</p>
                      <p className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                        Responsável por {getLinkedStudents(selectedGuardian.id).length} {getLinkedStudents(selectedGuardian.id).length === 1 ? 'aluno vinculado' : 'alunos vinculados'}.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'students' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Alunos Vinculados</h4>
                      <button 
                        onClick={() => setIsLinkModalOpen(true)}
                        className="flex items-center gap-1.5 text-[8px] sm:text-[9px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-all border border-blue-100 dark:border-blue-800/50 active:scale-95"
                      >
                        <Plus size={14} />
                        Vincular Aluno
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {getLinkedStudents(selectedGuardian.id).map(student => (
                        <div key={student.id} className="flex items-center justify-between p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 group">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center font-black text-blue-600 text-xs shadow-sm border border-slate-100 dark:border-slate-800 shrink-0">
                              {student.photo ? (
                                <Image src={student.photo} alt={student.name} width={40} height={40} className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                              ) : (
                                student.name.charAt(0)
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white truncate">{student.name}</p>
                              <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">
                                {classes.find(c => c.id === student.classId)?.name || 'Sem turma'}
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleUnlinkStudent(student.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all shrink-0 active:scale-95"
                            title="Remover Vínculo"
                          >
                            <Unlink size={16} />
                          </button>
                        </div>
                      ))}
                      {getLinkedStudents(selectedGuardian.id).length === 0 && (
                        <div className="sm:col-span-2 text-center py-8 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                          <Users size={32} className="mx-auto text-slate-200 mb-2" />
                          <p className="text-slate-500 font-bold text-xs">Nenhum aluno vinculado a este responsável.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'contact' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                    <div className="space-y-0.5 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800 relative group">
                      <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">WhatsApp (Principal)</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {formatWhatsApp(selectedGuardian.whatsapp || selectedGuardian.phone)}
                        </p>
                        <CopyButton text={selectedGuardian.whatsapp || selectedGuardian.phone} />
                      </div>
                    </div>
                    <div className="space-y-0.5 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800 relative group">
                      <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">E-mail</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-none">
                          {selectedGuardian.email || 'Não informado'}
                        </p>
                        {selectedGuardian.email && <CopyButton text={selectedGuardian.email} />}
                      </div>
                    </div>
                    <div className="sm:col-span-2 space-y-0.5 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800 relative group">
                      <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Endereço</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {selectedGuardian.address || 'Não informado'}
                        </p>
                        {selectedGuardian.address && <CopyButton text={selectedGuardian.address} />}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'observations' && (
                  <div className="space-y-3">
                    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Anotações Internas</p>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 min-h-[120px]">
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {selectedGuardian.observations || 'Nenhuma observação registrada.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
                <button 
                  onClick={() => setIsDetailsOpen(false)}
                  className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-slate-50 transition-all active:scale-95"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Form Modal (Novo / Editar Responsável) */}
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
              initial={{ opacity: 0, scale: 0.95, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 100 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50 flex flex-col max-h-[92dvh] sm:max-h-[90vh]"
            >
              <div className="p-4 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/30 shrink-0">
                <div>
                  <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {editingGuardian ? 'Editar Responsável' : 'Novo Responsável'}
                  </h3>
                  <p className="text-[8px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-bold uppercase tracking-widest">
                    Dados de cadastro e contato
                  </p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-4 sm:p-8 space-y-5 sm:space-y-6 overflow-y-auto flex-1 no-scrollbar pb-10">
                  {/* Photo Upload */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative group">
                      <div className="w-20 h-20 sm:w-28 sm:h-28 bg-slate-50 dark:bg-slate-800/50 rounded-2xl sm:rounded-[2.5rem] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-500 group-hover:border-blue-500 shadow-inner">
                        {formData.photo ? (
                          <Image src={formData.photo} alt="Preview" width={112} height={112} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                        ) : (
                          <>
                            <Camera size={20} strokeWidth={1.5} className="sm:w-6 sm:h-6 text-slate-400" />
                            <span className="text-[7px] sm:text-[8px] font-black mt-1 uppercase tracking-[0.2em]">Foto</span>
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
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900 group-hover:rotate-12 transition-all duration-500">
                        <Plus size={14} className="sm:w-4 sm:h-4" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-5">
                    {/* Nome Completo */}
                    <div>
                      <label className="block text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">
                        Nome Completo <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input 
                          type="text" 
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full pl-12 pr-4 py-2.5 sm:py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                          placeholder="Ex: Maria da Silva"
                        />
                      </div>
                    </div>

                    {/* Parentesco e Responsável Principal */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">
                          Parentesco
                        </label>
                        <div className="relative group">
                          <HeartHandshake className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                          <select 
                            value={formData.relationship}
                            onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                            className="w-full pl-12 pr-4 py-2.5 sm:py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-xs sm:text-sm text-slate-900 dark:text-white appearance-none cursor-pointer"
                          >
                            {RELATIONSHIP_OPTIONS.map(opt => (
                              <option key={opt} value={opt} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                        {formData.relationship === 'Outro' && (
                          <div className="mt-2">
                            <input 
                              type="text" 
                              value={formData.customRelationship}
                              onChange={(e) => setFormData({ ...formData, customRelationship: e.target.value })}
                              placeholder="Especifique o parentesco (ex: Padrasto, Vizinha)"
                              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 text-xs font-bold"
                            />
                          </div>
                        )}
                      </div>

                      {/* Switch Responsável Principal */}
                      <div className="flex flex-col justify-end">
                        <label className="block text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">
                          Responsável Principal
                        </label>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, isPrimary: !prev.isPrimary }))}
                          className={cn(
                            "w-full flex items-center justify-between px-4 py-2.5 sm:py-3.5 rounded-xl border transition-all duration-300",
                            formData.isPrimary 
                              ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500/50 text-blue-700 dark:text-blue-300"
                              : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Star size={16} className={formData.isPrimary ? "fill-amber-400 text-amber-400" : "text-slate-400"} />
                            <span className="text-xs font-bold">Contato prioritário</span>
                          </div>
                          <div className={cn(
                            "w-10 h-5 rounded-full transition-colors relative flex items-center p-0.5",
                            formData.isPrimary ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                          )}>
                            <div className={cn(
                              "w-4 h-4 rounded-full bg-white transition-transform",
                              formData.isPrimary ? "translate-x-5" : "translate-x-0"
                            )} />
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* WhatsApp & CPF */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">
                          WhatsApp <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative group">
                          <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                          <input 
                            type="tel" 
                            required
                            value={formData.whatsapp}
                            onChange={(e) => setFormData({ ...formData, whatsapp: formatWhatsApp(e.target.value) })}
                            className="w-full pl-12 pr-4 py-2.5 sm:py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-bold text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                            placeholder="(77) 99999-9999"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">
                          CPF <span className="text-slate-400 font-medium">(Opcional)</span>
                        </label>
                        <div className="relative group">
                          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                          <input 
                            type="text" 
                            value={formData.cpf}
                            onChange={(e) => {
                              setCpfError('');
                              setFormData({ ...formData, cpf: formatCPF(e.target.value) });
                            }}
                            className={cn(
                              "w-full pl-12 pr-4 py-2.5 sm:py-3.5 bg-slate-50 dark:bg-slate-800/50 border rounded-xl outline-none focus:ring-4 transition-all font-bold text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400",
                              cpfError 
                                ? "border-rose-500 focus:ring-rose-500/10 focus:border-rose-500" 
                                : "border-slate-200 dark:border-slate-700 focus:ring-blue-500/5 focus:border-blue-500"
                            )}
                            placeholder="000.000.000-00"
                          />
                        </div>
                        {cpfError && (
                          <p className="text-[10px] font-bold text-rose-500 mt-1 ml-1 flex items-center gap-1">
                            <AlertCircle size={12} /> {cpfError}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* E-mail & Endereço */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">
                          E-mail <span className="text-slate-400 font-medium">(Opcional)</span>
                        </label>
                        <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                          <input 
                            type="email" 
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full pl-12 pr-4 py-2.5 sm:py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                            placeholder="exemplo@email.com"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">
                          Endereço <span className="text-slate-400 font-medium">(Opcional)</span>
                        </label>
                        <div className="relative group">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                          <input 
                            type="text" 
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="w-full pl-12 pr-4 py-2.5 sm:py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                            placeholder="Rua, Número, Bairro, Cidade"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Observações */}
                    <div>
                      <label className="block text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">
                        Observações <span className="text-slate-400 font-medium">(Opcional)</span>
                      </label>
                      <textarea 
                        value={formData.observations}
                        onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2.5 sm:py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-medium text-xs sm:text-sm text-slate-700 dark:text-slate-300 resize-none placeholder:text-slate-400"
                        placeholder="Informações importantes sobre o responsável, preferência de contato, observações etc."
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Buttons (Alterado do roxo para o azul principal do Reforço Pro) */}
                <div className="p-4 sm:p-8 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 shrink-0">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="order-2 sm:order-1 flex-1 px-4 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="order-1 sm:order-2 flex-1 px-4 py-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all hover:shadow-xl hover:shadow-blue-600/30"
                  >
                    {editingGuardian ? 'Salvar Alterações' : 'Cadastrar Responsável'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && selectedGuardian && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 100 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50"
            >
              <div className="p-6 sm:p-10 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Trash2 size={32} className="sm:w-10 sm:h-10" />
                </div>
                <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2 sm:mb-4">Excluir Responsável?</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-6 sm:mb-10 leading-relaxed">
                  Você está prestes a excluir <span className="font-black text-slate-900 dark:text-white">{selectedGuardian.name}</span>. Esta ação não pode ser desfeita e removerá o vínculo com todos os alunos.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button 
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="flex-1 py-3 sm:py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl sm:rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => { deleteGuardian(selectedGuardian.id); setIsDeleteModalOpen(false); }}
                    className="flex-1 py-3 sm:py-4 bg-rose-600 text-white font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl sm:rounded-2xl shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all active:scale-95"
                  >
                    Excluir
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

function StatCard({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="premium-card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 group hover:scale-[1.02] transition-all duration-500"
    >
      <div className={cn("w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:rotate-6 shrink-0", color)}>
        <Icon size={20} className="sm:w-7 sm:h-7 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest sm:tracking-[0.2em] mb-0.5 sm:mb-1 truncate">{label}</p>
        <div className="flex items-baseline gap-2">
          <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">{value}</h4>
        </div>
      </div>
    </motion.div>
  );
}
