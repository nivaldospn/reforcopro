-- Migration: 20260912_guardians_enhancement.sql
-- Description: Adiciona campos opcionais de CPF, Parentesco e Responsável Principal na tabela guardians sem quebrar registros existentes.

ALTER TABLE public.guardians 
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS relationship TEXT,
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- Índice para busca opcional de CPF (sem UNIQUE para não impedir cenários onde CPF seja omitido ou casos compartilhados)
CREATE INDEX IF NOT EXISTS idx_guardians_cpf ON public.guardians(cpf);
