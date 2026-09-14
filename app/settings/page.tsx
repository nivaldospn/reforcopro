'use client';

import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useApp } from '@/lib/store';
import { useTheme } from '@/components/ThemeProvider';
import { 
  User, 
  Mail, 
  Phone, 
  Camera, 
  Moon, 
  Sun, 
  LogOut, 
  Shield, 
  Bell, 
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  MessageSquare,
  Send,
  Radio,
  Clock,
  Sparkles,
  ExternalLink,
  History,
  Check,
  XCircle,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export default function SettingsPage() {
  const { 
    user, 
    updateUser, 
    logout,
    whatsappConnection,
    whatsappSettings,
    whatsappLogs,
    saveWhatsAppConnection,
    disconnectWhatsApp,
    saveWhatsAppSettings,
    sendTestWhatsAppMessage,
    processPaymentRemindersNow,
    refreshWhatsAppLogs,
    students,
    guardians
  } = useApp();
  const { theme, toggleTheme, mounted } = useTheme();
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    photo: user?.photo || ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'perfil' | 'whatsapp' | 'aparencia' | 'conta'>('perfil');

  // WhatsApp Sub-tabs & States
  const [waSubTab, setWaSubTab] = useState<'conexao' | 'lembretes' | 'historico'>('conexao');
  const [isConnectingWa, setIsConnectingWa] = useState(false);
  const [isSavingWaSettings, setIsSavingWaSettings] = useState(false);
  const [waSettingsStatus, setWaSettingsStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Test Message State
  const [testPhone, setTestPhone] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'success' | 'error'; message?: string }>({ status: 'idle' });

  // Process Reminders State
  const [isProcessingNow, setIsProcessingNow] = useState(false);
  const [processResult, setProcessResult] = useState<{ status: 'idle' | 'success' | 'error'; message?: string; stats?: any }>({ status: 'idle' });

  // WhatsApp Settings Form
  const [waSettingsForm, setWaSettingsForm] = useState({
    enabled: false,
    reminder_time: '08:00',
    message_template: `Olá, {responsavel}! 😊\n\nPassando para lembrar que a mensalidade do aluno {aluno} vence hoje.\n\nValor: {valor}\nVencimento: {vencimento}\n\nObrigado!`
  });

  // Manual Connection Modal Form (Embedded / Datafy Credentials)
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [connectFormData, setConnectFormData] = useState({
    phoneNumberId: '',
    wabaId: '',
    phoneNumber: '',
    displayName: ''
  });

  // History Filters
  const [logFilter, setLogFilter] = useState<'all' | 'sent' | 'delivered' | 'read' | 'failed' | 'auto' | 'manual'>('all');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        photo: user.photo || ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (whatsappSettings) {
      setWaSettingsForm({
        enabled: whatsappSettings.enabled,
        reminder_time: whatsappSettings.reminder_time?.substring(0, 5) || '08:00',
        message_template: whatsappSettings.message_template
      });
    }
  }, [whatsappSettings]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus('idle');

    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      updateUser(formData);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'perfil', label: 'Perfil', icon: User },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'aparencia', label: 'Aparência', icon: Smartphone },
    { id: 'conta', label: 'Conta', icon: Shield },
  ];

  return (
    <Layout title="Configurações">
      <div className="w-full max-w-5xl mx-auto overflow-hidden">
        {/* Mobile Tabs */}
        <div className="flex md:hidden items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl mb-6 overflow-x-auto no-scrollbar w-full touch-pan-x">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" 
                  : "text-slate-500 dark:text-slate-400"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Desktop Tabs */}
          <div className="hidden md:block w-64 shrink-0 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center justify-between w-full px-5 py-4 rounded-2xl transition-all duration-300 group",
                  activeTab === tab.id 
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-800/50" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <tab.icon size={18} className={cn("transition-transform group-hover:scale-110", activeTab === tab.id ? "text-blue-600 dark:text-blue-400" : "text-slate-400")} />
                  <span className="font-bold text-sm">{tab.label}</span>
                </div>
                <ChevronRight size={16} className={cn("transition-transform", activeTab === tab.id ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0")} />
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {activeTab === 'perfil' && (
                <motion.div
                  key="perfil"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="premium-card p-4 sm:p-10">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8 mb-8 sm:mb-10">
                      <div className="relative group self-center sm:self-auto">
                        <div className="w-20 h-20 sm:w-32 sm:h-32 bg-slate-100 dark:bg-slate-800 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-500 group-hover:border-blue-500 shadow-inner">
                          {formData.photo ? (
                            <Image 
                              src={formData.photo} 
                              alt="Avatar" 
                              width={128} 
                              height={128} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <User size={40} className="sm:size-12" />
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Camera size={24} className="text-white" />
                          </div>
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
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3 text-center">Foto de Perfil</p>
                      </div>

                      <div className="flex-1 space-y-1">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Informações Pessoais</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Atualize seus dados de contato e foto de perfil.</p>
                      </div>
                    </div>

                    <form onSubmit={handleSaveProfile} className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2 min-w-0">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                          <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input 
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({...formData, name: e.target.value})}
                              className="w-full pl-11 sm:pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl sm:rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-medium text-sm sm:text-base"
                              placeholder="Seu nome"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2 min-w-0">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                          <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input 
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({...formData, email: e.target.value})}
                              className="w-full pl-11 sm:pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl sm:rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-medium text-sm sm:text-base"
                              placeholder="seu@email.com"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2 min-w-0">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone</label>
                          <div className="relative group">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input 
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => setFormData({...formData, phone: e.target.value})}
                              className="w-full pl-11 sm:pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl sm:rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-medium text-sm sm:text-base"
                              placeholder="(00) 00000-0000"
                            />
                          </div>
                        </div>

                      </div>

                      <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <AnimatePresence>
                            {saveStatus === 'success' && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm"
                              >
                                <CheckCircle2 size={18} />
                                Perfil salvo com sucesso!
                              </motion.div>
                            )}
                            {saveStatus === 'error' && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm"
                              >
                                <AlertCircle size={18} />
                                Erro ao salvar perfil.
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <button 
                          type="submit"
                          disabled={isSaving}
                          className="w-full sm:w-auto flex items-center justify-center gap-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all hover:shadow-2xl hover:shadow-blue-600/30 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 size={18} className="animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            'Salvar Alterações'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}

              {/* ABA WHATSAPP */}
              {activeTab === 'whatsapp' && (
                <motion.div
                  key="whatsapp"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* WhatsApp Sub-navigation */}
                  <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl w-full overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => setWaSubTab('conexao')}
                      className={cn(
                        "flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                        waSubTab === 'conexao'
                          ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                      )}
                    >
                      <Radio size={16} />
                      Conexão Datafy
                    </button>
                    <button
                      onClick={() => setWaSubTab('lembretes')}
                      className={cn(
                        "flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                        waSubTab === 'lembretes'
                          ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                      )}
                    >
                      <Clock size={16} />
                      Lembretes Automáticos
                    </button>
                    <button
                      onClick={() => {
                        setWaSubTab('historico');
                        refreshWhatsAppLogs();
                      }}
                      className={cn(
                        "flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                        waSubTab === 'historico'
                          ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                      )}
                    >
                      <History size={16} />
                      Histórico ({whatsappLogs.length})
                    </button>
                  </div>

                  {/* 1. SUB-ABA: CONEXÃO DATAFY */}
                  {waSubTab === 'conexao' && (
                    <div className="space-y-6">
                      <div className="premium-card p-6 sm:p-10">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shadow-inner">
                              <MessageSquare size={28} />
                            </div>
                            <div>
                              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">WhatsApp Business API</h2>
                              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Integração oficial via Datafy / Meta Cloud API</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {whatsappConnection?.status === 'connected' ? (
                              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-full text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                🟢 Conectado
                              </div>
                            ) : whatsappConnection?.status === 'connecting' ? (
                              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-full text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-wider">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                🟡 Configurando
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-full text-rose-600 dark:text-rose-400 text-xs font-black uppercase tracking-wider">
                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                                🔴 Não Conectado
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status Details Card */}
                        <div className="py-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                          <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Provedor</span>
                            <p className="text-base font-black text-slate-900 dark:text-white mt-1">Datafy API</p>
                            <span className="text-xs text-slate-400">Meta Cloud Oficial</span>
                          </div>

                          <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Número Conectado</span>
                            <p className="text-base font-black text-slate-900 dark:text-white mt-1">
                              {whatsappConnection?.phone_number || 'Nenhum número'}
                            </p>
                            <span className="text-xs text-slate-400">{whatsappConnection?.display_name || 'Display Name'}</span>
                          </div>

                          <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ID do Número (Datafy)</span>
                            <p className="text-base font-black text-slate-900 dark:text-white mt-1 truncate">
                              {whatsappConnection?.phone_number_id || 'Não configurado'}
                            </p>
                            <span className="text-xs text-slate-400">Isolamento Multi-tenant</span>
                          </div>
                        </div>

                        {/* Connection Actions */}
                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                            Conecte seu WhatsApp Business para envio automatizado de lembretes aos responsáveis direto da sua escola.
                          </p>

                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            {whatsappConnection?.status === 'connected' ? (
                              <button
                                onClick={async () => {
                                  if (confirm('Deseja realmente desconectar o WhatsApp? Os lembretes automáticos serão pausados.')) {
                                    await disconnectWhatsApp();
                                  }
                                }}
                                className="w-full sm:w-auto px-6 py-3.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                              >
                                Desconectar WhatsApp
                              </button>
                            ) : (
                              <button
                                onClick={() => setIsConnectModalOpen(true)}
                                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                              >
                                <Radio size={16} />
                                Conectar WhatsApp
                              </button>
                            )}

                            {whatsappConnection?.status === 'connected' && (
                              <button
                                onClick={() => setIsConnectModalOpen(true)}
                                className="px-6 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-200 transition-all"
                              >
                                Configurar Dados
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card de Teste do WhatsApp */}
                      <div className="premium-card p-6 sm:p-10">
                        <div className="flex items-center gap-3 mb-6">
                          <Send size={20} className="text-blue-600 dark:text-blue-400" />
                          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Enviar Mensagem de Teste</h3>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
                          Valide se sua conexão Datafy está apta a entregar mensagens. Enviaremos uma mensagem oficial de verificação para o número informado.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 max-w-xl">
                          <div className="relative flex-1">
                            <input
                              type="tel"
                              value={testPhone}
                              onChange={(e) => setTestPhone(e.target.value)}
                              placeholder="(77) 99999-9999"
                              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl outline-none focus:border-blue-500 font-medium text-sm"
                            />
                          </div>

                          <button
                            onClick={async () => {
                              if (!testPhone) {
                                alert('Digite um número de telefone com DDD para testar.');
                                return;
                              }
                              setIsSendingTest(true);
                              setTestResult({ status: 'idle' });
                              const res = await sendTestWhatsAppMessage(testPhone);
                              setIsSendingTest(false);
                              if (res.success) {
                                setTestResult({ status: 'success', message: '🟢 Mensagem enviada com sucesso!' });
                              } else {
                                setTestResult({ status: 'error', message: `🔴 Não foi possível enviar: ${res.error || 'Verifique a conexão'}` });
                              }
                            }}
                            disabled={isSendingTest || whatsappConnection?.status !== 'connected'}
                            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
                          >
                            {isSendingTest ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            {isSendingTest ? 'Enviando...' : 'Enviar Teste'}
                          </button>
                        </div>

                        {testResult.status !== 'idle' && (
                          <div className={cn(
                            "mt-4 p-4 rounded-xl text-xs font-bold flex items-center gap-2",
                            testResult.status === 'success' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                          )}>
                            {testResult.status === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            {testResult.message}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 2. SUB-ABA: LEMBRETES AUTOMÁTICOS */}
                  {waSubTab === 'lembretes' && (
                    <div className="premium-card p-6 sm:p-10 space-y-8">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Lembretes de Mensalidade</h2>
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Disparo automático diário pelo fuso de São Paulo (America/Sao_Paulo).</p>
                        </div>

                        {/* Switch Ativar/Desativar */}
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={waSettingsForm.enabled}
                            onChange={(e) => setWaSettingsForm({ ...waSettingsForm, enabled: e.target.checked })}
                            className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                          />
                          <span className="font-black text-sm text-slate-800 dark:text-slate-200">
                            Ativar lembretes automáticos
                          </span>
                        </label>
                      </div>

                      {/* Horário de envio */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horário do Envio Diário</label>
                          <div className="relative max-w-xs">
                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                              type="time"
                              value={waSettingsForm.reminder_time}
                              onChange={(e) => setWaSettingsForm({ ...waSettingsForm, reminder_time: e.target.value })}
                              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl font-bold text-slate-900 dark:text-white text-sm"
                            />
                          </div>
                          <span className="text-[11px] text-slate-400">Horário oficial de Brasília (BRT)</span>
                        </div>
                      </div>

                      {/* Editor do Template */}
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modelo da Mensagem</label>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Personalize o texto como preferir, inserindo sua chave PIX, instruções ou dados bancários.</p>
                          </div>
                          
                          {/* Botões de Modelos Prontos */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setWaSettingsForm({
                                ...waSettingsForm,
                                message_template: `Olá, {responsavel}! 😊\n\nPassando para lembrar que a mensalidade do aluno {aluno} vence hoje.\n\n💰 *Valor:* {valor}\n📅 *Vencimento:* {vencimento}\n🔑 *Chave PIX:* seu-pix-aqui\n\nPor gentileza, após realizar o pagamento, envie o comprovante por aqui.\n\nObrigado! 💙`
                              })}
                              className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all flex items-center gap-1.5"
                            >
                              <Sparkles size={13} />
                              Usar Modelo com PIX
                            </button>
                            <button
                              type="button"
                              onClick={() => setWaSettingsForm({
                                ...waSettingsForm,
                                message_template: `Olá, {responsavel}! 😊\n\nPassando para lembrar que a mensalidade do aluno {aluno} vence hoje.\n\nValor: {valor}\nVencimento: {vencimento}\n\nPara evitar atrasos, pedimos que realize o pagamento da mensalidade.\n\nObrigado! 💙`
                              })}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                            >
                              Modelo Padrão
                            </button>
                          </div>
                        </div>

                        {/* Variáveis Chips */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clique para inserir variáveis dinâmicas:</span>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { tag: '{responsavel}', label: 'Nome do Responsável' },
                              { tag: '{aluno}', label: 'Nome do Aluno' },
                              { tag: '{valor}', label: 'Valor da Mensalidade' },
                              { tag: '{vencimento}', label: 'Data de Vencimento' },
                              { tag: '{turma}', label: 'Turma do Aluno' },
                              { tag: '{nome_escola}', label: 'Nome da Escola / Professor' },
                              { tag: '{chave_pix}', label: 'Chave PIX' }
                            ].map((v) => (
                              <button
                                key={v.tag}
                                type="button"
                                onClick={() => setWaSettingsForm({ ...waSettingsForm, message_template: waSettingsForm.message_template + ' ' + v.tag })}
                                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50 rounded-xl text-xs font-mono font-bold hover:bg-blue-100 transition-colors flex items-center gap-1"
                                title={v.label}
                              >
                                <span className="font-sans text-[11px] text-blue-500 font-normal">{v.label}:</span>
                                + {v.tag}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Textarea de Edição e Prévia Visual */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Editor de Texto</label>
                            <textarea
                              rows={8}
                              value={waSettingsForm.message_template}
                              onChange={(e) => setWaSettingsForm({ ...waSettingsForm, message_template: e.target.value })}
                              className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-sans text-sm leading-relaxed text-slate-800 dark:text-slate-200"
                              placeholder="Digite a mensagem do lembrete..."
                            />
                            <p className="text-[11px] text-slate-400">
                              💡 Dica: Você pode digitar livremente sua chave PIX (ex: <em>Chave PIX: (77) 99999-9999</em> ou <em>CNPJ: 00.000.000/0001-00</em>) diretamente no texto acima!
                            </p>
                          </div>

                          {/* Prévia no WhatsApp */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                              <MessageSquare size={13} className="text-emerald-500" />
                              Prévia no WhatsApp do Responsável
                            </label>
                            <div className="p-4 bg-[#e5ddd5] dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 min-h-[200px] flex flex-col justify-between">
                              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[95%] space-y-2 text-slate-800 dark:text-slate-100 text-xs sm:text-sm whitespace-pre-wrap font-sans">
                                {waSettingsForm.message_template
                                  .replace(/{responsavel}/g, 'Maria Silva')
                                  .replace(/{aluno}/g, 'João Silva')
                                  .replace(/{valor}/g, 'R$ 150,00')
                                  .replace(/{vencimento}/g, new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date()))
                                  .replace(/{turma}/g, 'Matemática 5º Ano')
                                  .replace(/{nome_escola}/g, whatsappConnection?.display_name || user?.name || 'Reforço Pro')
                                  .replace(/{chave_pix}/g, 'pix@reforcopro.com')
                                  .replace(/{pix}/g, 'pix@reforcopro.com')}
                              </div>
                              <div className="text-right text-[10px] text-slate-500 dark:text-slate-400 font-bold pt-2">
                                08:00 ✓✓
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <AnimatePresence>
                            {waSettingsStatus === 'success' && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm"
                              >
                                <CheckCircle2 size={18} />
                                Configurações de WhatsApp salvas com sucesso!
                              </motion.div>
                            )}
                            {waSettingsStatus === 'error' && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm"
                              >
                                <AlertCircle size={18} />
                                Erro ao salvar configurações.
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <button
                          onClick={async () => {
                            setIsSavingWaSettings(true);
                            setWaSettingsStatus('idle');
                            try {
                              await saveWhatsAppSettings({
                                enabled: waSettingsForm.enabled,
                                reminder_time: waSettingsForm.reminder_time + ':00',
                                message_template: waSettingsForm.message_template
                              });
                              setWaSettingsStatus('success');
                              setTimeout(() => setWaSettingsStatus('idle'), 3000);
                            } catch (e) {
                              setWaSettingsStatus('error');
                              setTimeout(() => setWaSettingsStatus('idle'), 3000);
                            } finally {
                              setIsSavingWaSettings(false);
                            }
                          }}
                          disabled={isSavingWaSettings}
                          className="w-full sm:w-auto px-10 py-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all hover:shadow-2xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isSavingWaSettings ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                          {isSavingWaSettings ? 'Salvando...' : 'Salvar Configurações'}
                        </button>
                      </div>

                      {/* Disparo Imediato / Teste do Cron */}
                      <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                              <Sparkles size={18} className="text-purple-600 dark:text-purple-400" />
                              Executar Processamento de Lembretes Agora (Admin / Teste)
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Busca e despacha os lembretes para todas as mensalidades que vencem hoje ({new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())}), respeitando as regras de anti-duplicidade.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              setIsProcessingNow(true);
                              setProcessResult({ status: 'idle' });
                              const res = await processPaymentRemindersNow();
                              setIsProcessingNow(false);
                              if (res.success) {
                                setProcessResult({
                                  status: 'success',
                                  message: 'Processamento executado com sucesso!',
                                  stats: res.stats
                                });
                              } else {
                                setProcessResult({
                                  status: 'error',
                                  message: res.error || 'Erro ao processar lembretes.',
                                });
                              }
                            }}
                            disabled={isProcessingNow || !whatsappConnection || whatsappConnection.status !== 'connected'}
                            className="px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0"
                          >
                            {isProcessingNow ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            {isProcessingNow ? 'Processando...' : 'Processar Lembretes Agora'}
                          </button>
                        </div>

                        {/* Estatísticas do Processamento */}
                        {processResult.status === 'success' && processResult.stats && (
                          <div className="p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-2xl space-y-3">
                            <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 font-black text-xs uppercase tracking-wider">
                              <CheckCircle2 size={16} className="text-purple-600 dark:text-purple-400" />
                              Resultado do Processamento:
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-purple-100 dark:border-purple-900/40">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Encontradas</span>
                                <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{processResult.stats.found ?? 0}</p>
                              </div>
                              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-emerald-100 dark:border-emerald-900/40">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Enviadas</span>
                                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{processResult.stats.sent ?? 0}</p>
                              </div>
                              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-amber-100 dark:border-amber-900/40">
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Ignoradas</span>
                                <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{processResult.stats.ignored ?? 0}</p>
                              </div>
                              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-rose-100 dark:border-rose-900/40">
                                <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">Falharam</span>
                                <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{processResult.stats.failed ?? 0}</p>
                              </div>
                            </div>
                            <p className="text-[11px] text-purple-700 dark:text-purple-300">
                              💡 Mensalidades ignoradas correspondem a cobranças já enviadas hoje, alunos sem responsável vinculado ou números de telefone inválidos.
                            </p>
                          </div>
                        )}

                        {processResult.status === 'error' && (
                          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-2xl flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs font-bold">
                            <AlertCircle size={16} />
                            {processResult.message}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3. SUB-ABA: HISTÓRICO DE ENVIOS */}
                  {waSubTab === 'historico' && (
                    <div className="premium-card p-6 sm:p-10 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Histórico de Mensagens</h2>
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Logs em tempo real de mensagens automáticas e manuais.</p>
                        </div>

                        {/* Filtros */}
                        <div className="flex flex-wrap items-center gap-2">
                          {[
                            { id: 'all', label: 'Todos' },
                            { id: 'sent', label: 'Enviados' },
                            { id: 'delivered', label: 'Entregues' },
                            { id: 'read', label: 'Lidos' },
                            { id: 'failed', label: 'Falhas' },
                            { id: 'auto', label: 'Automáticos' },
                            { id: 'manual', label: 'Manuais' },
                          ].map((f) => (
                            <button
                              key={f.id}
                              onClick={() => setLogFilter(f.id as any)}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                                logFilter === f.id
                                  ? "bg-blue-600 text-white shadow-sm"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                              )}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tabela de Histórico */}
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[750px]">
                          <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Data / Hora</th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Aluno / Responsável</th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Telefone</th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipo</th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Mensagem</th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {whatsappLogs
                              .filter((log) => {
                                if (logFilter === 'sent') return log.status === 'sent';
                                if (logFilter === 'delivered') return log.status === 'delivered';
                                if (logFilter === 'read') return log.status === 'read';
                                if (logFilter === 'failed') return log.status === 'failed';
                                if (logFilter === 'auto') return log.message_type === 'payment_reminder';
                                if (logFilter === 'manual') return log.message_type === 'manual_payment_reminder';
                                return true;
                              })
                              .map((log) => {
                                const student = students.find((s) => s.id === log.aluno_id);
                                const guardian = guardians.find((g) => g.id === log.responsavel_id);

                                return (
                                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                      {new Date(log.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                      <br />
                                      <span className="text-[10px] text-slate-400 font-normal">
                                        {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs">
                                      <p className="font-bold text-slate-900 dark:text-white">{student?.name || 'Aluno'}</p>
                                      <p className="text-[11px] text-slate-400">{guardian?.name || 'Responsável'}</p>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                      {log.phone}
                                    </td>
                                    <td className="px-6 py-4 text-xs">
                                      <span className={cn(
                                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                                        log.message_type === 'payment_reminder' ? "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400" :
                                        log.message_type === 'test_message' ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400" :
                                        "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                                      )}>
                                        {log.message_type === 'payment_reminder' ? 'Lembrete Auto' :
                                         log.message_type === 'test_message' ? 'Teste' : 'Lembrete Manual'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate" title={log.message_content}>
                                      {log.message_content}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-right whitespace-nowrap">
                                      {log.status === 'read' ? (
                                        <span className="inline-flex items-center gap-1 text-sky-500 font-bold">
                                          <Check size={14} className="stroke-[3]" /> 🟢 Lido
                                        </span>
                                      ) : log.status === 'delivered' ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                                          <Check size={14} /> 🟢 Entregue
                                        </span>
                                      ) : log.status === 'sent' ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                                          🟢 Enviado
                                        </span>
                                      ) : log.status === 'failed' ? (
                                        <span className="inline-flex items-center gap-1 text-rose-500 font-bold" title={log.error_message}>
                                          🔴 Falha
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-amber-500 font-bold">
                                          🟡 Pendente
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            {whatsappLogs.length === 0 && (
                              <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                                  Nenhum registro de mensagem no histórico até o momento.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Modal de Conexão Manual / Embedded Signup */}
                  <AnimatePresence>
                    {isConnectModalOpen && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setIsConnectModalOpen(false)}
                          className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 20 }}
                          className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200/60 dark:border-slate-800/60 p-6 sm:p-10 space-y-6"
                        >
                          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div>
                              <h3 className="text-xl font-black text-slate-900 dark:text-white">Conectar WhatsApp Business</h3>
                              <p className="text-xs text-slate-400 mt-0.5">Identificador do seu número na Datafy API</p>
                            </div>
                            <button
                              onClick={() => setIsConnectModalOpen(false)}
                              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                              <XCircle size={24} />
                            </button>
                          </div>

                          <div className="space-y-4">
                            <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                              🔒 <strong>Segurança Garantida</strong>: Os tokens de envio ficam protegidos e nunca são expostos no navegador. Cada professor possui seu próprio número e identificador.
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificador do Número (Phone Number ID)</label>
                              <input
                                type="text"
                                placeholder="Ex: 104529384729103"
                                value={connectFormData.phoneNumberId || whatsappConnection?.phone_number_id || ''}
                                onChange={(e) => setConnectFormData({ ...connectFormData, phoneNumberId: e.target.value })}
                                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Número do WhatsApp (com DDD)</label>
                              <input
                                type="tel"
                                placeholder="Ex: (77) 99999-9999"
                                value={connectFormData.phoneNumber || whatsappConnection?.phone_number || ''}
                                onChange={(e) => setConnectFormData({ ...connectFormData, phoneNumber: e.target.value })}
                                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome de Exibição da Escola / Professor</label>
                              <input
                                type="text"
                                placeholder="Ex: Reforço Escolar Futuro"
                                value={connectFormData.displayName || whatsappConnection?.display_name || user?.name || ''}
                                onChange={(e) => setConnectFormData({ ...connectFormData, displayName: e.target.value })}
                                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                              />
                            </div>
                          </div>

                          <div className="pt-4 flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => setIsConnectModalOpen(false)}
                              className="px-6 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase rounded-xl"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                setIsConnectingWa(true);
                                try {
                                  await saveWhatsAppConnection({
                                    phone_number_id: connectFormData.phoneNumberId || whatsappConnection?.phone_number_id,
                                    phone_number: connectFormData.phoneNumber || whatsappConnection?.phone_number,
                                    display_name: connectFormData.displayName || whatsappConnection?.display_name || user?.name,
                                    status: 'connected'
                                  });
                                  setIsConnectModalOpen(false);
                                } catch (e: any) {
                                  alert('Erro ao salvar conexão: ' + (e.message || 'Falha'));
                                } finally {
                                  setIsConnectingWa(false);
                                }
                              }}
                              disabled={isConnectingWa}
                              className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95"
                            >
                              {isConnectingWa ? 'Conectando...' : 'Salvar e Conectar'}
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {activeTab === 'aparencia' && (
                <motion.div
                  key="aparencia"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="premium-card p-6 sm:p-10">
                    <div className="flex items-center gap-4 mb-10">
                      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                        <Smartphone size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Aparência</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Personalize o visual do seu sistema.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <button 
                        onClick={() => theme !== 'light' && toggleTheme()}
                        disabled={!mounted}
                        className={cn(
                          "relative p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-2 transition-all duration-500 text-left group",
                          mounted && theme === 'light' 
                            ? "bg-white border-blue-500 shadow-xl shadow-blue-500/10" 
                            : "bg-slate-50 dark:bg-slate-800/30 border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                        )}
                      >
                        <div className="flex items-center justify-between mb-6">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                            mounted && theme === 'light' ? "bg-blue-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                          )}>
                            <Sun size={24} />
                          </div>
                          {mounted && theme === 'light' && (
                            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center">
                              <CheckCircle2 size={14} />
                            </div>
                          )}
                        </div>
                        <h3 className="font-black text-slate-900 dark:text-white tracking-tight mb-1">Modo Claro</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Interface limpa e luminosa para ambientes claros.</p>
                      </button>
 
                      <button 
                        onClick={() => theme !== 'dark' && toggleTheme()}
                        disabled={!mounted}
                        className={cn(
                          "relative p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-2 transition-all duration-500 text-left group",
                          mounted && theme === 'dark' 
                            ? "bg-slate-900 border-blue-500 shadow-xl shadow-blue-500/20" 
                            : "bg-slate-50 dark:bg-slate-800/30 border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                        )}
                      >
                        <div className="flex items-center justify-between mb-6">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                            mounted && theme === 'dark' ? "bg-blue-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                          )}>
                            <Moon size={24} />
                          </div>
                          {mounted && theme === 'dark' && (
                            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center">
                              <CheckCircle2 size={14} />
                            </div>
                          )}
                        </div>
                        <h3 className="font-black text-slate-900 dark:text-white tracking-tight mb-1">Modo Escuro</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Interface sofisticada e confortável para os olhos.</p>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'conta' && (
                <motion.div
                  key="conta"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="premium-card p-4 sm:p-10 border-rose-100 dark:border-rose-900/30">
                    <div className="flex items-center gap-4 mb-8 sm:mb-10">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl sm:rounded-2xl flex items-center justify-center">
                        <Shield size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Gerenciamento da Conta</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Controle o acesso e segurança da sua conta.</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div>
                          <h3 className="font-black text-slate-900 dark:text-white tracking-tight mb-1">Encerrar Sessão</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Saia da sua conta com segurança em todos os dispositivos.</p>
                        </div>
                        <button 
                          onClick={logout}
                          className="flex items-center justify-center gap-3 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-widest border border-rose-100 dark:border-rose-900/30 shadow-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all active:scale-95"
                        >
                          <LogOut size={18} />
                          Sair da Conta
                        </button>
                      </div>

                      <div className="p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] bg-rose-50/30 dark:bg-rose-900/10 border border-rose-100/50 dark:border-rose-900/20">
                        <div className="flex items-start gap-4">
                          <AlertCircle className="text-rose-500 shrink-0 mt-1" size={20} />
                          <div>
                            <h3 className="font-black text-rose-900 dark:text-rose-400 tracking-tight mb-1">Zona de Perigo</h3>
                            <p className="text-xs text-rose-600/70 dark:text-rose-400/60 mb-6">Ao excluir sua conta, todos os seus dados (alunos, turmas, pagamentos) serão removidos permanentemente.</p>
                            <button className="text-rose-600 dark:text-rose-400 font-black text-[10px] uppercase tracking-widest hover:underline">
                              Excluir minha conta permanentemente
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Layout>
  );
}
