import {
  SendWhatsAppTextMessageParams,
  SendWhatsAppTemplateParams,
  DatafySendResponse,
} from './types';

/**
 * Normaliza número de telefone brasileiro para formato E.164 exigido pela Meta/Datafy:
 * Exemplo: (11) 98765-4321 -> 5511987654321
 * Remove caracteres especiais e valida formato de celular/fixo do Brasil.
 */
export function normalizeBrazilianPhone(phone: string): string {
  if (!phone) return '';
  // Remove tudo que não for dígito
  let clean = phone.replace(/\D/g, '');

  // Se começar com 0, remove
  if (clean.startsWith('0')) {
    clean = clean.substring(1);
  }

  // Se não tiver o DDI 55 do Brasil
  if (!clean.startsWith('55')) {
    // Celular no Brasil geralmente tem 10 (fixo/celular antigo) ou 11 dígitos (DDD + 9 dígitos)
    if (clean.length === 10 || clean.length === 11) {
      clean = '55' + clean;
    }
  }

  return clean;
}

/**
 * Valida se um número normalizado é um telefone celular brasileiro válido
 */
export function isValidBrazilianPhone(normalizedPhone: string): boolean {
  if (!normalizedPhone) return false;
  // Deve começar com 55 e ter 12 ou 13 dígitos no total
  return /^55[1-9]{2}9?[0-9]{8}$/.test(normalizedPhone);
}

/**
 * Preenche o template da mensagem com as variáveis dinâmicas
 */
export function formatReminderMessage(
  template: string,
  variables: {
    responsavel: string;
    aluno: string;
    valor: string | number;
    vencimento: string;
    turma?: string;
    nome_escola?: string;
    chave_pix?: string;
  }
): string {
  let formatted = template;

  const formattedValor =
    typeof variables.valor === 'number'
      ? variables.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : variables.valor;

  formatted = formatted.replace(/{responsavel}/g, variables.responsavel || 'Responsável');
  formatted = formatted.replace(/{aluno}/g, variables.aluno || 'Aluno');
  formatted = formatted.replace(/{valor}/g, formattedValor || 'R$ 0,00');
  formatted = formatted.replace(/{vencimento}/g, variables.vencimento || '');
  formatted = formatted.replace(/{turma}/g, variables.turma || 'Turma');
  formatted = formatted.replace(/{nome_escola}/g, variables.nome_escola || 'Reforço Pro');
  formatted = formatted.replace(/{chave_pix}/g, variables.chave_pix || '');
  formatted = formatted.replace(/{pix}/g, variables.chave_pix || '');

  return formatted;
}

/**
 * Envia mensagem de texto via Datafy API / Meta Cloud API padrão
 * Executado preferencialmente no backend / Edge Functions para manter credenciais protegidas.
 */
export async function sendWhatsAppText(
  params: SendWhatsAppTextMessageParams
): Promise<DatafySendResponse> {
  const baseUrl = (params.baseUrl || process.env.DATAFY_API_BASE_URL || 'https://cloud.datafyapi.com.br/v1').replace(/\/$/, '');
  const token = params.token || process.env.DATAFY_API_TOKEN;

  if (!token) {
    return {
      success: false,
      error: 'Token da API Datafy não configurado.',
    };
  }

  if (!params.phoneNumberId) {
    return {
      success: false,
      error: 'Identificador do número (PHONE_NUMBER_ID) não configurado.',
    };
  }

  const normalizedTo = normalizeBrazilianPhone(params.to);
  if (!isValidBrazilianPhone(normalizedTo)) {
    return {
      success: false,
      error: `Número de telefone destinatário inválido: ${params.to}`,
    };
  }

  try {
    const url = `${baseUrl}/${params.phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedTo,
        type: 'text',
        text: {
          preview_url: false,
          body: params.text,
        },
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data?.error?.message || data?.message || `Erro HTTP ${response.status} da API Datafy`;
      return {
        success: false,
        error: errorMsg,
        rawResponse: data,
      };
    }

    const messageId = data?.messages?.[0]?.id || data?.id;
    return {
      success: true,
      messageId,
      rawResponse: data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Falha de comunicação com a Datafy API.',
    };
  }
}

/**
 * Envia mensagem de Template aprovado da Meta via Datafy API
 */
export async function sendWhatsAppTemplate(
  params: SendWhatsAppTemplateParams
): Promise<DatafySendResponse> {
  const baseUrl = (params.baseUrl || process.env.DATAFY_API_BASE_URL || 'https://cloud.datafyapi.com.br/v1').replace(/\/$/, '');
  const token = params.token || process.env.DATAFY_API_TOKEN;

  if (!token) {
    return {
      success: false,
      error: 'Token da API Datafy não configurado.',
    };
  }

  const normalizedTo = normalizeBrazilianPhone(params.to);
  if (!isValidBrazilianPhone(normalizedTo)) {
    return {
      success: false,
      error: `Número de telefone destinatário inválido: ${params.to}`,
    };
  }

  try {
    const url = `${baseUrl}/${params.phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizedTo,
        type: 'template',
        template: {
          name: params.templateName,
          language: {
            code: params.languageCode || 'pt_BR',
          },
          components: params.components || [],
        },
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: data?.error?.message || `Erro HTTP ${response.status} ao enviar template Datafy`,
        rawResponse: data,
      };
    }

    return {
      success: true,
      messageId: data?.messages?.[0]?.id,
      rawResponse: data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Falha de conexão com a Datafy API.',
    };
  }
}
