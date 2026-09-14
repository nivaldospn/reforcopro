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

    const payload = await req.json();
    const { to, message, messageType = 'manual_payment_reminder', mensalidadeId, alunoId, responsavelId } = payload;

    if (!to || !message) {
      return NextResponse.json({ error: 'Destinatário e mensagem são obrigatórios' }, { status: 400 });
    }

    const normalizedPhone = normalizeBrazilianPhone(to);
    if (!isValidBrazilianPhone(normalizedPhone)) {
      return NextResponse.json({ error: 'Número de WhatsApp inválido. Informe o DDD e o número completo.' }, { status: 400 });
    }

    // Buscar a conexão WhatsApp do usuário
    const { data: connection, error: connErr } = await userClient
      .from('whatsapp_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'datafy')
      .maybeSingle();

    if (connErr || !connection || connection.status !== 'connected' || !connection.phone_number_id) {
      return NextResponse.json({ error: 'WhatsApp não conectado. Conecte seu WhatsApp nas Configurações.' }, { status: 400 });
    }

    const effectiveToken = connection.api_token_encrypted || datafyToken;

    // Inserir log inicial
    const { data: logEntry } = await userClient
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

    // Disparar via Datafy API (tentativa texto livre ou template)
    const apiUrl = `${datafyBaseUrl}/${connection.phone_number_id}/messages`;
    console.log(`[Datafy] Enviando para ${apiUrl} -> Destino: ${normalizedPhone}`);

    // Montar payload de texto
    const textPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'text',
      text: { preview_url: false, body: message },
    };

    let res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${effectiveToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(textPayload),
    });

    let data = await res.json().catch(() => ({}));
    console.log(`[Datafy Response] Status: ${res.status}`, data);

    // Se a Meta rejeitou o texto livre por política de 24h ou ausência de template
    if (!res.ok && data?.error?.code === 100) {
      console.log('[Datafy] Tentando envio via template aprovado de lembrete...');
      const templatePayload = {
        messaging_product: 'whatsapp',
        to: normalizedPhone,
        type: 'template',
        template: {
          name: 'lembrete_mensalidade',
          language: { code: 'pt_BR' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: 'R$ 150,00' },
                { type: 'text', text: new Date().toLocaleDateString('pt-BR') }
              ]
            }
          ]
        }
      };

      const templateRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${effectiveToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templatePayload),
      });

      const templateData = await templateRes.json().catch(() => ({}));
      if (templateRes.ok) {
        res = templateRes;
        data = templateData;
      }
    }

    if (!res.ok) {
      let friendlyError = data?.error?.message || data?.message || `Erro da Datafy API (HTTP ${res.status})`;
      if (data?.error?.code === 100) {
        friendlyError = 'O número está conectado, mas a Meta exige que o template ou número finalize a verificação (aguarde a aprovação da Meta ou envie um "Oi" para o WhatsApp da escola para abrir a janela de teste).';
      }
      if (logEntry) {
        await userClient
          .from('whatsapp_message_logs')
          .update({ status: 'failed', error_message: friendlyError })
          .eq('id', logEntry.id);
      }
      return NextResponse.json({ error: friendlyError }, { status: 400 });
    }

    const providerMsgId = data?.messages?.[0]?.id || data?.id;

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

    return NextResponse.json({ success: true, messageId: providerMsgId });
  } catch (err: any) {
    console.error('[API Send WhatsApp Error]', err);
    return NextResponse.json({ error: err.message || 'Falha interna ao enviar mensagem' }, { status: 500 });
  }
}
