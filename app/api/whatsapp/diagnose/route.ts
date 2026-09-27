import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/whatsapp/diagnose
 *
 * Diagnóstico completo da integração com a Meta WhatsApp Cloud API.
 * Exige autenticação válida via Supabase (Bearer token do usuário logado).
 *
 * Executa 4 testes sequenciais SEM enviar mensagens e SEM modificar o banco:
 *   [TESTE 1] Presença das variáveis de ambiente no servidor
 *   [TESTE 2] GET /{PHONE_NUMBER_ID} — valida token + acesso ao número
 *   [TESTE 3] GET /{WABA_ID} — valida acesso à conta de negócios (opcional)
 *   [TESTE 4] GET /{WABA_ID}/message_templates — verifica template aprovado (opcional)
 *
 * SEGURANÇA:
 *   - Token WHATSAPP_ACCESS_TOKEN nunca aparece na resposta nem nos logs.
 *   - Apenas confirma presença (boolean) do token no ambiente.
 *   - Nenhuma escrita no banco de dados.
 *   - Nenhuma mensagem enviada.
 */
export async function GET(req: Request) {
  try {
    // ── 1. Autenticação: exige Bearer token válido do usuário Supabase ──────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Não autorizado. Informe um Bearer token válido no cabeçalho Authorization.' },
        { status: 401 }
      );
    }

    const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  || '';
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnon) {
      return NextResponse.json({ error: 'Configuração Supabase ausente no servidor.' }, { status: 500 });
    }

    // Valida o token do usuário via Supabase (mesmo padrão de send/route.ts e process-reminders/route.ts)
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado. Faça login no Reforço Pro e tente novamente.' },
        { status: 401 }
      );
    }

    // ── 2. Leitura das variáveis Meta (servidor apenas — nunca retornadas) ──
    const metaToken   = process.env.WHATSAPP_ACCESS_TOKEN        || '';
    const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID     || '';
    const metaWabaId  = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
    const metaVersion = process.env.WHATSAPP_API_VERSION         || 'v22.0';
    const baseUrl     = `https://graph.facebook.com/${metaVersion}`;

    // ── [TESTE 1] Presença das variáveis de ambiente ─────────────────────────
    const teste1 = {
      descricao: '[TESTE 1] Variáveis de ambiente no servidor (Vercel)',
      WHATSAPP_ACCESS_TOKEN: metaToken
        ? '✅ Presente'
        : '❌ AUSENTE — configure WHATSAPP_ACCESS_TOKEN nas Environment Variables da Vercel',
      WHATSAPP_PHONE_NUMBER_ID: metaPhoneId
        ? `✅ ${metaPhoneId}`
        : '❌ AUSENTE — configure WHATSAPP_PHONE_NUMBER_ID nas Environment Variables da Vercel',
      WHATSAPP_BUSINESS_ACCOUNT_ID: metaWabaId
        ? `✅ ${metaWabaId}`
        : '⚠️ Ausente (necessário para TESTE 3 e TESTE 4)',
      WHATSAPP_API_VERSION: `✅ ${metaVersion}`,
      endpoint_mensagens_que_sera_usado: metaPhoneId
        ? `POST ${baseUrl}/${metaPhoneId}/messages`
        : '❌ Não pode ser construído — WHATSAPP_PHONE_NUMBER_ID ausente',
    };

    // ── [TESTE 2] GET /{PHONE_NUMBER_ID} — valida token e acesso ao número ──
    let teste2: Record<string, any> = {
      descricao: '[TESTE 2] GET /{PHONE_NUMBER_ID} — valida se o token acessa o número',
      url_testada: metaPhoneId && metaToken
        ? `${baseUrl}/${metaPhoneId}?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating`
        : 'Skipped',
    };

    if (metaToken && metaPhoneId) {
      try {
        const res = await fetch(
          `${baseUrl}/${metaPhoneId}?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating`,
          {
            method: 'GET',
            headers: { Authorization: `Bearer ${metaToken}` },
          }
        );
        const body: any = await res.json().catch(() => ({}));

        if (res.ok) {
          teste2.http_status = res.status;
          teste2.resultado = '✅ Token consegue acessar o Phone Number ID com sucesso';
          teste2.dados_numero = {
            id: body.id,
            display_phone_number: body.display_phone_number,
            verified_name: body.verified_name,
            code_verification_status: body.code_verification_status,
            quality_rating: body.quality_rating,
          };
          teste2.proximo_passo =
            'Token e Phone Number ID estão corretos. Se o POST /messages ainda falha, ' +
            'verifique TESTE 3 (WABA) e TESTE 4 (template aprovado).';
        } else {
          const err = body?.error ?? {};
          teste2.http_status = res.status;
          teste2.resultado = '❌ Falha ao acessar o Phone Number ID na Meta';
          // Retorna dados de erro da Meta sem incluir o token
          teste2.erro_meta = {
            code: err.code ?? null,
            subcode: err.error_subcode ?? null,
            message: err.message ?? null,
            type: err.type ?? null,
            fbtrace_id: err.fbtrace_id ?? null,
          };

          if (err.code === 100 && err.error_subcode === 33) {
            teste2.diagnostico_causa =
              'CAUSA CONFIRMADA (code 100 / subcode 33): O token não tem permissão para ' +
              'acessar este Phone Number ID, ou o número não pertence à conta de negócios ' +
              'vinculada ao token.';
            teste2.acoes_recomendadas = [
              '1. No Meta Business Manager → Configurações → Usuários do Sistema: confirme que o System User tem papel "Admin".',
              '2. Em "Ativos" do System User, verifique se o WhatsApp Business Account (WABA) está listado com permissão "Gerenciar".',
              '3. Regenere o token de acesso permanente do System User nessa mesma tela.',
              '4. Confirme que o App usado para gerar o token é o mesmo vinculado ao WABA em "WhatsApp → Configuração" no Meta for Developers.',
              `5. Valide manualmente no Graph API Explorer: GET ${baseUrl}/${metaPhoneId} com o token atual.`,
            ];
          } else if (err.code === 190) {
            teste2.diagnostico_causa =
              'CAUSA: Token expirado ou inválido (code 190). Gere um novo token de acesso permanente no Meta Business Manager → Usuários do Sistema.';
          } else if (err.code === 10) {
            teste2.diagnostico_causa =
              'CAUSA: Permissões insuficientes (code 10). O token não possui os escopos ' +
              'whatsapp_business_messaging e whatsapp_business_management.';
          } else {
            teste2.diagnostico_causa =
              `Erro inesperado da Meta (code ${err.code ?? '?'}). ` +
              `Consulte o fbtrace_id no suporte oficial: https://developers.facebook.com/support/`;
          }
        }
      } catch (e: any) {
        teste2.http_status = null;
        teste2.resultado = '❌ Falha de rede ao contactar graph.facebook.com';
        teste2.erro_rede = e.message;
      }
    } else {
      teste2.resultado = '⏭️ Skipped — WHATSAPP_ACCESS_TOKEN ou WHATSAPP_PHONE_NUMBER_ID ausentes (ver TESTE 1)';
    }

    // ── [TESTE 3] GET /{WABA_ID} — valida acesso à conta de negócios ────────
    let teste3: Record<string, any> = {
      descricao: '[TESTE 3] GET /{WABA_ID} — valida acesso à conta WhatsApp Business (WABA)',
      url_testada: metaToken && metaWabaId
        ? `${baseUrl}/${metaWabaId}?fields=id,name,currency,timezone_id,message_template_namespace`
        : 'Skipped',
    };

    if (metaToken && metaWabaId) {
      try {
        const res = await fetch(
          `${baseUrl}/${metaWabaId}?fields=id,name,currency,timezone_id,message_template_namespace`,
          {
            method: 'GET',
            headers: { Authorization: `Bearer ${metaToken}` },
          }
        );
        const body: any = await res.json().catch(() => ({}));

        if (res.ok) {
          teste3.http_status = res.status;
          teste3.resultado = '✅ Token consegue acessar o WABA com sucesso';
          teste3.dados_waba = {
            id: body.id,
            name: body.name,
            currency: body.currency,
            timezone_id: body.timezone_id,
            message_template_namespace: body.message_template_namespace,
          };
        } else {
          const err = body?.error ?? {};
          teste3.http_status = res.status;
          teste3.resultado = '❌ Falha ao acessar o WABA';
          teste3.erro_meta = {
            code: err.code ?? null,
            subcode: err.error_subcode ?? null,
            message: err.message ?? null,
            fbtrace_id: err.fbtrace_id ?? null,
          };
        }
      } catch (e: any) {
        teste3.http_status = null;
        teste3.resultado = '❌ Falha de rede ao contactar graph.facebook.com';
        teste3.erro_rede = e.message;
      }
    } else if (!metaWabaId) {
      teste3.resultado = '⏭️ Skipped — WHATSAPP_BUSINESS_ACCOUNT_ID não configurado na Vercel';
    } else {
      teste3.resultado = '⏭️ Skipped — WHATSAPP_ACCESS_TOKEN ausente (ver TESTE 1)';
    }

    // ── [TESTE 4] GET /{WABA_ID}/message_templates — verifica template ───────
    let teste4: Record<string, any> = {
      descricao: '[TESTE 4] GET /{WABA_ID}/message_templates — verifica template "lembrete_mensalidade"',
      url_testada: metaToken && metaWabaId
        ? `${baseUrl}/${metaWabaId}/message_templates?fields=name,status,language&limit=30`
        : 'Skipped',
    };

    if (metaToken && metaWabaId) {
      try {
        const res = await fetch(
          `${baseUrl}/${metaWabaId}/message_templates?fields=name,status,language&limit=30`,
          {
            method: 'GET',
            headers: { Authorization: `Bearer ${metaToken}` },
          }
        );
        const body: any = await res.json().catch(() => ({}));

        if (res.ok) {
          const templates: any[] = body?.data ?? [];
          const lembreteTemplate = templates.find((t: any) => t.name === 'lembrete_mensalidade');

          teste4.http_status = res.status;
          teste4.resultado = '✅ Acesso à lista de templates bem-sucedido';
          teste4.total_templates = templates.length;
          teste4.template_lembrete_mensalidade = lembreteTemplate
            ? {
                encontrado: true,
                status: lembreteTemplate.status,
                language: lembreteTemplate.language,
                diagnostico: lembreteTemplate.status === 'APPROVED'
                  ? '✅ Template aprovado e pronto para envio'
                  : `⚠️ Template com status "${lembreteTemplate.status}" — deve ser APPROVED para envio`,
              }
            : {
                encontrado: false,
                diagnostico:
                  '❌ Template "lembrete_mensalidade" NÃO encontrado neste WABA. ' +
                  'Verifique se foi criado e aprovado na conta correta do WhatsApp Business Manager.',
              };
          teste4.todos_templates = templates.map((t: any) => ({
            name: t.name,
            status: t.status,
            language: t.language,
          }));
        } else {
          const err = body?.error ?? {};
          teste4.http_status = res.status;
          teste4.resultado = '❌ Falha ao listar templates';
          teste4.erro_meta = {
            code: err.code ?? null,
            subcode: err.error_subcode ?? null,
            message: err.message ?? null,
            fbtrace_id: err.fbtrace_id ?? null,
          };
        }
      } catch (e: any) {
        teste4.http_status = null;
        teste4.resultado = '❌ Falha de rede';
        teste4.erro_rede = e.message;
      }
    } else {
      teste4.resultado =
        '⏭️ Skipped — WHATSAPP_ACCESS_TOKEN ou WHATSAPP_BUSINESS_ACCOUNT_ID ausentes';
    }

    // ── Consistência do banco vs. variável de ambiente ───────────────────────
    // Leitura apenas (SELECT), sem nenhuma escrita
    const { data: conn } = await userClient
      .from('whatsapp_connections')
      .select('id, phone_number_id, phone_number, display_name, status, provider')
      .eq('user_id', user.id)
      .in('provider', ['meta', 'datafy'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const banco = conn
      ? {
          provider: conn.provider,
          phone_number_id_no_banco: conn.phone_number_id ?? 'Não definido',
          phone_number: conn.phone_number ?? 'Não definido',
          display_name: conn.display_name ?? 'Não definido',
          status: conn.status,
          consistencia: conn.phone_number_id && metaPhoneId && conn.phone_number_id !== metaPhoneId
            ? `⚠️ INCONSISTÊNCIA: phone_number_id no banco (${conn.phone_number_id}) é DIFERENTE da variável WHATSAPP_PHONE_NUMBER_ID (${metaPhoneId}). Isso pode causar falhas silenciosas.`
            : '✅ Consistente com a variável de ambiente (ou banco sem registro)',
        }
      : { info: 'Nenhuma conexão ativa na tabela whatsapp_connections para este usuário.' };

    // ── Resumo executivo ─────────────────────────────────────────────────────
    const teste2Ok = teste2.http_status === 200;
    const teste3Ok = teste3.http_status === 200;
    const teste4Ok = teste4.http_status === 200;

    let resumo: string;
    if (!metaToken || !metaPhoneId) {
      resumo =
        '🔴 BLOQUEIO CRÍTICO: Variáveis WHATSAPP_ACCESS_TOKEN e/ou WHATSAPP_PHONE_NUMBER_ID ' +
        'não estão configuradas na Vercel. Nenhum envio é possível.';
    } else if (!teste2Ok) {
      resumo =
        `🔴 CAUSA DO ERRO 400: O token configurado na Vercel não consegue acessar ` +
        `o Phone Number ID ${metaPhoneId}. Veja "diagnostico_causa" e "acoes_recomendadas" no teste2.`;
    } else if (metaWabaId && !teste3Ok) {
      resumo =
        '🟡 Token acessa o número (TESTE 2 OK), mas falha ao acessar o WABA (TESTE 3). ' +
        'Verifique as permissões do System User no Meta Business Manager.';
    } else if (metaWabaId && teste3Ok && !teste4Ok) {
      resumo =
        '🟡 Token e WABA acessíveis, mas falha ao listar templates (TESTE 4). ' +
        'Verifique se o template "lembrete_mensalidade" existe e está APPROVED neste WABA.';
    } else if (teste2Ok) {
      resumo =
        '🟢 Token e Phone Number ID estão corretos e acessíveis. ' +
        'Se o POST /messages ainda falha, inspecione os logs da Vercel após o próximo envio ' +
        'para verificar o payload exato enviado e a resposta completa da Meta.';
    } else {
      resumo = '⚪ Diagnóstico incompleto — configure as variáveis e re-execute.';
    }

    return NextResponse.json({
      diagnostico_executado_em: new Date().toISOString(),
      usuario_autenticado: user.email ?? user.id,
      resumo,
      teste1,
      teste2,
      teste3,
      teste4,
      banco,
    });
  } catch (err: any) {
    // Log interno sem expor detalhes sensíveis na resposta
    console.error('[Diagnose] Erro interno no endpoint de diagnóstico:', err.message);
    return NextResponse.json(
      { error: 'Erro interno no servidor ao executar diagnóstico.' },
      { status: 500 }
    );
  }
}
