-- ==============================================================================
-- MAIA DISTRIBUIDORA — DESBLOQUEIO DE MÓDULOS E PESO VARIÁVEL DE PALETE
-- Adiciona coluna tara_palete_kg em simples_conferencia e libera todos os módulos
-- ==============================================================================

-- 1. Coluna de Peso Variável do Palete (kg) na Simples Conferência
ALTER TABLE public.simples_conferencia
  ADD COLUMN IF NOT EXISTS tara_palete_kg NUMERIC(8, 3) NOT NULL DEFAULT 0;

-- 2. Desbloqueio completo de todos os módulos operacionais em sistema_configuracoes
INSERT INTO public.sistema_configuracoes (chave, valor, updated_at)
VALUES (
  'modulos',
  '{
    "moduloEstoqueAtivo": true,
    "moduloPerdasAtivo": true,
    "moduloConferenciaAtivo": true,
    "moduloSeparacaoAtivo": true,
    "moduloExcelAtivo": true,
    "moduloCloudR2Ativo": true,
    "moduloSyncAgentAtivo": true
  }'::jsonb,
  NOW()
)
ON CONFLICT (chave) DO UPDATE
SET
  valor = '{
    "moduloEstoqueAtivo": true,
    "moduloPerdasAtivo": true,
    "moduloConferenciaAtivo": true,
    "moduloSeparacaoAtivo": true,
    "moduloExcelAtivo": true,
    "moduloCloudR2Ativo": true,
    "moduloSyncAgentAtivo": true
  }'::jsonb,
  updated_at = NOW();
