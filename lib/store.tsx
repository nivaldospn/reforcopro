'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photo?: string;
  isPaid: boolean;
};

export type StudentStatus = 'active' | 'paused' | 'delinquent' | 'new';

export type StudentGrade = {
  id: string;
  studentId: string;
  subject: string;
  date: string;
  grade: number;
  notes?: string;
  createdAt?: string;
};

export function calculateAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export type Student = {
  id: string;
  name: string;
  age?: number;
  birthDate?: string;
  photo?: string;
  guardianId?: string;
  classId?: string;
  status: StudentStatus;
  entryDate: string;
  observations?: string;
  subject?: string;
  gradeLevel?: string;
  goals?: string;
};

type Guardian = {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  cpf?: string;
  relationship?: string;
  isPrimary?: boolean;
  address?: string;
  observations?: string;
  photo?: string;
  createdAt: string;
};

export type ClassStatus = 'active' | 'inactive';

type Class = {
  id: string;
  name: string;
  schedule: string;
  description?: string;
  days: string[];
  observations?: string;
  status: ClassStatus;
  createdAt: string;
};

type Payment = {
  id: string;
  studentId: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending';
};

import { WhatsAppConnection, WhatsAppSettings, WhatsAppMessageLog } from './datafy/types';

interface AppContextType {
  isInitializing: boolean;
  user: User | null;
  students: Student[];
  guardians: Guardian[];
  classes: Class[];
  payments: Payment[];
  grades: StudentGrade[];
  whatsappConnection: WhatsAppConnection | null;
  whatsappSettings: WhatsAppSettings | null;
  whatsappLogs: WhatsAppMessageLog[];
  login: (email: string, password?: string) => Promise<void>;
  register: (name: string, email: string, password?: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  setPaid: () => void;
  addStudent: (student: Omit<Student, 'id'>) => string;
  updateStudent: (id: string, student: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  addGuardian: (guardian: Omit<Guardian, 'id'>) => string;
  updateGuardian: (id: string, guardian: Partial<Guardian>) => void;
  deleteGuardian: (id: string) => void;
  addClass: (cls: Omit<Class, 'id'>) => string;
  updateClass: (id: string, cls: Partial<Class>) => void;
  deleteClass: (id: string) => void;
  addPayment: (payment: Omit<Payment, 'id'>) => void;
  updatePayment: (id: string, payment: Partial<Payment>) => void;
  deletePayment: (id: string) => void;
  togglePaymentStatus: (id: string) => void;
  addGrade: (grade: Omit<StudentGrade, 'id'>) => string;
  deleteGrade: (id: string) => void;
  saveWhatsAppConnection: (data: Partial<WhatsAppConnection>) => Promise<void>;
  disconnectWhatsApp: () => Promise<void>;
  saveWhatsAppSettings: (data: Partial<WhatsAppSettings>) => Promise<void>;
  sendTestWhatsAppMessage: (phone: string) => Promise<{ success: boolean; error?: string }>;
  sendManualPaymentReminder: (paymentId: string, phone: string, customMessage?: string) => Promise<{ success: boolean; error?: string }>;
  processPaymentRemindersNow: () => Promise<{ success: boolean; stats?: any; error?: string }>;
  refreshWhatsAppLogs: () => Promise<void>;
  clearData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [whatsappConnection, setWhatsappConnection] = useState<WhatsAppConnection | null>(null);
  const [whatsappSettings, setWhatsappSettings] = useState<WhatsAppSettings | null>(null);
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppMessageLog[]>([]);

  // Carregar dados de Autenticação e Banco de Dados (Supabase)
  useEffect(() => {
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await handleUserFetch(session.user);
      }
      setIsInitializing(false);
    };
    
    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        handleUserFetch(session.user);
      } else {
        setUser(null);
        setStudents([]);
        setGuardians([]);
        setClasses([]);
        setPayments([]);
        setGrades([]);
        setWhatsappConnection(null);
        setWhatsappSettings(null);
        setWhatsappLogs([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUserFetch = async (authUser: any) => {
    try {
      // Buscar perfil
      let { data: profile, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
      
      if (!profile) {
        // Se ainda não existir perfil na tabela profiles, cria automaticamente
        const newProfile = {
          id: authUser.id,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Professor',
          email: authUser.email || '',
          phone: authUser.phone || null,
        };
        const { data: createdProfile } = await supabase.from('profiles').insert(newProfile).select().maybeSingle();
        profile = createdProfile || newProfile;
      }

      setUser({
        id: authUser.id,
        name: profile?.full_name || authUser.user_metadata?.full_name || 'Professor',
        email: profile?.email || authUser.email || '',
        phone: profile?.phone || '',
        photo: profile?.avatar_url || '',
        isPaid: true
      });

      loadBusinessData(authUser.id);
    } catch (e) {
      console.error('[Supabase] Erro ao carregar perfil do usuário:', e);
      // Fallback para permitir uso com a sessão atual
      setUser({
        id: authUser.id,
        name: authUser.user_metadata?.full_name || 'Professor',
        email: authUser.email || '',
        phone: '',
        photo: '',
        isPaid: true
      });
      loadBusinessData(authUser.id);
    }
  };

  const loadBusinessData = async (userId: string) => {
    try {
      const [resStudents, resGuardians, resClasses, resPayments, resGrades, resConn, resSettings, resLogs] = await Promise.all([
        supabase.from('students').select('*').eq('user_id', userId),
        supabase.from('guardians').select('*').eq('user_id', userId),
        supabase.from('classes').select('*').eq('user_id', userId),
        supabase.from('payments').select('*').eq('user_id', userId),
        supabase.from('student_grades').select('*').eq('user_id', userId),
        supabase.from('whatsapp_connections').select('*').eq('user_id', userId).eq('provider', 'datafy').maybeSingle(),
        supabase.from('whatsapp_settings').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('whatsapp_message_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      ]);

      if (resStudents.data) setStudents(resStudents.data.map(s => ({
        id: s.id,
        name: s.full_name,
        age: s.age ?? (s.birth_date ? (calculateAge(s.birth_date) ?? undefined) : undefined),
        birthDate: s.birth_date,
        photo: s.photo_url,
        guardianId: s.guardian_id,
        classId: s.class_id,
        status: s.status as StudentStatus,
        entryDate: s.entry_date,
        observations: s.notes,
        subject: s.subject,
        gradeLevel: s.grade_level,
        goals: s.goals
      })));

      if (resGuardians.data) setGuardians(resGuardians.data.map(g => ({
        id: g.id, 
        name: g.full_name, 
        email: g.email || '', 
        phone: g.phone || '', 
        whatsapp: g.whatsapp, 
        cpf: g.cpf,
        relationship: g.relationship,
        isPrimary: g.is_primary,
        address: g.address, 
        observations: g.notes, 
        photo: g.photo_url, 
        createdAt: g.created_at
      })));

      if (resClasses.data) setClasses(resClasses.data.map(c => ({
        id: c.id, name: c.name, schedule: c.description || '', days: c.week_days || [], status: c.status as ClassStatus, observations: c.notes, createdAt: c.created_at
      })));

      if (resPayments.data) setPayments(resPayments.data.map(p => ({
        id: p.id, studentId: p.student_id, amount: p.amount, date: p.due_date, status: p.status as 'paid' | 'pending'
      })));

      if (resGrades.data) setGrades(resGrades.data.map(g => ({
        id: g.id, studentId: g.student_id, subject: g.subject, date: g.date, grade: g.grade, notes: g.notes, createdAt: g.created_at
      })));

      if (resConn.data) {
        setWhatsappConnection(resConn.data as WhatsAppConnection);
      } else {
        setWhatsappConnection(null);
      }

      if (resSettings.data) {
        setWhatsappSettings(resSettings.data as WhatsAppSettings);
      } else {
        // Inicial padrão se ainda não existir
        setWhatsappSettings({
          id: '',
          user_id: userId,
          enabled: false,
          reminder_time: '08:00',
          message_template: `Olá, {responsavel}! 😊\n\nPassando para lembrar que a mensalidade do aluno {aluno} vence hoje.\n\nValor: {valor}\nVencimento: {vencimento}\n\nObrigado!`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      if (resLogs.data) {
        setWhatsappLogs(resLogs.data as WhatsAppMessageLog[]);
      }
    } catch (e) { console.error("Erro carregando dados", e); }
  };

  const login = async (email: string, password?: string) => {
    if (password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert("Erro ao fazer login: " + error.message);
        throw error;
      }
      if (data.session?.user || data.user) {
        await handleUserFetch(data.session?.user || data.user);
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      alert("Cheque sua caixa de entrada para o Link Magico!");
    }
  };

  const register = async (name: string, email: string, password?: string) => {
    if (password) {
      const { error } = await supabase.auth.signUp({ 
        email, password, options: { data: { full_name: name } }
      });
      if (error) {
        alert("Erro: " + error.message);
        throw error;
      } else {
        alert("Criado! Caso o sistema exija, cheque o e-mail para confirmar a conta.");
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({ 
        email, options: { data: { full_name: name } }
      });
      if (error) throw error;
      alert("Cheque o email para completar o cadastro!");
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };
  
  const updateUser = (data: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...data });
      const up: any = {};
      if (data.name !== undefined) up.full_name = data.name;
      if (data.phone !== undefined) up.phone = data.phone;
      if (data.photo !== undefined) up.avatar_url = data.photo;
      if (Object.keys(up).length > 0) {
        supabase.from('profiles').update(up).eq('id', user.id).then();
      }
    }
  };

  const setPaid = () => {
    if (user) setUser({ ...user, isPaid: true });
  };

  // ----- STUDENTS -----
  const addStudent = (s: Omit<Student, 'id'>) => {
    const id = crypto.randomUUID();
    const computedAge = s.birthDate ? (calculateAge(s.birthDate) ?? s.age) : s.age;
    const newStudentItem = { ...s, id, age: computedAge };
    setStudents(prev => [...prev, newStudentItem]);
    if (user) {
      const payload: any = {
        id,
        user_id: user.id,
        full_name: s.name,
        age: computedAge !== undefined ? computedAge : null,
        birth_date: s.birthDate || null,
        photo_url: s.photo || null,
        guardian_id: s.guardianId || null,
        class_id: s.classId || null,
        status: s.status || 'active',
        entry_date: s.entryDate || new Date().toISOString().split('T')[0],
        notes: s.observations || null,
        subject: s.subject || null,
        grade_level: s.gradeLevel || null,
        goals: s.goals || null
      };

      supabase.from('students').insert(payload).then(({ error }) => {
        if (error) {
          console.error('[Supabase] Erro ao cadastrar aluno:', error.message, error.details, error.hint, error);
          alert(`Erro Supabase ao salvar aluno: ${error.message || JSON.stringify(error)}`);
          // Reverter estado local em caso de erro
          setStudents(prev => prev.filter(item => item.id !== id));
        }
      }).catch(err => {
        console.error('[Supabase] Erro inesperado ao cadastrar aluno:', err);
      });
    }
    return id;
  };

  const updateStudent = (id: string, s: Partial<Student>) => {
    const computedAge = s.birthDate !== undefined ? (s.birthDate ? (calculateAge(s.birthDate) ?? undefined) : undefined) : s.age;
    setStudents(prev => prev.map(item => item.id === id ? { 
      ...item, 
      ...s, 
      age: computedAge !== undefined ? computedAge : item.age 
    } : item));
    if (user) {
      const up: any = {};
      if (s.name !== undefined) up.full_name = s.name;
      if (s.birthDate !== undefined) {
        up.birth_date = s.birthDate || null;
        up.age = s.birthDate ? calculateAge(s.birthDate) : null;
      } else if (s.age !== undefined) {
        up.age = s.age;
      }
      if (s.photo !== undefined) up.photo_url = s.photo;
      if (s.status !== undefined) up.status = s.status;
      if (s.observations !== undefined) up.notes = s.observations;
      if ('classId' in s) up.class_id = s.classId === undefined || s.classId === '' ? null : s.classId;
      if ('guardianId' in s) up.guardian_id = s.guardianId === undefined || s.guardianId === '' ? null : s.guardianId;
      if (s.subject !== undefined) up.subject = s.subject;
      if (s.gradeLevel !== undefined) up.grade_level = s.gradeLevel;
      if (s.goals !== undefined) up.goals = s.goals;
      supabase.from('students').update(up).eq('id', id).then(({ error }) => {
        if (error) {
          console.error('[Supabase] Erro ao atualizar aluno:', error.message, error.details, error);
          alert(`Erro ao atualizar aluno: ${error.message}`);
        }
      }).catch(err => {
        console.error('[Supabase] Erro inesperado ao atualizar aluno:', err);
      });
    }
  };

  const deleteStudent = (id: string) => {
    const backup = students.find(item => item.id === id);
    setStudents(prev => prev.filter(item => item.id !== id));
    if (user) {
      supabase.from('students').delete().eq('id', id).then(({ error }) => {
        if (error) {
          console.error('[Supabase] Erro ao excluir aluno:', error.message, error.details, error);
          alert(`Erro ao excluir aluno: ${error.message}`);
          if (backup) setStudents(prev => [...prev, backup]);
        }
      }).catch(err => {
        console.error('[Supabase] Erro inesperado ao excluir aluno:', err);
      });
    }
  };

  // ----- GUARDIANS -----
  const addGuardian = (g: Omit<Guardian, 'id'>) => {
    const id = crypto.randomUUID();
    const cleanPhone = g.whatsapp || g.phone || '';
    setGuardians(prev => [...prev, { ...g, id, phone: cleanPhone, whatsapp: cleanPhone }]);
    if (user) {
      const payload: any = {
        id, 
        user_id: user.id, 
        full_name: g.name, 
        email: g.email || null, 
        phone: cleanPhone || null, 
        whatsapp: cleanPhone || null, 
        cpf: g.cpf || null,
        relationship: g.relationship || null,
        is_primary: g.isPrimary ?? false,
        address: g.address || null, 
        notes: g.observations || null, 
        photo_url: g.photo || null
      };

      supabase.from('guardians').insert(payload).then(({ error }) => {
        if (error) {
          console.error('[Supabase] Erro ao cadastrar responsável:', error.message, error.details, error.hint, error);
          alert(`Erro Supabase ao salvar responsável: ${error.message || JSON.stringify(error)}`);
          // Reverter estado local em caso de erro
          setGuardians(prev => prev.filter(item => item.id !== id));
        }
      }).catch(err => {
        console.error('[Supabase] Erro inesperado ao cadastrar responsável:', err);
      });
    }
    return id;
  };

  const updateGuardian = (id: string, g: Partial<Guardian>) => {
    setGuardians(prev => prev.map(item => item.id === id ? { ...item, ...g } : item));
    if (user) {
      const up: any = {};
      if(g.name !== undefined) up.full_name = g.name;
      if(g.phone !== undefined || g.whatsapp !== undefined) {
        const contactNum = g.whatsapp !== undefined ? g.whatsapp : g.phone;
        up.phone = contactNum || null;
        up.whatsapp = contactNum || null;
      }
      if(g.cpf !== undefined) up.cpf = g.cpf || null;
      if(g.relationship !== undefined) up.relationship = g.relationship || null;
      if(g.isPrimary !== undefined) up.is_primary = g.isPrimary;
      if(g.photo !== undefined) up.photo_url = g.photo || null;
      if(g.email !== undefined) up.email = g.email || null;
      if(g.address !== undefined) up.address = g.address || null;
      if(g.observations !== undefined) up.notes = g.observations || null;
      supabase.from('guardians').update(up).eq('id', id).then(({ error }) => {
        if (error) {
          console.error('[Supabase] Erro ao atualizar responsável:', error);
          alert(`Erro ao atualizar responsável: ${error.message}`);
        }
      }).catch(err => {
        console.error('[Supabase] Erro inesperado ao atualizar responsável:', err);
      });
    }
  };

  const deleteGuardian = (id: string) => {
    const backup = guardians.find(item => item.id === id);
    setGuardians(prev => prev.filter(item => item.id !== id));
    if (user) {
      supabase.from('guardians').delete().eq('id', id).then(({ error }) => {
        if (error) {
          console.error('[Supabase] Erro ao excluir responsável:', error);
          alert(`Erro ao excluir responsável: ${error.message}`);
          if (backup) setGuardians(prev => [...prev, backup]);
        }
      }).catch(err => {
        console.error('[Supabase] Erro inesperado ao excluir responsável:', err);
      });
    }
  };

  // ----- CLASSES -----
  const addClass = (c: Omit<Class, 'id'>) => {
    const id = crypto.randomUUID();
    setClasses(prev => [...prev, { ...c, id }]);
    if (user) {
      supabase.from('classes').insert({
        id, user_id: user.id, name: c.name, description: c.schedule, week_days: c.days, notes: c.observations, status: c.status
      }).then(({ error }) => {
        if (error) {
          console.error('[Supabase] Erro ao cadastrar turma:', error);
          alert(`Erro ao salvar turma: ${error.message}`);
          setClasses(prev => prev.filter(item => item.id !== id));
        }
      }).catch(err => {
        console.error('[Supabase] Erro inesperado ao cadastrar turma:', err);
      });
    }
    return id;
  };

  const updateClass = (id: string, c: Partial<Class>) => {
    setClasses(prev => prev.map(item => item.id === id ? { ...item, ...c } : item));
    if (user) {
      const up: any = {};
      if(c.name !== undefined) up.name = c.name;
      if(c.schedule !== undefined) up.description = c.schedule;
      if(c.days !== undefined) up.week_days = c.days;
      if(c.observations !== undefined) up.notes = c.observations;
      if(c.status !== undefined) up.status = c.status;
      supabase.from('classes').update(up).eq('id', id).then(({ error }) => {
        if (error) {
          console.error('[Supabase] Erro ao atualizar turma:', error);
          alert(`Erro ao atualizar turma: ${error.message}`);
        }
      }).catch(err => {
        console.error('[Supabase] Erro inesperado ao atualizar turma:', err);
      });
    }
  };

  const deleteClass = (id: string) => {
    const backup = classes.find(item => item.id === id);
    setClasses(prev => prev.filter(item => item.id !== id));
    setStudents(prev => prev.map(s => s.classId === id ? { ...s, classId: undefined } : s));
    if (user) {
      supabase.from('classes').delete().eq('id', id).then(({ error }) => {
        if (error) {
          console.error('[Supabase] Erro ao excluir turma:', error);
          alert(`Erro ao excluir turma: ${error.message}`);
          if (backup) setClasses(prev => [...prev, backup]);
        }
      }).catch(err => {
        console.error('[Supabase] Erro inesperado ao excluir turma:', err);
      });
    }
  };

  // ----- PAYMENTS -----
  const addPayment = (p: Omit<Payment, 'id'>) => {
    const id = crypto.randomUUID();
    setPayments(prev => [...prev, { ...p, id }]);
    if (user) {
      supabase.from('payments').insert({
        id, user_id: user.id, student_id: p.studentId, amount: p.amount, due_date: p.date, status: p.status
      }).then();
    }
  };

  const updatePayment = (id: string, p: Partial<Payment>) => {
    setPayments(prev => prev.map(item => item.id === id ? { ...item, ...p } : item));
    if (user) {
      const up: any = {};
      if(p.studentId !== undefined) up.student_id = p.studentId;
      if(p.amount !== undefined) up.amount = p.amount;
      if(p.date !== undefined) up.due_date = p.date;
      if(p.status !== undefined) up.status = p.status;
      supabase.from('payments').update(up).eq('id', id).then();
    }
  };

  const deletePayment = (id: string) => {
    setPayments(prev => prev.filter(item => item.id !== id));
    if (user) supabase.from('payments').delete().eq('id', id).then();
  };

  const togglePaymentStatus = (id: string) => {
    setPayments(prev => {
      const updated = prev.map(item => item.id === id ? { ...item, status: item.status === 'paid' ? 'pending' : 'paid' as any } : item);
      const target = updated.find(i => i.id === id);
      if (user && target) supabase.from('payments').update({ status: target.status }).eq('id', id).then();
      return updated;
    });
  };

  const addGrade = (g: Omit<StudentGrade, 'id'>) => {
    const id = crypto.randomUUID();
    setGrades(prev => [...prev, { ...g, id }]);
    if (user) {
      supabase.from('student_grades').insert({
        id, user_id: user.id, student_id: g.studentId, subject: g.subject, date: g.date, grade: g.grade, notes: g.notes
      }).then();
    }
    return id;
  };

  const deleteGrade = (id: string) => {
    setGrades(prev => prev.filter(item => item.id !== id));
    if (user) supabase.from('student_grades').delete().eq('id', id).then();
  };

  const refreshWhatsAppLogs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('whatsapp_message_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setWhatsappLogs(data as WhatsAppMessageLog[]);
  };

  const saveWhatsAppConnection = async (data: Partial<WhatsAppConnection>) => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      provider: 'datafy',
      phone_number_id: data.phone_number_id,
      waba_id: data.waba_id,
      phone_number: data.phone_number,
      display_name: data.display_name,
      status: data.status || 'connected',
      connected_at: new Date().toISOString(),
      last_error: null,
    };

    const { data: saved, error } = await supabase
      .from('whatsapp_connections')
      .upsert(payload, { onConflict: 'user_id,provider' })
      .select()
      .single();

    if (error) throw error;
    if (saved) setWhatsappConnection(saved as WhatsAppConnection);
  };

  const disconnectWhatsApp = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('whatsapp_connections')
      .update({
        status: 'disconnected',
        last_error: null,
      })
      .eq('user_id', user.id)
      .eq('provider', 'datafy');

    if (error) throw error;
    setWhatsappConnection(prev => prev ? { ...prev, status: 'disconnected' } : null);
  };

  const saveWhatsAppSettings = async (data: Partial<WhatsAppSettings>) => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      enabled: data.enabled ?? false,
      reminder_time: data.reminder_time || '08:00',
      message_template: data.message_template,
    };

    const { data: saved, error } = await supabase
      .from('whatsapp_settings')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    if (saved) setWhatsappSettings(saved as WhatsAppSettings);
  };

  const sendTestWhatsAppMessage = async (phone: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Usuário não autenticado.' };
    const { data: { session } } = await supabase.auth.getSession();

    const testMsg = 'Olá! 👋\n\nEsta é uma mensagem de teste do WhatsApp do Reforço Pro.\n\nA integração está funcionando corretamente.';

    try {
      // Dispara via API route do Next.js
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          to: phone,
          message: testMsg,
          messageType: 'test_message',
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return { success: false, error: data.error || 'Falha ao enviar mensagem de teste.' };
      }

      await refreshWhatsAppLogs();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro inesperado.' };
    }
  };

  const sendManualPaymentReminder = async (
    paymentId: string,
    phone: string,
    customMessage?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Usuário não autenticado.' };
    const { data: { session } } = await supabase.auth.getSession();

    const payment = payments.find(p => p.id === paymentId);
    const student = students.find(s => s.id === payment?.studentId);
    const guardian = guardians.find(g => g.id === student?.guardianId);

    const messageText = customMessage || `Olá, ${guardian?.name.split(' ')[0] || 'Responsável'}! 😊\n\nPassando para lembrar que a mensalidade do aluno ${student?.name || 'Aluno'} no valor de R$ ${payment?.amount.toFixed(2)} venceu ou está próxima do vencimento (${payment?.date}).\n\nObrigado!`;

    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          to: phone,
          message: messageText,
          messageType: 'manual_payment_reminder',
          mensalidadeId: paymentId,
          alunoId: student?.id,
          responsavelId: guardian?.id,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return { success: false, error: data.error || 'Não foi possível enviar a mensagem.' };
      }

      await refreshWhatsAppLogs();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro de conexão.' };
    }
  };

  const processPaymentRemindersNow = async (): Promise<{ success: boolean; stats?: any; error?: string }> => {
    if (!user) return { success: false, error: 'Usuário não autenticado.' };
    const { data: { session } } = await supabase.auth.getSession();

    try {
      const response = await fetch('/api/whatsapp/process-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return { success: false, error: data.error || 'Erro ao processar lembretes.' };
      }

      await refreshWhatsAppLogs();
      return { success: true, stats: data.stats };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao executar processamento.' };
    }
  };

  const clearData = () => {
    // Only used for local demo reset, in cloud we don't allow easy complete wipe.
    alert('Limpeza completa desativada no modo Cloud.');
  };

  return (
    <AppContext.Provider value={{
      isInitializing, user, students, guardians, classes, payments, grades,
      whatsappConnection, whatsappSettings, whatsappLogs,
      login, register, logout, updateUser, setPaid,
      addStudent, updateStudent, deleteStudent,
      addGuardian, updateGuardian, deleteGuardian,
      addClass, updateClass, deleteClass,
      addPayment, updatePayment, deletePayment, togglePaymentStatus,
      addGrade, deleteGrade,
      saveWhatsAppConnection, disconnectWhatsApp, saveWhatsAppSettings,
      sendTestWhatsAppMessage, sendManualPaymentReminder, processPaymentRemindersNow, refreshWhatsAppLogs,
      clearData
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
