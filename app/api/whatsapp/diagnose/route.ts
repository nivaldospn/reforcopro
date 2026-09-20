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
    
    // Variáveis Meta Cloud API (Provedor Principal)
    const metaToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    const metaWabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
    const metaVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';

    // Variáveis Datafy API (Legado)
    const datafyToken  = process.env.DATAFY_API_TOKEN || '';
    const DATAFY_HOST  = 'https://cloud.datafyapi.com.br';

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    // 1. Conexão salva no banco (busca 'meta' ou fallback 'datafy')
    const { data: conn } = await userClient
      .from('whatsapp_connections')
      .select('id, phone_number_id, phone_number, display_name, status, provider')
      .eq('user_id', user.id)
      .in('provider', ['meta', 'datafy'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Testar Meta Cloud API (GET /{phone_number_id})
    let metaTest: any = null;
    let metaStatus: number | null = null;
    let metaError: string | null = null;

    if (metaToken && metaPhoneId) {
      try {
        const metaRes = await fetch(
          `https://graph.facebook.com/${metaVersion}/${metaPhoneId}?fields=verified_name,code_verification_status,display_phone_number,quality_rating`,
          {
            headers: { Authorization: `Bearer ${metaToken}` },
          }
        );
        metaStatus = metaRes.status;
        metaTest = await metaRes.json().catch(() => null);
        if (!metaRes.ok) {
          metaError = metaTest?.error?.message || `HTTP ${metaRes.status}`;
        }
      } catch (e: any) {
        metaError = `Falha de rede Meta: ${e.message}`;
      }
    }

    // 3. Testar Datafy API (legado) se token estiver presente
    let datafyMe: any = null;
    let datafyStatus: number | null = null;
    let datafyError: string | null = null;

    if (datafyToken) {
      try {
        const meRes = await fetch(`${DATAFY_HOST}/me`, {
          headers: { Authorization: `Bearer ${datafyToken}` },
        });
        datafyStatus = meRes.status;
        datafyMe = await meRes.json().catch(() => null);
        if (!meRes.ok) datafyError = datafyMe?.message || `HTTP ${meRes.status}`;
      } catch (e: any) {
        datafyError = `Falha de rede Datafy: ${e.message}`;
      }
    }

    return NextResponse.json({
      active_provider: metaToken && metaPhoneId ? 'meta' : (datafyToken ? 'datafy' : 'none'),
      meta_cloud_api: {
        configured: Boolean(metaToken && metaPhoneId),
        token_presente: Boolean(metaToken),
        token_prefix: metaToken ? metaToken.substring(0, 10) + '...[OCULTO]' : 'AUSENTE',
        phone_number_id: metaPhoneId || 'AUSENTE',
        business_account_id: metaWabaId || 'AUSENTE',
        api_version: metaVersion,
        endpoint_test: {
          http_status: metaStatus,
          error: metaError,
          data: metaTest,
        },
        diagnostico: metaStatus === 200
          ? '✅ Conexão oficial com a Meta Cloud API verificada com sucesso!'
          : (!metaToken || !metaPhoneId)
          ? '⚠️ Credenciais WHATSAPP_ACCESS_TOKEN ou WHATSAPP_PHONE_NUMBER_ID ausentes no ambiente.'
          : `❌ Erro ao validar número na Meta: ${metaError}`,
      },
      conexao_banco: conn
        ? {
            provider: conn.provider,
            phone_number_id: conn.phone_number_id,
            phone_number: conn.phone_number,
            display_name: conn.display_name,
            status: conn.status,
          }
        : 'Nenhuma conexão ativa salva no banco',
      datafy_legado: {
        configured: Boolean(datafyToken),
        token_prefix: datafyToken ? datafyToken.substring(0, 10) + '...[OCULTO]' : 'AUSENTE',
        http_status: datafyStatus,
        error: datafyError,
        data: datafyMe,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
