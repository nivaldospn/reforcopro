-- =============================================================================
-- REFORÇO PRO — MÓDULO FINANCEIRO COMPLETO
-- SQL para executar manualmente no Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/uraczttruyndoixabnld/sql
--
-- INSTRUÇÕES:
-- 1. Acesse o SQL Editor do seu projeto Supabase
-- 2. Execute este script completo de uma vez (ou bloco a bloco, na ordem)
-- 3. Não altere nenhuma tabela existente (payments, students, etc.)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCO 1: EXTENSÃO UUID (já deve existir, mas garantimos)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCO 2: TABELA financial_entries (Entradas manuais de receita)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.financial_entries (
    id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description    TEXT         NOT NULL,
    amount         DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    date           DATE         NOT NULL,
    category       TEXT         NOT NULL DEFAULT 'outros'
                   CHECK (category IN ('mensalidade','aula_particular','matricula','material','outros')),
    payment_method TEXT         NOT NULL DEFAULT 'pix'
                   CHECK (payment_method IN ('pix','cartao','dinheiro','transferencia','outro')),
    status         TEXT         NOT NULL DEFAULT 'recebido'
                   CHECK (status IN ('recebido','pendente','cancelado')),
    notes          TEXT,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.financial_entries IS 'Entradas financeiras manuais (receitas) do professor';
COMMENT ON COLUMN public.financial_entries.category IS 'mensalidade | aula_particular | matricula | material | outros';
COMMENT ON COLUMN public.financial_entries.status IS 'recebido | pendente | cancelado';


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCO 3: TABELA financial_expenses (Saídas/Despesas)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.financial_expenses (
    id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description    TEXT         NOT NULL,
    amount         DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    date           DATE         NOT NULL,
    category       TEXT         NOT NULL DEFAULT 'outros'
                   CHECK (category IN ('aluguel','energia','internet','material_escolar','funcionarios',
                                       'transporte','marketing','equipamentos','manutencao','outros')),
    payment_method TEXT         NOT NULL DEFAULT 'pix'
                   CHECK (payment_method IN ('pix','cartao','dinheiro','transferencia','outro')),
    status         TEXT         NOT NULL DEFAULT 'pago'
                   CHECK (status IN ('pago','pendente','cancelado')),
    notes          TEXT,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.financial_expenses IS 'Saídas/despesas financeiras do professor';
COMMENT ON COLUMN public.financial_expenses.status IS 'pago | pendente | cancelado';


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCO 4: TABELA accounts_payable (Contas a pagar)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accounts_payable (
    id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description    TEXT         NOT NULL,
    amount         DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    due_date       DATE         NOT NULL,
    paid_at        DATE,
    category       TEXT         NOT NULL DEFAULT 'outros'
                   CHECK (category IN ('aluguel','energia','internet','material_escolar','funcionarios',
                                       'transporte','marketing','equipamentos','manutencao','outros')),
    status         TEXT         NOT NULL DEFAULT 'pendente'
                   CHECK (status IN ('pendente','pago','vencido','cancelado')),
    notes          TEXT,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.accounts_payable IS 'Contas a pagar do professor (compromissos futuros)';
COMMENT ON COLUMN public.accounts_payable.status IS 'pendente | pago | vencido | cancelado';
COMMENT ON COLUMN public.accounts_payable.paid_at IS 'Data em que a conta foi efetivamente paga';


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCO 5: ÍNDICES DE PERFORMANCE
-- ─────────────────────────────────────────────────────────────────────────────

-- financial_entries
CREATE INDEX IF NOT EXISTS idx_financial_entries_user_id    ON public.financial_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_date       ON public.financial_entries(date);
CREATE INDEX IF NOT EXISTS idx_financial_entries_status     ON public.financial_entries(status);
CREATE INDEX IF NOT EXISTS idx_financial_entries_category   ON public.financial_entries(category);

-- financial_expenses
CREATE INDEX IF NOT EXISTS idx_financial_expenses_user_id   ON public.financial_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_expenses_date      ON public.financial_expenses(date);
CREATE INDEX IF NOT EXISTS idx_financial_expenses_status    ON public.financial_expenses(status);
CREATE INDEX IF NOT EXISTS idx_financial_expenses_category  ON public.financial_expenses(category);

-- accounts_payable
CREATE INDEX IF NOT EXISTS idx_accounts_payable_user_id     ON public.accounts_payable(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_due_date    ON public.accounts_payable(due_date);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_status      ON public.accounts_payable(status);


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCO 6: FUNÇÃO updated_at (reutiliza a função existente set_updated_at)
-- Se a função set_updated_at já existir do schema original, este bloco é seguro.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCO 7: TRIGGERS updated_at
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER tr_financial_entries_updated_at
  BEFORE UPDATE ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER tr_financial_expenses_updated_at
  BEFORE UPDATE ON public.financial_expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER tr_accounts_payable_updated_at
  BEFORE UPDATE ON public.accounts_payable
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCO 8: ROW LEVEL SECURITY — Habilitar RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.financial_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable   ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCO 9: POLÍTICAS RLS — financial_entries
-- Cada professor vê e gerencia somente seus próprios registros.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "financial_entries_select" ON public.financial_entries;
DROP POLICY IF EXISTS "financial_entries_insert" ON public.financial_entries;
DROP POLICY IF EXISTS "financial_entries_update" ON public.financial_entries;
DROP POLICY IF EXISTS "financial_entries_delete" ON public.financial_entries;

CREATE POLICY "financial_entries_select"
  ON public.financial_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "financial_entries_insert"
  ON public.financial_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "financial_entries_update"
  ON public.financial_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "financial_entries_delete"
  ON public.financial_entries FOR DELETE
  USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCO 10: POLÍTICAS RLS — financial_expenses
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "financial_expenses_select" ON public.financial_expenses;
DROP POLICY IF EXISTS "financial_expenses_insert" ON public.financial_expenses;
DROP POLICY IF EXISTS "financial_expenses_update" ON public.financial_expenses;
DROP POLICY IF EXISTS "financial_expenses_delete" ON public.financial_expenses;

CREATE POLICY "financial_expenses_select"
  ON public.financial_expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "financial_expenses_insert"
  ON public.financial_expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "financial_expenses_update"
  ON public.financial_expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "financial_expenses_delete"
  ON public.financial_expenses FOR DELETE
  USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCO 11: POLÍTICAS RLS — accounts_payable
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "accounts_payable_select" ON public.accounts_payable;
DROP POLICY IF EXISTS "accounts_payable_insert" ON public.accounts_payable;
DROP POLICY IF EXISTS "accounts_payable_update" ON public.accounts_payable;
DROP POLICY IF EXISTS "accounts_payable_delete" ON public.accounts_payable;

CREATE POLICY "accounts_payable_select"
  ON public.accounts_payable FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "accounts_payable_insert"
  ON public.accounts_payable FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "accounts_payable_update"
  ON public.accounts_payable FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "accounts_payable_delete"
  ON public.accounts_payable FOR DELETE
  USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCO 12: VERIFICAÇÃO FINAL
-- Execute esta query para confirmar que as tabelas foram criadas corretamente.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS num_columns
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('financial_entries', 'financial_expenses', 'accounts_payable')
ORDER BY table_name;

-- Resultado esperado:
-- financial_entries   | 11
-- financial_expenses  | 11
-- accounts_payable    | 11

-- =============================================================================
-- FIM DO SCRIPT
-- Após executar, recarregue o sistema Reforço Pro para ativar o módulo.
-- =============================================================================
