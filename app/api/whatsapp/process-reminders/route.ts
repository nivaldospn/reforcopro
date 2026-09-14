import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const datafyToken = process.env.DATAFY_API_TOKEN || '';
    const datafyBaseUrl = (process.env.DATAFY_API_BASE_URL || 'https://cloud.datafyapi.com.br/v1').replace(/\/$/, '');

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    // 1. Data atual no fuso de Brasília (America/Sao_Paulo)
    const nowSP = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const yyyy = nowSP.getFullYear();
    const mm = String(nowSP.getMonth() + 1).padStart(2, '0');
    const dd = String(nowSP.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const todayFormattedBR = `${dd}/${mm}/${yyyy}`;

    console.log(`[Reminders Process] Iniciando processamento para ${user.id} em ${todayStr} (America/Sao_Paulo)`);

    // 2. Buscar configurações de lembrete do professor
    const { data: settings } = await userClient
      .from('whatsapp_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!settings || !settings.enabled) {
      return NextResponse.json({
        success: true,
        message: 'Lembretes automáticos desativados nas configurações.',
        stats: { found: 0, sent: 0, ignored: 0, failed: 0 }
      });
    }

    // 3. Buscar conexão Datafy do professor
    const { data: connection } = await userClient
      .from('whatsapp_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'datafy')
      .eq('status', 'connected')
      .maybeSingle();

    if (!connection || !connection.phone_number_id) {
      return NextResponse.json({
        success: false,
        error: 'WhatsApp não conectado. Conecte o WhatsApp nas configurações.',
        stats: { found: 0, sent: 0, ignored: 0, failed: 0 }
      }, { status: 400 });
    }

    const effectiveToken = connection.api_token_encrypted || datafyToken;

    // 4. Buscar mensalidades pendentes vencendo HOJE
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
      .eq('due_date', todayStr);

    if (payErr) {
      return NextResponse.json({ error: payErr.message }, { status: 500 });
    }

    const totalFound = payments?.length || 0;
    let sentCount = 0;
    let ignoredCount = 0;
    let failedCount = 0;
    const logs: any[] = [];

    for (const payment of (payments || [])) {
      // 5. Verificar anti-duplicidade: já foi enviado hoje?
      const { data: existingLog } = await userClient
        .from('whatsapp_message_logs')
        .select('id, status')
        .eq('mensalidade_id', payment.id)
        .eq('message_type', 'payment_reminder')
        .neq('status', 'failed')
        .gte('created_at', `${todayStr}T00:00:00.000Z`)
        .maybeSingle();

      if (existingLog) {
        ignoredCount++;
        logs.push({ paymentId: payment.id, reason: 'Mensagem já enviada hoje para esta mensalidade' });
        continue;
      }

      // 6. Obter Aluno e Responsável
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

      const rawPhone = guardian.whatsapp || guardian.phone;
      const normalizedPhone = normalizeBrazilianPhone(rawPhone);

      if (!isValidBrazilianPhone(normalizedPhone)) {
        ignoredCount++;
        logs.push({ paymentId: payment.id, reason: `Telefone inválido ou ausente: ${rawPhone}` });
        continue;
      }

      // 7. Montar mensagem formatada
      const formattedAmount = Number(payment.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const messageBody = formatReminderMessage(settings.message_template, {
        responsavel: guardian.full_name.split(' ')[0],
        aluno: student?.full_name || 'Aluno',
        valor: formattedAmount,
        vencimento: todayFormattedBR,
        turma: student?.classes?.name || 'Turma',
        nome_escola: connection.display_name || 'Reforço Pro',
      });

      // 8. Inserir log inicial pendente
      const { data: logEntry } = await userClient
        .from('whatsapp_message_logs')
        .insert({
          user_id: user.id,
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

      // 9. Disparo via Datafy API
      try {
        const apiUrl = `${datafyBaseUrl}/${connection.phone_number_id}/messages`;
        const res = await fetch(apiUrl, {
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

        const sendData = await res.json().catch(() => ({}));

        if (res.ok) {
          sentCount++;
          const providerMsgId = sendData?.messages?.[0]?.id || sendData?.id;
          if (logEntry) {
            await userClient
              .from('whatsapp_message_logs')
              .update({
                status: 'sent',
                provider_message_id: providerMsgId,
                sent_at: new Date().toISOString(),
              })
              .eq('id', logEntry.id);
          }
          logs.push({ paymentId: payment.id, status: 'sent', phone: normalizedPhone });
        } else {
          failedCount++;
          const errorMsg = sendData?.error?.message || `Erro HTTP ${res.status}`;
          if (logEntry) {
            await userClient
              .from('whatsapp_message_logs')
              .update({ status: 'failed', error_message: errorMsg })
              .eq('id', logEntry.id);
          }
          logs.push({ paymentId: payment.id, status: 'failed', error: errorMsg });
        }
      } catch (err: any) {
        failedCount++;
        if (logEntry) {
          await userClient
            .from('whatsapp_message_logs')
            .update({ status: 'failed', error_message: err.message || 'Falha de conexão' })
            .eq('id', logEntry.id);
        }
        logs.push({ paymentId: payment.id, status: 'failed', error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
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
