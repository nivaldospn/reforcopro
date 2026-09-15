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
  formatted = formatted.replace(/{turma}/g, variables.turma || '');
  formatted = formatted.replace(/{nome_escola}/g, variables.nome_escola || 'Reforço Pro');
  formatted = formatted.replace(/{chave_pix}/g, variables.chave_pix || '');
  formatted = formatted.replace(/{pix}/g, variables.chave_pix || '');
  return formatted;
}

/**
 * GET /api/cron/payment-reminders
 *
 * Endpoint acionado automaticamente pela Vercel Cron Jobs (vercel.json).
 * Configurado para rodar diariamente às 08:00 BRT (11:00 UTC).
 *
 * Fluxo:
 * 1. Autentica via CRON_SECRET
 * 2. Usa SUPABASE_SERVICE_ROLE_KEY para acessar dados de todos os professores
 * 3. Para cada professor com cobranças automáticas ativas:
 *    a. Calcula data alvo = hoje + days_before dias (fuso America/Sao_Paulo)
 *    b. Busca mensalidades pendentes com due_date = data alvo
 *    c. Verifica anti-duplicidade
 *    d. Envia via Datafy API
 *    e. Registra resultado no log
 *
 * Segurança: NUNCA expõe tokens no frontend. Roda 100% no servidor.
 */
