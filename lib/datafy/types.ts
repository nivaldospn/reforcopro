export type WhatsAppConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WhatsAppConnection {
  id: string;
  user_id: string;
  provider: 'datafy' | string;
  phone_number_id?: string;
  waba_id?: string;
  phone_number?: string;
  display_name?: string;
  status: WhatsAppConnectionStatus;
  connected_at?: string;
  updated_at?: string;
  last_error?: string;
  created_at: string;
}

export interface WhatsAppSettings {
  id: string;
  user_id: string;
  enabled: boolean;
  reminder_time: string;
  message_template: string;
  created_at: string;
  updated_at: string;
}

export type WhatsAppMessageType = 'payment_reminder' | 'manual_payment_reminder' | 'test_message';
export type WhatsAppMessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface WhatsAppMessageLog {
  id: string;
  user_id: string;
  whatsapp_connection_id?: string;
  mensalidade_id?: string;
  aluno_id?: string;
  responsavel_id?: string;
  phone: string;
  message_type: WhatsAppMessageType;
  message_content: string;
  provider: string;
  provider_message_id?: string;
  status: WhatsAppMessageStatus;
  error_message?: string;
  sent_at?: string;
  created_at: string;
  // Joins opcionais para exibição no frontend
  student_name?: string;
  guardian_name?: string;
}

export interface SendWhatsAppTextMessageParams {
  to: string;
  text: string;
  phoneNumberId: string;
  token?: string;
  baseUrl?: string;
}

export interface SendWhatsAppTemplateParams {
  to: string;
  templateName: string;
  languageCode: string;
  components?: any[];
  phoneNumberId: string;
  token?: string;
  baseUrl?: string;
}

export interface DatafySendResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  rawResponse?: any;
}
