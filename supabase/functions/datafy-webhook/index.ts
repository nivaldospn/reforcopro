// Supabase Edge Function: datafy-webhook
// Recebe eventos da Datafy / Meta Cloud API (entregue, lido, falha) e atualiza os logs

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Verificação de Webhook (GET para desafio de handshake da Meta/Datafy)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const expectedToken = Deno.env.get('DATAFY_WEBHOOK_VERIFY_TOKEN') || 'reforcopro_webhook_token';

    if (mode === 'subscribe' && token === expectedToken) {
      return new Response(challenge || 'ok', { status: 200 });
    }

    return new Response('Token de verificação inválido', { status: 403 });
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Webhook] Credenciais do Supabase ausentes.');
      return new Response(JSON.stringify({ error: 'Configuração incompleta' }), { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Processamento assíncrono rápido
    // Estrutura padrão de eventos Meta/Datafy:
    // entry -> changes -> value -> statuses [ { id: "wamid...", status: "delivered" | "read" | "failed" } ]
    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const statuses = change.value?.statuses || [];
        for (const statusObj of statuses) {
          const providerMsgId = statusObj.id;
          const status = statusObj.status; // 'sent', 'delivered', 'read', 'failed'
          const errors = statusObj.errors;

          if (providerMsgId && ['sent', 'delivered', 'read', 'failed'].includes(status)) {
            const updatePayload: any = { status };
            if (errors && errors.length > 0) {
              updatePayload.error_message = errors.map((e: any) => e.title || e.message).join(' | ');
            }

            await supabase
              .from('whatsapp_message_logs')
              .update(updatePayload)
              .eq('provider_message_id', providerMsgId);
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true, success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[Webhook Error]', err);
    // Sempre responder 200 para evitar retentativas agressivas da API quando o payload for malformado
    return new Response(JSON.stringify({ received: true, error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
