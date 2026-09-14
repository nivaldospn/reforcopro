-- Migration: WhatsApp Datafy Integration for Reforço Pro
-- Multi-tenant: Isolamento por user_id com RLS e índices

-- 1. CONEXÕES WHATSAPP POR PROFESSOR
CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'datafy',
    phone_number_id TEXT,
    waba_id TEXT,
    phone_number TEXT,
    display_name TEXT,
    status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connecting', 'connected', 'disconnected', 'error')),
    api_token_encrypted TEXT,
    connected_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_whatsapp_connections_user_provider UNIQUE (user_id, provider)
);

-- 2. CONFIGURAÇÕES DE DISPARO E TEMPLATE POR PROFESSOR
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT false,
    reminder_time TIME NOT NULL DEFAULT '08:00:00',
    message_template TEXT NOT NULL DEFAULT 'Olá, {responsavel}! 😊

Passando para lembrar que a mensalidade do aluno {aluno} vence hoje.

Valor: {valor}
Vencimento: {vencimento}

Obrigado!',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. HISTÓRICO E LOGS DE MENSAGENS WHATSAPP
CREATE TABLE IF NOT EXISTS public.whatsapp_message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    whatsapp_connection_id UUID REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL,
    mensalidade_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    aluno_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    responsavel_id UUID REFERENCES public.guardians(id) ON DELETE SET NULL,
    phone TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('payment_reminder', 'manual_payment_reminder', 'test_message')),
    message_content TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'datafy',
    provider_message_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ÍNDICES DE PERFORMANCE E PESQUISA
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_user_id ON public.whatsapp_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_user_id ON public.whatsapp_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_logs_user_id ON public.whatsapp_message_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_logs_mensalidade_id ON public.whatsapp_message_logs(mensalidade_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_logs_status ON public.whatsapp_message_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_logs_created_at ON public.whatsapp_message_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_logs_provider_msg_id ON public.whatsapp_message_logs(provider_message_id);

-- Índice único parcial para evitar duplicidade de lembretes automáticos na mesma data (fuso de São Paulo)
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_reminder_daily 
ON public.whatsapp_message_logs (mensalidade_id, (CAST(timezone('America/Sao_Paulo', created_at) AS DATE)))
WHERE message_type = 'payment_reminder' AND status != 'failed';

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de isolamento do usuário autenticado
DROP POLICY IF EXISTS "whatsapp_connections_user_policy" ON public.whatsapp_connections;
CREATE POLICY "whatsapp_connections_user_policy" ON public.whatsapp_connections
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "whatsapp_settings_user_policy" ON public.whatsapp_settings;
CREATE POLICY "whatsapp_settings_user_policy" ON public.whatsapp_settings
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "whatsapp_message_logs_user_policy" ON public.whatsapp_message_logs;
CREATE POLICY "whatsapp_message_logs_user_policy" ON public.whatsapp_message_logs
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. TRIGGERS DE ATUALIZAÇÃO DO updated_at
CREATE TRIGGER tr_whatsapp_connections_updated_at 
BEFORE UPDATE ON public.whatsapp_connections 
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER tr_whatsapp_settings_updated_at 
BEFORE UPDATE ON public.whatsapp_settings 
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
