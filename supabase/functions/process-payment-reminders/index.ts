// Supabase Edge Function: process-payment-reminders
// Executa diariamente para verificar mensalidades com vencimento hoje (America/Sao_Paulo)
// e despacha mensagens automáticas via Datafy API sem duplicidades.

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

function formatReminderMessage(
  template: string,
  variables: {
    responsavel: string;
    aluno: string;
    valor: string;
    vencimento: string;
    turma?: string;
    nome_escola?: string;
    chave_pix?: string;
  }
): string {
  let formatted = template;
  formatted = formatted.replace(/{responsavel}/g, variables.responsavel || 'Responsável');
  formatted = formatted.replace(/{aluno}/g, variables.aluno || 'Aluno');
  formatted = formatted.replace(/{valor}/g, variables.valor || 'R$ 0,00');
  formatted = formatted.replace(/{vencimento}/g, variables.vencimento || '');
  formatted = formatted.replace(/{turma}/g, variables.turma || 'Turma');
  formatted = formatted.replace(/{nome_escola}/g, variables.nome_escola || 'Reforço Pro');
  formatted = formatted.replace(/{chave_pix}/g, variables.chave_pix || '');
  formatted = formatted.replace(/{pix}/g, variables.chave_pix || '');
  return formatted;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const datafyBaseUrl = (Deno.env.get('DATAFY_API_BASE_URL') || 'https://cloud.datafyapi.com.br/v1').replace(/\/$/, '');
    const globalDatafyToken = Deno.env.get('DATAFY_API_TOKEN') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Supabase credentials missing.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Obter a data atual em São Paulo (America/Sao_Paulo)
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    // Obter data em formato yyyy-MM-dd para comparação no Postgres
    const nowSP = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const yyyy = nowSP.getFullYear();
    const mm = String(nowSP.getMonth() + 1).padStart(2, '0');
    const dd = String(nowSP.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const todayFormattedBR = `${dd}/${mm}/${yyyy}`;

    console.log(`[Reminders] Iniciando processamento de lembretes para data: ${todayStr} (America/Sao_Paulo)`);

    // 2. Buscar conexões conectadas que têm lembretes ativados
    const { data: activeConfigs, error: configErr } = await supabase
      .from('whatsapp_settings')
      .select(`
        user_id,
        enabled,
        reminder_time,
        message_template,
        profiles ( full_name )
      `)
      .eq('enabled', true);

    if (configErr) {
      throw new Error(`Erro ao buscar configurações ativas: ${configErr.message}`);
    }

    if (!activeConfigs || activeConfigs.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum usuário com lembretes automáticos ativos.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];

    for (const config of activeConfigs) {
      const userId = config.user_id;

      // Buscar a conexão do professor
      const { data: connection, error: connErr } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'datafy')
        .eq('status', 'connected')
        .maybeSingle();

      if (connErr || !connection || !connection.phone_number_id) {
        console.log(`[Reminders] Usuário ${userId} não possui conexão Datafy ativa e configurada.`);
        continue;
      }

      const effectiveToken = connection.api_token_encrypted || globalDatafyToken;
      if (!effectiveToken) {
        console.log(`[Reminders] Conexão do usuário ${userId} não possui token Datafy.`);
        continue;
      }

      // 3. Buscar mensalidades pendentes vencendo HOJE
      const { data: payments, error: payErr } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          due_date,
          status,
          student_id,
          guardian_id,
          students ( id, full_name, guardian_id, classes ( name ) ),
          guardians ( id, full_name, phone, whatsapp )
        `)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .eq('due_date', todayStr);

      if (payErr) {
        console.error(`[Reminders] Erro ao buscar pagamentos de ${userId}:`, payErr);
        continue;
      }

      for (const payment of (payments || [])) {
        // Verificar se já foi enviado lembrete para esta mensalidade hoje
        const { data: existingLog } = await supabase
          .from('whatsapp_message_logs')
          .select('id, status')
          .eq('mensalidade_id', payment.id)
          .eq('message_type', 'payment_reminder')
          .neq('status', 'failed')
          .gte('created_at', `${todayStr}T00:00:00.000Z`)
          .maybeSingle();

        if (existingLog) {
          console.log(`[Reminders] Lembrete para a mensalidade ${payment.id} já enviado hoje.`);
          continue;
        }

        // Resolver aluno e responsável
        const student = payment.students;
        let guardian = payment.guardians;

        if (!guardian && student?.guardian_id) {
          const { data: gData } = await supabase
            .from('guardians')
            .select('id, full_name, phone, whatsapp')
            .eq('id', student.guardian_id)
            .maybeSingle();
          guardian = gData;
        }

        if (!guardian) {
          console.log(`[Reminders] Mensalidade ${payment.id} não possui responsável associado.`);
          continue;
        }

        const rawPhone = guardian.whatsapp || guardian.phone;
        const normalizedPhone = normalizeBrazilianPhone(rawPhone);

        if (!isValidBrazilianPhone(normalizedPhone)) {
          console.log(`[Reminders] Telefone inválido (${rawPhone}) para o responsável ${guardian.full_name}`);
          continue;
        }

        // Montar mensagem
        const formattedAmount = Number(payment.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const messageBody = formatReminderMessage(config.message_template, {
          responsavel: guardian.full_name.split(' ')[0],
          aluno: student?.full_name || 'Aluno',
          valor: formattedAmount,
          vencimento: todayFormattedBR,
          turma: student?.classes?.name || 'Geral',
          nome_escola: config.profiles?.full_name || 'Reforço Pro',
        });

        // Registrar log pendente
        const { data: logEntry, error: logInsertErr } = await supabase
          .from('whatsapp_message_logs')
          .insert({
            user_id: userId,
            whatsapp_connection_id: connection.id,
            mensalidade_id: payment.id,
            aluno_id: student?.id || null,
            responsavel_id: guardian.id || null,
            phone: normalizedPhone,
            message_type: 'payment_reminder',
            message_content: messageBody,
            provider: 'datafy',
            status: 'pending',
          })
          .select()
          .single();

        if (logInsertErr) {
          console.error('[Reminders] Falha ao registrar log inicial:', logInsertErr);
          continue;
        }

        // Disparar via Datafy API
        try {
          const apiUrl = `${datafyBaseUrl}/${connection.phone_number_id}/messages`;
          const sendRes = await fetch(apiUrl, {
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
              text: { preview_url: false, body: messageBody },
            }),
          });

          const sendJson = await sendRes.json().catch(() => ({}));

          if (sendRes.ok) {
            const providerMsgId = sendJson?.messages?.[0]?.id || sendJson?.id;
            await supabase
              .from('whatsapp_message_logs')
              .update({
                status: 'sent',
                provider_message_id: providerMsgId,
                sent_at: new Date().toISOString(),
              })
              .eq('id', logEntry.id);

            results.push({ paymentId: payment.id, status: 'sent', phone: normalizedPhone });
          } else {
            const errorMsg = sendJson?.error?.message || `HTTP ${sendRes.status}`;
            await supabase
              .from('whatsapp_message_logs')
              .update({
                status: 'failed',
                error_message: errorMsg,
              })
              .eq('id', logEntry.id);

            results.push({ paymentId: payment.id, status: 'failed', error: errorMsg });
          }
        } catch (error: any) {
          await supabase
            .from('whatsapp_message_logs')
            .update({
              status: 'failed',
              error_message: error.message || 'Falha de conexão',
            })
            .eq('id', logEntry.id);

          results.push({ paymentId: payment.id, status: 'failed', error: error.message });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[Reminders Fatal Error]', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
