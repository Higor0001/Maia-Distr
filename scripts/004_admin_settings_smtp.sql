-- ============================================================================
-- Migration: 004_admin_settings_smtp.sql
-- Módulo de Configurações Administrativas: SMTP, Telegram, SMB e Parâmetros
-- ============================================================================

-- 1. Tabela de Configurações do Sistema
CREATE TABLE IF NOT EXISTS public.sistema_configuracoes (
  chave TEXT PRIMARY KEY,
  valor JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

-- 2. Segurança e Row Level Security (RLS)
-- O backend usa a service_role_key do Supabase para leitura e gravação segura.
ALTER TABLE public.sistema_configuracoes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sistema_configuracoes FROM anon, authenticated;

-- 3. Índices de busca rápida
CREATE INDEX IF NOT EXISTS sistema_configuracoes_updated_at_idx 
  ON public.sistema_configuracoes (updated_at DESC);

-- 4. Inserção de configurações padrão caso ainda não existam
INSERT INTO public.sistema_configuracoes (chave, valor, updated_at, updated_by)
VALUES 
  (
    'smtp',
    '{
      "enabled": false,
      "host": "smtp.gmail.com",
      "port": 587,
      "secure": false,
      "user": "",
      "pass": "",
      "fromName": "Triagem Filial - Hortigranjeiros",
      "fromEmail": "",
      "recipientsEstoqueFilial": [],
      "recipientsEstoqueMatriz": [],
      "recipientsPerdas": [],
      "autoSendEstoque": false,
      "autoSendPerdas": false
    }'::jsonb,
    NOW(),
    'sistema'
  ),
  (
    'telegram',
    '{
      "botToken": "",
      "chatIdFilial": "",
      "chatIdMatriz": "",
      "autoSend": true
    }'::jsonb,
    NOW(),
    'sistema'
  ),
  (
    'smb',
    '{
      "enabled": false,
      "sharePath": "\\\\servidor\\hortifruti\\relatorios",
      "username": "",
      "domain": "",
      "saveEstoquePdf": false,
      "savePerdasPdf": false
    }'::jsonb,
    NOW(),
    'sistema'
  ),
  (
    'geral',
    '{
      "empresaNome": "Maia Distribuidora",
      "unidadeNome": "Filial Hortigranjeiros",
      "notificacoesAtivas": true
    }'::jsonb,
    NOW(),
    'sistema'
  )
ON CONFLICT (chave) DO NOTHING;
