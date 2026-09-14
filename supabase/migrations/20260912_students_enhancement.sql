-- Migração Segura: Melhoria na tabela de Alunos (students)
-- Reforço Pro: Adiciona campos acadêmicos e pedagógicos preservando dados existentes

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS grade_level TEXT,
ADD COLUMN IF NOT EXISTS goals TEXT;

-- Índice para consultas rápidas por disciplina ou ano/série se necessário
CREATE INDEX IF NOT EXISTS idx_students_grade_level ON public.students(grade_level);
CREATE INDEX IF NOT EXISTS idx_students_subject ON public.students(subject);
