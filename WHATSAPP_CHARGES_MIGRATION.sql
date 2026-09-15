-- ============================================================
-- REFORÇO PRO — MIGRAÇÃO: COBRANÇAS AUTOMÁTICAS WHATSAPP
-- Execute este SQL no Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/uraczttruyndoixabnld/sql
-- ============================================================

-- 1. Adicionar coluna "days_before" na tabela whatsapp_settings
--    Representa quantos dias antes do vencimento a cobrança é enviada (padrão: 3)
ALTER TABLE public.whatsapp_settings
ADD COLUMN IF NOT EXISTS days_before INTEGER NOT NULL DEFAULT 3;

COMMENT ON COLUMN public.whatsapp_settings.days_before
  IS 'Quantos dias antes do vencimento o sistema envia a cobrança automática';

-- 2. Índice para o cron job — busca eficiente de settings habilitados
CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_enabled
  ON public.whatsapp_settings(user_id)
  WHERE enabled = true;

-- 3. Índice para o cron job — busca de mensalidades por due_date + status
CREATE INDEX IF NOT EXISTS idx_payments_due_date_status
  ON public.payments(due_date, status)
  WHERE status = 'pending';

-- 4. Índice para anti-duplicidade — busca de log por mensalidade + tipo
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_mensalidade_type
  ON public.whatsapp_message_logs(mensalidade_id, message_type)
  WHERE message_type = 'payment_reminder';

-- ============================================================
-- VERIFICAÇÃO: execute esta query após a migration
-- ============================================================
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'whatsapp_settings'
ORDER BY ordinal_position;

-- Resultado esperado: deve aparecer a coluna "days_before" com default 3
-- ============================================================