export async function GET(req: Request) {
  // 1. Verificar autenticação do cron via CRON_SECRET
  const authHeader = req.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET não configurado nas variáveis de ambiente.');
    return NextResponse.json({ error: 'Configuração incompleta no servidor.' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[Cron] Tentativa de acesso não autorizado ao endpoint do cron.');
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  // 2. Configurações
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const datafyToken = process.env.DATAFY_API_TOKEN || '';
  const datafyBaseUrl = (process.env.DATAFY_API_BASE_URL || 'https://cloud.datafyapi.com.br/v1').replace(/\/$/, '');

  if (!serviceRoleKey) {
    console.error('[Cron] SUPABASE_SERVICE_ROLE_KEY não configurada.');
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' }, { status: 500 });
  }

  if (!datafyToken) {
    console.error('[Cron] DATAFY_API_TOKEN não configurado.');
    return NextResponse.json({ error: 'DATAFY_API_TOKEN não configurado.' }, { status: 500 });
  }

  // 3. Criar cliente Supabase com service role (acesso total, sem RLS)
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  // 4. Data atual no fuso America/Sao_Paulo
  const nowSP = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const todayYYYY = nowSP.getFullYear();
  const todayMM = String(nowSP.getMonth() + 1).padStart(2, '0');
  const todayDD = String(nowSP.getDate()).padStart(2, '0');
  const todayStr = `${todayYYYY}-${todayMM}-${todayDD}`;

  console.log(`[Cron] Iniciando processamento de cobranças automáticas — ${todayStr} (America/Sao_Paulo)`);

  // 5. Buscar todos os professores com cobranças automáticas ativas
  const { data: activeSettings, error: settingsErr } = await adminClient
    .from('whatsapp_settings')
    .select('user_id, message_template, days_before, reminder_time')
    .eq('enabled', true);

  if (settingsErr) {
    console.error('[Cron] Erro ao buscar configurações:', settingsErr.message);
    return NextResponse.json({ error: settingsErr.message }, { status: 500 });
  }

  const totalUsers = activeSettings?.length || 0;
  console.log(`[Cron] ${totalUsers} professor(es) com cobranças automáticas ativas.`);

  const results: any[] = [];

  // 6. Processar cada professor
  for (const settings of (activeSettings || [])) {
    const userId = settings.user_id;
    const daysBefore = settings.days_before ?? 3;

    // 6a. Calcular data alvo (hoje + N dias)
    const targetDate = new Date(nowSP);
    targetDate.setDate(targetDate.getDate() + daysBefore);
    const targetYYYY = targetDate.getFullYear();
    const targetMM = String(targetDate.getMonth() + 1).padStart(2, '0');
    const targetDD = String(targetDate.getDate()).padStart(2, '0');
    const targetDateStr = `${targetYYYY}-${targetMM}-${targetDD}`;
    const targetDateBR = `${targetDD}/${targetMM}/${targetYYYY}`;

    console.log(`[Cron] Professor ${userId}: buscando vencimentos em ${targetDateStr} (${daysBefore} dias à frente)`);

    // 6b. Buscar conexão Datafy ativa do professor
    const { data: connection } = await adminClient
      .from('whatsapp_connections')
      .select('id, phone_number_id, display_name, status')
      .eq('user_id', userId)
      .eq('provider', 'datafy')
      .eq('status', 'connected')
      .maybeSingle();

    if (!connection || !connection.phone_number_id) {
      results.push({ userId, status: 'skipped', reason: 'WhatsApp não conectado' });
      continue;
    }

    // 6c. Buscar mensalidades pendentes com vencimento = targetDateStr
    const { data: payments, error: payErr } = await adminClient
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
      .eq('due_date', targetDateStr);

    if (payErr) {
      results.push({ userId, status: 'error', reason: payErr.message });
      continue;
    }

    let userSent = 0;
    let userIgnored = 0;
    let userFailed = 0;

    for (const payment of (payments || [])) {
      // 6d. Anti-duplicidade: verificar se já foi enviado com sucesso para esta mensalidade
      const { data: existingLog } = await adminClient
        .from('whatsapp_message_logs')
        .select('id, status')
        .eq('mensalidade_id', payment.id)
        .eq('message_type', 'payment_reminder')
        .in('status', ['sent', 'delivered', 'read'])
        .maybeSingle();

      if (existingLog) {
        userIgnored++;
        continue;
      }

      // 6e. Obter responsável
      const student: any = payment.students;
      let guardian: any = payment.guardians;

      if (!guardian && student?.guardian_id) {
        const { data: gData } = await adminClient
          .from('guardians')
          .select('id, full_name, phone, whatsapp')
          .eq('id', student.guardian_id)
          .maybeSingle();
        guardian = gData;
      }

      if (!guardian) {
        userIgnored++;
        await adminClient.from('whatsapp_message_logs').insert({
          user_id: userId,
          mensalidade_id: payment.id,
          phone: '',
          message_type: 'payment_reminder',
          message_content: '',
          provider: 'datafy',
          status: 'failed',
          error_message: 'Aluno sem responsável vinculado',
        });
        continue;
      }

      // 6f. Validar WhatsApp (usa campo whatsapp do responsável, não phone)
      const rawPhone = guardian.whatsapp || guardian.phone;
      if (!rawPhone) {
        userIgnored++;
        await adminClient.from('whatsapp_message_logs').insert({
          user_id: userId,
          mensalidade_id: payment.id,
          aluno_id: student?.id || null,
          responsavel_id: guardian.id || null,
          phone: '',
          message_type: 'payment_reminder',
          message_content: '',
          provider: 'datafy',
          status: 'failed',
          error_message: 'Responsável sem WhatsApp cadastrado.',
        });
        continue;
      }

      const normalizedPhone = normalizeBrazilianPhone(rawPhone);
      if (!isValidBrazilianPhone(normalizedPhone)) {
        userIgnored++;
        await adminClient.from('whatsapp_message_logs').insert({
          user_id: userId,
          mensalidade_id: payment.id,
          aluno_id: student?.id || null,
          responsavel_id: guardian.id || null,
          phone: rawPhone,
          message_type: 'payment_reminder',
          message_content: '',
          provider: 'datafy',
          status: 'failed',
          error_message: `Número inválido: ${rawPhone}`,
        });
        continue;
      }

      // 6g. Montar mensagem
      const formattedAmount = Number(payment.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const messageBody = formatReminderMessage(settings.message_template, {
        responsavel: guardian.full_name.split(' ')[0],
        aluno: student?.full_name || 'Aluno',
        valor: formattedAmount,
        vencimento: targetDateBR,
        turma: student?.classes?.name || '',
        nome_escola: connection.display_name || 'Reforço Pro',
      });

      // 6h. Inserir log pendente
      const { data: logEntry } = await adminClient
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

      // 6i. Enviar via Datafy API
      try {
        const apiUrl = `${datafyBaseUrl}/${connection.phone_number_id}/messages`;
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
          userSent++;
          const providerMsgId = sendData?.messages?.[0]?.id || sendData?.id;
          if (logEntry) {
            await adminClient
              .from('whatsapp_message_logs')
              .update({
                status: 'sent',
                provider_message_id: providerMsgId || null,
                sent_at: new Date().toISOString(),
              })
              .eq('id', logEntry.id);
          }
        } else {
          userFailed++;
          const errorMsg = sendData?.error?.message || sendData?.message || `Erro HTTP ${res.status}`;
          if (logEntry) {
            await adminClient
              .from('whatsapp_message_logs')
              .update({ status: 'failed', error_message: errorMsg })
              .eq('id', logEntry.id);
          }
        }
      } catch (err: any) {
        userFailed++;
        if (logEntry) {
          await adminClient
            .from('whatsapp_message_logs')
            .update({ status: 'failed', error_message: err.message || 'Falha de conexão' })
            .eq('id', logEntry.id);
        }
      }
    }

    results.push({
      userId,
      targetDate: targetDateStr,
      daysBefore,
      stats: { found: (payments?.length || 0), sent: userSent, ignored: userIgnored, failed: userFailed }
    });
  }

  console.log(`[Cron] Processamento concluído. Professores processados: ${totalUsers}`);

  return NextResponse.json({
    success: true,
    processedAt: new Date().toISOString(),
    timezone: 'America/Sao_Paulo',
    today: todayStr,
    totalUsersProcessed: totalUsers,
    results,
  });
}
