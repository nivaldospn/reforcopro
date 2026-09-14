# Integração WhatsApp Business via Datafy API — Reforço Pro

Este documento descreve a arquitetura, configuração de credenciais, execução de rotinas automáticas (cron) e boas práticas de integração do WhatsApp no SaaS multiusuário **Reforço Pro** utilizando a API oficial da **Datafy / Meta Cloud API**.

---

## 1. Visão Geral da Arquitetura

O sistema opera no modelo multi-tenant isolado por usuário (`auth.uid()`), onde cada professor conecta seu próprio número de WhatsApp Business pela Datafy.

```
+-------------------------------------------------------------------------------+
|                                  Reforço Pro                                  |
|                                                                               |
|  [ Frontend / Configurações ]  <--->  [ Supabase Database + RLS ]             |
|       - Conectar WhatsApp                    - whatsapp_connections           |
|       - Template & Horário                   - whatsapp_settings              |
|       - Histórico e Filtros                  - whatsapp_message_logs          |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                       Supabase Edge Functions (Deno)                          |
|                                                                               |
|  1. process-payment-reminders (Cron Diário às 08:00 BRT)                       |
|     - Busca mensalidades com vencimento HOJE (America/Sao_Paulo)               |
|     - Proteção anti-duplicidade no mesmo dia                                   |
|     - Normaliza telefone para formato E.164 (55 + DDD + 9 dígitos)             |
|                                                                               |
|  2. send-whatsapp-message                                                     |
|     - Disparo manual pelo botão da listagem de pagamentos                     |
|     - Envio de mensagem de teste para validação de entrega                    |
|     - Tokens e segredos protegidos 100% no backend                            |
|                                                                               |
|  3. datafy-webhook                                                            |
|     - Recebe callbacks de status (sent, delivered, read, failed)               |
|     - Atualiza whatsapp_message_logs em tempo real                            |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                             Datafy / Meta Cloud API                           |
|       - Endpoint: POST https://api.datafy.com.br/v1/{PHONE_NUMBER_ID}/messages|
+-------------------------------------------------------------------------------+
```

---

## 2. Variáveis de Ambiente & Secrets

As credenciais sensíveis **NUNCA** devem ser colocadas no frontend ou versionadas no repositório.

### No Supabase (Dashboard -> Project Settings -> Edge Functions Secrets):

| Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `DATAFY_API_TOKEN` | Token de autenticação da Datafy (Bearer) | `Bearer dtf_sec_...` |
| `DATAFY_API_BASE_URL` | URL base da Datafy API (padrão v1) | `https://api.datafy.com.br/v1` |
| `DATAFY_WEBHOOK_VERIFY_TOKEN`| Token de validação do handshake Webhook | `reforcopro_webhook_token_secret` |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço interna do Supabase | `eyJhbGciOi...` |
| `SUPABASE_URL` | URL do projeto Supabase | `https://xyz.supabase.co` |

---

## 3. Como Conectar um Número de WhatsApp Business

1. No menu lateral, acesse **Configurações -> WhatsApp**.
2. Clique na sub-aba **Conexão Datafy**.
3. Clique em **Conectar WhatsApp**.
4. Insira os dados fornecidos no painel da Datafy:
   - **Phone Number ID**: Identificador único do número atribuído pela Meta/Datafy.
   - **Número do WhatsApp**: Telefone com DDD (ex: `(77) 99999-9999`).
   - **Nome de Exibição**: Nome da escola ou professor que aparece aos responsáveis.
5. Clique em **Salvar e Conectar**. O status mudará imediatamente para **🟢 Conectado**.

---

## 4. Configuração dos Lembretes Automáticos

1. Na aba **Lembretes Automáticos**:
   - Marque a opção **Ativar lembretes automáticos**.
   - Defina o horário de disparo (ex: `08:00`).
   - Personalize a mensagem utilizando as tags dinâmicas:
     - `{responsavel}`: Primeiro nome do responsável
     - `{aluno}`: Nome do aluno
     - `{valor}`: Valor formatado em reais (ex: `R$ 150,00`)
     - `{vencimento}`: Data no formato `dd/mm/aaaa`
     - `{turma}`: Nome da turma
     - `{nome_escola}`: Nome da escola/professor
2. Clique em **Salvar Configurações**.

---

## 5. Agendamento Automático (Cron Diário no Supabase)

Para acionar a função `process-payment-reminders` todos os dias às 08:00 (fuso de Brasília):

No Supabase SQL Editor, execute o agendamento via extensão `pg_cron` e `pg_net`:

```sql
-- Ativar extensões necessárias (se ainda não ativas)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Agendar para rodar diariamente às 08:00 horário de Brasília (11:00 UTC)
SELECT cron.schedule(
  'process-payment-reminders-daily',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<SEU-PROJETO>.supabase.co/functions/v1/process-payment-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || '<SUPABASE_SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

> **Nota de Independência**: A rotina automática roda diretamente na nuvem do Supabase. O professor **não** precisa estar com o computador ligado nem com a aplicação aberta.

---

## 6. Configuração do Webhook da Datafy

1. No painel da Datafy, configure a URL de Callback apontando para:
   ```
   https://<SEU-PROJETO>.supabase.co/functions/v1/datafy-webhook
   ```
2. No campo de token de verificação, utilize o mesmo valor cadastrado no secret `DATAFY_WEBHOOK_VERIFY_TOKEN`.
3. Assine os eventos de mensagens e status (`messages`, `message_deliveries`, `message_reads`).
4. Quando o responsável receber ou ler a mensagem, o log no Reforço Pro será atualizado automaticamente para **🟢 Entregue** ou **🟢 Lido**.

---

## 7. Como Fazer o Primeiro Teste Real

1. Vá em **Configurações -> WhatsApp -> Conexão Datafy**.
2. Na seção **Enviar Mensagem de Teste**, digite seu próprio celular com DDD.
3. Clique em **Enviar Teste**.
4. Você deverá receber a mensagem:
   > "Olá! 👋 Esta é uma mensagem de teste do WhatsApp do Reforço Pro. A integração está funcionando corretamente."
5. Acesse **Pagamentos**, selecione uma mensalidade pendente e clique no ícone do WhatsApp.
6. Confira a prévia gerada e clique em **Enviar pela Datafy**.
7. Verifique o registro na aba **Configurações -> WhatsApp -> Histórico**.

---

## 8. Diagnóstico de Erros Comuns

| Sintoma | Causa Mais Provável | Solução |
| :--- | :--- | :--- |
| `WhatsApp não conectado` | Professor não configurou o Phone Number ID | Preencha os dados em Configurações -> WhatsApp |
| `Telefone inválido` | Responsável cadastrado com telefone sem DDD | Edite o responsável em `/guardians` e insira o DDD completo |
| `HTTP 401 Unauthorized` | Token da Datafy inválido ou expirado | Atualize o secret `DATAFY_API_TOKEN` no Supabase |
| `Tentativa de envio duplicado` | Mensalidade já recebeu lembrete na mesma data | O sistema protege contra duplicidade; envie manualmente caso necessário |

---

## 9. Como Adicionar Novos Provedores Futuramente

A tabela `whatsapp_connections` possui o campo `provider TEXT NOT NULL DEFAULT 'datafy'`.
Para suportar novos provedores (ex: Z-API, Evolution API, Twilio):
1. Adicione um novo adapter na pasta `lib/datafy/` ou crie `lib/whatsapp/adapters/`.
2. Na Edge Function `send-whatsapp-message`, adicione o switch baseado no campo `connection.provider`.
