import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  normalizeBrazilianPhone,
  isValidBrazilianPhone,
  getMetaWhatsAppConfig,
  sendMetaWhatsAppText,
} from '@/lib/whatsapp/meta-client';

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

    const payload = await req.json();
    const { to, message, messageType = 'manual_payment_reminder', mensalidadeId, alunoId, responsavelId } = payload;

    if (!to || !message) {
      return NextResponse.json({ error: 'Destinatário e mensagem são obrigatórios' }, { status: 400 });
    }

    const normalizedPhone = normalizeBrazilianPhone(to);
    if (!isValidBrazilianPhone(normalizedPhone)) {
      return NextResponse.json({ error: 'Número de WhatsApp inválido. Informe o DDD e o número completo.' }, { status: 400 });
    }

    // Identificar conexão do usuário (prioridade: meta, fallback: datafy)
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

    // 1. Inserir log inicial como pending
    const { data: logEntry } = await userClient
      .from('whatsapp_message_logs')
      .insert({
        user_id: user.id,
        whatsapp_connection_id: connection?.id || null,
        mensalidade_id: mensalidadeId || null,
        aluno_id: alunoId || null,
        responsavel_id: responsavelId || null,
        phone: normalizedPhone,
        message_type: messageType,
        message_content: message,
        provider: chosenProvider,
        status: 'pending',
      })
      .select()
      .single();

    // 2. DISPARO PRINCIPAL: META CLOUD API
    if (isMetaActive) {
      console.log(`[WhatsApp Send] Enviando via Meta Cloud API oficial -> Destino: ${normalizedPhone}`);
      const metaRes = await sendMetaWhatsAppText({
        to: normalizedPhone,
        text: message,
      });

      if (metaRes.success && metaRes.messageId) {
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
        return NextResponse.json({ success: true, messageId: metaRes.messageId, provider: 'meta' });
      }

      // Falha na Meta
      let friendlyError = metaRes.error || 'Falha ao enviar mensagem pela Meta Cloud API';
      if (metaRes.errorCode === 131047 || metaRes.errorCode === 100) {
        friendlyError = 'A Meta exige janela aberta de 24h para envio de texto livre. Para cobranças sem conversa prévia, deve ser utilizado um template aprovado na Meta.';
      }

      if (logEntry) {
        await userClient
          .from('whatsapp_message_logs')
          .update({
            status: 'failed',
            error_message: friendlyError,
          })
          .eq('id', logEntry.id);
      }

      return NextResponse.json({ error: friendlyError, code: metaRes.errorCode }, { status: 400 });
    }

    // 3. FALLBACK LEGADO: DATAFY (apenas se Meta NÃO estiver configurada no ambiente)
    const datafyToken = process.env.DATAFY_API_TOKEN || connection?.api_token_encrypted || '';
    const datafyBaseUrl = (process.env.DATAFY_API_BASE_URL || 'https://cloud.datafyapi.com.br/v1').replace(/\/$/, '');
    const phoneNumberId = connection?.phone_number_id;

    if (!datafyToken || !phoneNumberId) {
      const errorMsg = 'WhatsApp não configurado. Adicione as variáveis WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID no Vercel.';
      if (logEntry) {
        await userClient
          .from('whatsapp_message_logs')
          .update({ status: 'failed', error_message: errorMsg })
          .eq('id', logEntry.id);
      }
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    console.log(`[WhatsApp Send] Meta não configurada. Enviando via Datafy legado -> Destino: ${normalizedPhone}`);
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
        text: { preview_url: false, body: message },
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errText = data?.error?.message || data?.message || `Erro HTTP ${res.status}`;
      if (logEntry) {
        await userClient
          .from('whatsapp_message_logs')
          .update({ status: 'failed', error_message: errText })
          .eq('id', logEntry.id);
      }
      return NextResponse.json({ error: errText }, { status: 400 });
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

    return NextResponse.json({ success: true, messageId: providerMsgId, provider: 'datafy' });
  } catch (err: any) {
    console.error('[API Send WhatsApp Error]', err);
    return NextResponse.json({ error: err.message || 'Falha interna ao enviar mensagem' }, { status: 500 });
  }
}
