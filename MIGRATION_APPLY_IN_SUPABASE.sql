-- ============================================================
-- REFORCO PRO - MIGRATIONS CONSOLIDADAS
-- Execute este SQL no Supabase SQL Editor para corrigir os
-- erros de persistência de alunos e responsáveis.
-- URL do Projeto: https://supabase.com/dashboard/project/uraczttruyndoixabnld/sql
-- ============================================================

-- 1. Adicionar campos extras na tabela GUARDIANS (Responsáveis)
ALTER TABLE public.guardians 
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS relationship TEXT,
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- Índice para busca de CPF
CREATE INDEX IF NOT EXISTS idx_guardians_cpf ON public.guardians(cpf);

-- 2. Adicionar campos extras na tabela STUDENTS (Alunos)
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS grade_level TEXT,
ADD COLUMN IF NOT EXISTS goals TEXT;

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_students_grade_level ON public.students(grade_level);
CREATE INDEX IF NOT EXISTS idx_students_subject ON public.students(subject);

-- 3. Garantir que as políticas RLS (Row Level Security) permitem operações do usuário autenticado

-- Habilitar RLS nas tabelas (se ainda não estiver habilitado)
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Políticas para GUARDIANS
DROP POLICY IF EXISTS "guardians_select" ON public.guardians;
DROP POLICY IF EXISTS "guardians_insert" ON public.guardians;
DROP POLICY IF EXISTS "guardians_update" ON public.guardians;
DROP POLICY IF EXISTS "guardians_delete" ON public.guardians;

CREATE POLICY "guardians_select" ON public.guardians FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "guardians_insert" ON public.guardians FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "guardians_update" ON public.guardians FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "guardians_delete" ON public.guardians FOR DELETE USING (auth.uid() = user_id);

-- Políticas para STUDENTS
DROP POLICY IF EXISTS "students_select" ON public.students;
DROP POLICY IF EXISTS "students_insert" ON public.students;
DROP POLICY IF EXISTS "students_update" ON public.students;
DROP POLICY IF EXISTS "students_delete" ON public.students;

CREATE POLICY "students_select" ON public.students FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "students_insert" ON public.students FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "students_update" ON public.students FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "students_delete" ON public.students FOR DELETE USING (auth.uid() = user_id);

-- Políticas para CLASSES
DROP POLICY IF EXISTS "classes_select" ON public.classes;
DROP POLICY IF EXISTS "classes_insert" ON public.classes;
DROP POLICY IF EXISTS "classes_update" ON public.classes;
DROP POLICY IF EXISTS "classes_delete" ON public.classes;

CREATE POLICY "classes_select" ON public.classes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "classes_insert" ON public.classes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "classes_update" ON public.classes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "classes_delete" ON public.classes FOR DELETE USING (auth.uid() = user_id);
