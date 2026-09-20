/**
 * Cliente oficial para WhatsApp Cloud API da Meta (Graph API v21.0)
 * 
 * Executa exclusivamente no lado do servidor (Node.js / Next.js API Routes).
 * NUNCA exponha WHATSAPP_ACCESS_TOKEN no cliente.
 */

export interface MetaSendTextMessageParams {
  to: string;
  text: string;
  previewUrl?: boolean;
}

export interface MetaTemplateComponentParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
}

export interface MetaTemplateComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: string;
  index?: number;
  parameters: MetaTemplateComponentParameter[];
}

export interface MetaSendTemplateMessageParams {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: MetaTemplateComponent[];
}

export interface MetaSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: number;
  errorSubcode?: number;
  rawResponse?: any;
}

/**
 * Normaliza número de telefone brasileiro para formato E.164 exigido pela Meta:
 * Formato esperado: DDI (55) + DDD (2 dígitos) + Número (8 ou 9 dígitos) sem espaços ou caracteres especiais.
 * Exemplo: (77) 99999-9999 -> 5577999999999
 */
export function normalizeBrazilianPhone(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = clean.substring(1);
  }
  if (!clean.startsWith('55') && (clean.length === 10 || clean.length === 11)) {
    clean = '55' + clean;
  }
  return clean;
}

/**
 * Valida se um número normalizado é um celular ou telefone brasileiro válido
 */
export function isValidBrazilianPhone(normalizedPhone: string): boolean {
  if (!normalizedPhone) return false;
  return /^55[1-9]{2}9?[0-9]{8}$/.test(normalizedPhone);
}

export const META_DEFAULT_PAYMENT_TEMPLATE = 'lembrete_mensalidade';

/**
 * Extrai a chave Pix configurada no texto do template personalizado do professor.
 * Procura por padrões como:
 * - "Chave PIX: sua-chave"
 * - "PIX: sua-chave"
 * - ou variável informada explicitamente
 */
export function extractPixKeyFromMessageTemplate(messageTemplate?: string, explicitPixKey?: string): string {
  if (explicitPixKey && explicitPixKey.trim()) {
    return explicitPixKey.trim();
  }

  if (!messageTemplate) {
    return '';
  }

  // Padrões comuns no editor do Reforço Pro:
  // "💰 *Chave PIX:* chave" ou "Chave PIX: chave" ou "PIX: chave"
  const patterns = [
    /(?:chave\s*pix|pix)\s*[:：*]\s*([^\n\r*]+)/i,
    /(?:chave\s*pix|pix)\s*[:：]\s*([^\n\r]+)/i,
  ];

  for (const regex of patterns) {
    const match = messageTemplate.match(regex);
    if (match && match[1]) {
      const extracted = match[1].replace(/[*_~`]/g, '').trim();
      // Não retornar se for apenas o marcador de exemplo "seu-pix-aqui"
      if (extracted) {
        return extracted;
      }
    }
  }

  return '';
}

/**
 * Retorna as credenciais da Meta configuradas no ambiente
 */
export function getMetaWhatsAppConfig() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || '';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';
  const paymentReminderTemplate = process.env.WHATSAPP_PAYMENT_REMINDER_TEMPLATE || META_DEFAULT_PAYMENT_TEMPLATE;

  return {
    token,
    phoneNumberId,
    businessAccountId,
    apiVersion,
    paymentReminderTemplate,
    isConfigured: Boolean(token && phoneNumberId),
  };
}

/**
 * Envia mensagem de texto simples via Meta WhatsApp Cloud API
 * ATENÇÃO: Texto livre só é aceito pela Meta se houver uma janela de atendimento de 24h aberta
 * iniciada pelo usuário. Para disparos ativos de cobrança, utilize sendMetaWhatsAppTemplate.
 */
export async function sendMetaWhatsAppText(params: MetaSendTextMessageParams): Promise<MetaSendResult> {
  const config = getMetaWhatsAppConfig();

  if (!config.token) {
    return {
      success: false,
      error: 'WHATSAPP_ACCESS_TOKEN não configurado no servidor.',
    };
  }

  if (!config.phoneNumberId) {
    return {
      success: false,
      error: 'WHATSAPP_PHONE_NUMBER_ID não configurado no servidor.',
    };
  }

  const normalizedTo = normalizeBrazilianPhone(params.to);
  if (!isValidBrazilianPhone(normalizedTo)) {
    return {
      success: false,
      error: `Número de telefone destinatário inválido: ${params.to}. Informe DDD e número completos.`,
    };
  }

  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizedTo,
    type: 'text',
    text: {
      preview_url: params.previewUrl ?? false,
      body: params.text,
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorObj = data?.error;
      const errorMsg = errorObj?.message || `Erro HTTP ${response.status} da Meta Cloud API`;
      const errorCode = errorObj?.code;
      const errorSubcode = errorObj?.error_subcode;

      console.error(`[Meta WhatsApp] Falha ao enviar texto: HTTP ${response.status}`, {
        code: errorCode,
        subcode: errorSubcode,
        message: errorMsg,
        fbtrace_id: errorObj?.fbtrace_id,
      });

      return {
        success: false,
        error: errorMsg,
        errorCode,
        errorSubcode,
        rawResponse: data,
      };
    }

    const messageId = data?.messages?.[0]?.id;
    return {
      success: true,
      messageId,
      rawResponse: data,
    };
  } catch (err: any) {
    console.error('[Meta WhatsApp] Erro de rede/conexão:', err.message);
    return {
      success: false,
      error: err.message || 'Falha de comunicação com a API da Meta.',
    };
  }
}

/**
 * Envia mensagem baseada em template oficial aprovado na Meta Cloud API.
 * Obrigatório para mensagens de saída ativas (como lembretes de cobrança automática fora da janela de 24h).
 */
export async function sendMetaWhatsAppTemplate(params: MetaSendTemplateMessageParams): Promise<MetaSendResult> {
  const config = getMetaWhatsAppConfig();

  if (!config.token) {
    return {
      success: false,
      error: 'WHATSAPP_ACCESS_TOKEN não configurado no servidor.',
    };
  }

  if (!config.phoneNumberId) {
    return {
      success: false,
      error: 'WHATSAPP_PHONE_NUMBER_ID não configurado no servidor.',
    };
  }

  const normalizedTo = normalizeBrazilianPhone(params.to);
  if (!isValidBrazilianPhone(normalizedTo)) {
    return {
      success: false,
      error: `Número de telefone destinatário inválido: ${params.to}. Informe DDD e número completos.`,
    };
  }

  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

  const payload = {
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
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorObj = data?.error;
      const errorMsg = errorObj?.message || `Erro HTTP ${response.status} ao enviar template Meta`;
      const errorCode = errorObj?.code;
      const errorSubcode = errorObj?.error_subcode;

      console.error(`[Meta WhatsApp] Falha ao enviar template ${params.templateName}: HTTP ${response.status}`, {
        code: errorCode,
        subcode: errorSubcode,
        message: errorMsg,
        fbtrace_id: errorObj?.fbtrace_id,
      });

      return {
        success: false,
        error: errorMsg,
        errorCode,
        errorSubcode,
        rawResponse: data,
      };
    }

    const messageId = data?.messages?.[0]?.id;
    return {
      success: true,
      messageId,
      rawResponse: data,
    };
  } catch (err: any) {
    console.error('[Meta WhatsApp] Erro de rede ao enviar template:', err.message);
    return {
      success: false,
      error: err.message || 'Falha de comunicação com a API da Meta ao enviar template.',
    };
  }
}
