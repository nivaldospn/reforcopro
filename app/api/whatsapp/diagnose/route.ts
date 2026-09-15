import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/whatsapp/diagnose
 * Endpoint temporário de diagnóstico — não expõe tokens.
 * Chama GET /me na Datafy para descobrir o phone_number_id real do token
 * e compara com o que está salvo no banco.
 * Remova este arquivo após confirmar o problema.
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  || '';
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const datafyToken  = process.env.DATAFY_API_TOKEN || '';
    const DATAFY_HOST  = 'https://cloud.datafyapi.com.br';

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    // 1. Conexão salva no banco
    const { data: conn } = await userClient
      .from('whatsapp_connections')
      .select('id, phone_number_id, phone_number, display_name, status, provider')
      .eq('user_id', user.id)
      .eq('provider', 'datafy')
      .maybeSingle();

    const tokenPrefix = datafyToken
      ? datafyToken.substring(0, 12) + '...[OCULTO]'
      : 'AUSENTE ⚠️';

    // 2. GET /me → IDs reais do token na Datafy
    let me: any = null;
    let meStatus: number | null = null;
    let meError: string | null = null;

    if (datafyToken) {
      try {
        const meRes = await fetch(`${DATAFY_HOST}/me`, {
          headers: { Authorization: `Bearer ${datafyToken}` },
        });
        meStatus = meRes.status;
        me = await meRes.json().catch(() => null);
        if (!meRes.ok) meError = me?.message || `HTTP ${meRes.status}`;
      } catch (e: any) {
        meError = `Falha de rede: ${e.message}`;
      }
    }

    const storedId  = conn?.phone_number_id ?? null;
    const datafyId  = me?.phone_number_id   ?? null;
    const idsMatch  = storedId && datafyId ? storedId === datafyId : null;

    const usedUrl    = `${DATAFY_HOST}/v1/${storedId  || 'NÃO_CONFIGURADO'}/messages`;
    const correctUrl = datafyId ? `${DATAFY_HOST}/v1/${datafyId}/messages` : null;

    return NextResponse.json({
      token: { presente: !!datafyToken, prefix: tokenPrefix },
      conexao_banco: conn
        ? { phone_number_id: storedId, phone_number: conn.phone_number,
            display_name: conn.display_name, status: conn.status }
        : 'NÃO ENCONTRADA — conecte o WhatsApp nas Configurações',
      datafy_me: {
        http_status: meStatus,
        erro: meError,
        phone_number_id: datafyId,
        waba_id:    me?.waba_id    ?? null,
        business_id: me?.business_id ?? null,
      },
      verificacao: {
        ids_batem: idsMatch,
        diagnostico: idsMatch === false
          ? `❌ PHONE_NUMBER_ID ERRADO! Banco: "${storedId}" | Datafy: "${datafyId}". Atualize a conexão.`
          : idsMatch === true
          ? '✅ phone_number_id correto'
          : '⚠️ Não foi possível verificar (token ausente ou erro na Datafy)',
      },
      urls: {
        url_usada_hoje: usedUrl,
        url_correta:    correctUrl,
        url_esta_correta: correctUrl ? usedUrl === correctUrl : null,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
