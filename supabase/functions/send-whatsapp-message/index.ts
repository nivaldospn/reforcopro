// Supabase Edge Function: send-whatsapp-message
// Dispara mensagens manuais ou de teste do WhatsApp mantendo os tokens isolados no backend.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizeBrazilianPhone(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) clean = clean.substring(1);
  if (!clean.startsWith('55') && (clean.length === 10 || clean.length === 11)) {
    clean = '55' + clean;
  }
  return clean;
}

function isValidBrazilianPhone(normalizedPhone: string): boolean {
  return /^55[1-9]{2}9?[0-9]{8}$/.test(normalizedPhone);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const datafyBaseUrl = (Deno.env.get('DATAFY_API_BASE_URL') || 'https://api.datafy.com.br/v1').replace(/\/$/, '');
    const globalDatafyToken = Deno.env.get('DATAFY_API_TOKEN') || '';

    // Autenticar o usuário pelo JWT recebido no header
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    const { to, message, messageType = 'manual_payment_reminder', mensalidadeId, alunoId, responsavelId } = payload;

    if (!to || !message) {
      return new Response(JSON.stringify({ error: 'Destinatário e mensagem são obrigatórios.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedPhone = normalizeBrazilianPhone(to);
    if (!isValidBrazilianPhone(normalizedPhone)) {
      return new Response(JSON.stringify({ error: 'Número de WhatsApp inválido. Informe o DDD e o número completo.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Usar client service role para acessar dados da conexão do usuário
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: connection, error: connErr } = await adminClient
      .from('whatsapp_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'datafy')
      .maybeSingle();

    if (connErr || !connection || connection.status !== 'connected' || !connection.phone_number_id) {
      return new Response(JSON.stringify({ error: 'WhatsApp não conectado. Conecte seu WhatsApp nas Configurações.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const effectiveToken = connection.api_token_encrypted || globalDatafyToken;
    if (!effectiveToken) {
      return new Response(JSON.stringify({ error: 'Token da integração Datafy não configurado.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Registrar log no banco com status 'pending'
    const { data: logEntry, error: logErr } = await adminClient
      .from('whatsapp_message_logs')
      .insert({
        user_id: user.id,
        whatsapp_connection_id: connection.id,
        mensalidade_id: mensalidadeId || null,
        aluno_id: alunoId || null,
        responsavel_id: responsavelId || null,
        phone: normalizedPhone,
        message_type: messageType,
        message_content: message,
        provider: 'datafy',
        status: 'pending',
      })
      .select()
      .single();

    // Fazer a chamada para a Datafy API
    const apiUrl = `${datafyBaseUrl}/${connection.phone_number_id}/messages`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${effectiveToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedPhone,
        type: 'text',
        text: { preview_url: false, body: message },
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data?.error?.message || `Erro da Datafy API (HTTP ${response.status})`;
      if (logEntry) {
        await adminClient
          .from('whatsapp_message_logs')
          .update({ status: 'failed', error_message: errorMsg })
          .eq('id', logEntry.id);
      }
      return new Response(JSON.stringify({ error: 'Não foi possível enviar a mensagem. Verifique a conexão com o WhatsApp.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const providerMsgId = data?.messages?.[0]?.id || data?.id;

    if (logEntry) {
      await adminClient
        .from('whatsapp_message_logs')
        .update({
          status: 'sent',
          provider_message_id: providerMsgId,
          sent_at: new Date().toISOString(),
        })
        .eq('id', logEntry.id);
    }

    return new Response(JSON.stringify({ success: true, messageId: providerMsgId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[Send Message Error]', err);
    return new Response(JSON.stringify({ error: 'Falha interna ao processar o envio.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
