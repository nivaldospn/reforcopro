import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  normalizeBrazilianPhone,
  isValidBrazilianPhone,
  getMetaWhatsAppConfig,
  sendMetaWhatsAppText,
  sendMetaWhatsAppTemplate,
  META_DEFAULT_PAYMENT_TEMPLATE,
  extractPixKeyFromMessageTemplate,
} from '@/lib/whatsapp/meta-client';

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

/**
 * POST /api/whatsapp/process-reminders
 *
 * Chamado manualmente pelo professor (botão na UI de Configurações).
 * Para chamada automática (cron), use GET /api/cron/payment-reminders.
 *
 * Lógica: busca mensalidades pendentes cujo vencimento = hoje + days_before (padrão 3 dias).
 * Ex: hoje = 17/09 → busca mensalidades com due_date = 20/09.
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    // 1. Data atual no fuso de Brasília (America/Sao_Paulo)
    const nowSP = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const todayYYYY = nowSP.getFullYear();
    const todayMM = String(nowSP.getMonth() + 1).padStart(2, '0');
    const todayDD = String(nowSP.getDate()).padStart(2, '0');
    const todayStr = `${todayYYYY}-${todayMM}-${todayDD}`;

    console.log(`[Reminders Process] Usuário ${user.id} — data atual SP: ${todayStr}`);

    // 2. Buscar configurações de lembrete do professor
    const { data: settings } = await userClient
      .from('whatsapp_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!settings || !settings.enabled) {
      return NextResponse.json({
        success: true,
        message: 'Cobranças automáticas desativadas nas configurações.',
        stats: { found: 0, sent: 0, ignored: 0, failed: 0 }
      });
    }

    // 3. Calcular a data alvo: hoje + days_before dias (padrão 3)
    const daysBefore = settings.days_before ?? 3;
    const targetDate = new Date(nowSP);
    targetDate.setDate(targetDate.getDate() + daysBefore);
    const targetYYYY = targetDate.getFullYear();
    const targetMM = String(targetDate.getMonth() + 1).padStart(2, '0');
    const targetDD = String(targetDate.getDate()).padStart(2, '0');
    const targetDateStr = `${targetYYYY}-${targetMM}-${targetDD}`;
    const targetDateBR = `${targetDD}/${targetMM}/${targetYYYY}`;

    console.log(`[Reminders Process] Buscando mensalidades com vencimento em ${targetDateStr} (${daysBefore} dias a partir de hoje ${todayStr})`);

    // 4. Buscar conexão do professor (prioridade: meta, fallback: datafy)
    const { data: connection } = await userClient
      .from('whatsapp_connections')
      .select('*')
      .eq('user_id', user.id)
      .in('provider', ['meta', 'datafy'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const metaConfig = getMetaWhatsAppConfig();
    const isMetaActive = metaConfig.isConfigured;
    const chosenProvider = isMetaActive ? 'meta' : 'datafy';

    // Se Meta não estiver configurada e não houver conexão Datafy válida
    if (!isMetaActive && (!connection || connection.status !== 'connected' || !connection.phone_number_id)) {
      return NextResponse.json({
        success: false,
        error: 'WhatsApp não configurado. Adicione WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID nas variáveis de ambiente.',
        stats: { found: 0, sent: 0, ignored: 0, failed: 0 }
      }, { status: 400 });
    }

    // 5. Buscar mensalidades PENDENTES com due_date = targetDateStr
    const { data: payments, error: payErr } = await userClient
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
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .eq('due_date', targetDateStr);

    if (payErr) {
      return NextResponse.json({ error: payErr.message }, { status: 500 });
    }

    const totalFound = payments?.length || 0;
    let sentCount = 0;
    let ignoredCount = 0;
    let failedCount = 0;
    const logs: any[] = [];

    console.log(`[Reminders Process] Encontradas ${totalFound} mensalidade(s) com vencimento em ${targetDateStr}`);

    // Template oficial configurável para cobranças (opcional via env, padrão 'lembrete_mensalidade')
    const configuredTemplateName = process.env.WHATSAPP_PAYMENT_REMINDER_TEMPLATE || '';

    for (const payment of (payments || [])) {
      // 6. Anti-duplicidade: verificar se já foi enviado com sucesso para esta mensalidade
      const { data: existingLog } = await userClient
        .from('whatsapp_message_logs')
        .select('id, status, created_at')
        .eq('mensalidade_id', payment.id)
        .eq('message_type', 'payment_reminder')
        .in('status', ['sent', 'delivered', 'read'])
        .maybeSingle();

      if (existingLog) {
        ignoredCount++;
        logs.push({
          paymentId: payment.id,
          reason: `Cobrança já enviada anteriormente (log ${existingLog.id}, status: ${existingLog.status})`
        });
        continue;
      }

      // 7. Obter Aluno e Responsável
      const student: any = payment.students;
      let guardian: any = payment.guardians;

      if (!guardian && student?.guardian_id) {
        const { data: gData } = await userClient
          .from('guardians')
          .select('id, full_name, phone, whatsapp')
          .eq('id', student.guardian_id)
          .maybeSingle();
        guardian = gData;
      }

      if (!guardian) {
        ignoredCount++;
        logs.push({ paymentId: payment.id, reason: 'Aluno sem responsável vinculado' });
        continue;
      }

      // 8. Validar WhatsApp do responsável
      const rawPhone = guardian.whatsapp || guardian.phone;
      if (!rawPhone) {
        ignoredCount++;
        logs.push({ paymentId: payment.id, reason: 'Responsável sem WhatsApp cadastrado.' });
        continue;
      }

      const normalizedPhone = normalizeBrazilianPhone(rawPhone);
      if (!isValidBrazilianPhone(normalizedPhone)) {
        ignoredCount++;
        logs.push({ paymentId: payment.id, reason: `Número de WhatsApp inválido: ${rawPhone}` });
        continue;
      }

      // 9. Extrair Chave Pix e montar mensagem formatada com as variáveis
      const extractedPixKey = extractPixKeyFromMessageTemplate(settings.message_template);
      const formattedAmount = Number(payment.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const messageBody = formatReminderMessage(settings.message_template, {
        responsavel: guardian.full_name.split(' ')[0],
        aluno: student?.full_name || 'Aluno',
        valor: formattedAmount,
        vencimento: targetDateBR,
        turma: student?.classes?.name || '',
        nome_escola: connection?.display_name || 'Reforço Pro',
        chave_pix: extractedPixKey,
      });

      // 10. Inserir log inicial como 'pending'
      const { data: logEntry } = await userClient
        .from('whatsapp_message_logs')
        .insert({
          user_id: user.id,
          whatsapp_connection_id: connection?.id || null,
          mensalidade_id: payment.id,
          aluno_id: student?.id || null,
          responsavel_id: guardian.id || null,
          phone: normalizedPhone,
          message_type: 'payment_reminder',
          message_content: messageBody,
          provider: chosenProvider,
          status: 'pending',
        })
        .select()
        .single();

      // 11. DISPARO
      try {
        if (isMetaActive) {
          // PROVEDOR META:
          // Usa o template oficial aprovado 'lembrete_mensalidade' com os 5 parâmetros na ordem:
          // {{1}} = Responsável | {{2}} = Aluno | {{3}} = Valor | {{4}} = Vencimento | {{5}} = Chave Pix
          const templateNameToUse = process.env.WHATSAPP_PAYMENT_REMINDER_TEMPLATE || META_DEFAULT_PAYMENT_TEMPLATE;
          
          const metaRes = await sendMetaWhatsAppTemplate({
            to: normalizedPhone,
            templateName: templateNameToUse,
            languageCode: 'pt_BR',
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: guardian.full_name.split(' ')[0] },
                  { type: 'text', text: student?.full_name || 'Aluno' },
                  { type: 'text', text: formattedAmount },
                  { type: 'text', text: targetDateBR },
                  { type: 'text', text: extractedPixKey || 'Não informada' },
                ],
              },
            ],
          });

          if (metaRes.success && metaRes.messageId) {
            sentCount++;
            if (logEntry) {
              await userClient
                .from('whatsapp_message_logs')
                .update({
                  status: 'sent',
                  provider_message_id: metaRes.messageId,
                  sent_at: new Date().toISOString(),
                })
                .eq('id', logEntry.id);
            }
            logs.push({ paymentId: payment.id, status: 'sent', phone: normalizedPhone, messageId: metaRes.messageId, provider: 'meta' });
          } else {
            failedCount++;
            let errorMsg = metaRes.error || 'Falha no envio via Meta';
            if (metaRes.errorCode === 131047 || metaRes.errorCode === 100) {
              errorMsg = 'A Meta exige um template aprovado para iniciar mensagens fora da janela de 24h. Crie e aprove o template de lembrete no WhatsApp Business Manager.';
            }
            if (logEntry) {
              await userClient
                .from('whatsapp_message_logs')
                .update({ status: 'failed', error_message: errorMsg })
                .eq('id', logEntry.id);
            }
            logs.push({ paymentId: payment.id, status: 'failed', error: errorMsg, provider: 'meta' });
          }
        } else {
          // FALLBACK LEGADO DATAFY
          const datafyToken = process.env.DATAFY_API_TOKEN || connection?.api_token_encrypted || '';
          const datafyBaseUrl = (process.env.DATAFY_API_BASE_URL || 'https://cloud.datafyapi.com.br/v1').replace(/\/$/, '');
          const phoneNumberId = connection?.phone_number_id;

          if (!phoneNumberId) {
            failedCount++;
            const errorMsg = 'Phone Number ID não configurado na conexão para envio via Datafy';
            if (logEntry) {
              await userClient
                .from('whatsapp_message_logs')
                .update({ status: 'failed', error_message: errorMsg })
                .eq('id', logEntry.id);
            }
            logs.push({ paymentId: payment.id, status: 'failed', error: errorMsg, provider: 'datafy' });
            continue;
          }

          const apiUrl = `${datafyBaseUrl}/${phoneNumberId}/messages`;

          const res = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${datafyToken}`,
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

          const sendData = await res.json().catch(() => ({}));

          if (res.ok) {
            sentCount++;
            const providerMsgId = sendData?.messages?.[0]?.id || sendData?.id;
            if (logEntry) {
              await userClient
                .from('whatsapp_message_logs')
                .update({
                  status: 'sent',
                  provider_message_id: providerMsgId || null,
                  sent_at: new Date().toISOString(),
                })
                .eq('id', logEntry.id);
            }
            logs.push({ paymentId: payment.id, status: 'sent', phone: normalizedPhone, messageId: providerMsgId, provider: 'datafy' });
          } else {
            failedCount++;
            const errorMsg = sendData?.error?.message || sendData?.message || `Erro HTTP ${res.status} da Datafy`;
            if (logEntry) {
              await userClient
                .from('whatsapp_message_logs')
                .update({ status: 'failed', error_message: errorMsg })
                .eq('id', logEntry.id);
            }
            logs.push({ paymentId: payment.id, status: 'failed', error: errorMsg, provider: 'datafy' });
          }
        }
      } catch (err: any) {
        failedCount++;
        const errorMsg = err.message || 'Falha de conexão com provedor';
        if (logEntry) {
          await userClient
            .from('whatsapp_message_logs')
            .update({ status: 'failed', error_message: errorMsg })
            .eq('id', logEntry.id);
        }
        logs.push({ paymentId: payment.id, status: 'failed', error: errorMsg });
      }
    }

    console.log(`[Reminders Process] Concluído: encontradas=${totalFound} enviadas=${sentCount} ignoradas=${ignoredCount} falhas=${failedCount}`);

    return NextResponse.json({
      success: true,
      provider: chosenProvider,
      targetDate: targetDateStr,
      daysBefore,
      stats: {
        found: totalFound,
        sent: sentCount,
        ignored: ignoredCount,
        failed: failedCount,
      },
      logs,
    });
  } catch (err: any) {
    console.error('[Process Reminders Error]', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
