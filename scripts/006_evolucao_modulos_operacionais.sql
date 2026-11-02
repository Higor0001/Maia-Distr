-- ============================================================================
-- Migration: 006_evolucao_modulos_operacionais.sql
-- Módulos: Simples Conferência, Carrinhos/Caixas, Pedidos de Separação e Parâmetros
-- ============================================================================

-- 1. Cadastro de Carrinhos e Taras
CREATE TABLE IF NOT EXISTS public.carrinhos_tara (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  tara_kg NUMERIC(6, 3) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserção de carrinhos padrão conforme especificação (25.5 kg, 19 kg, 27 kg)
INSERT INTO public.carrinhos_tara (id, nome, tara_kg, ativo)
VALUES 
  ('carrinho-1', 'Carrinho 1', 25.500, TRUE),
  ('carrinho-2', 'Carrinho 2', 19.000, TRUE),
  ('carrinho-3', 'Carrinho 3', 27.000, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 2. Cadastro de Caixas e Taras
CREATE TABLE IF NOT EXISTS public.caixas_tara (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  tara_kg NUMERIC(6, 3) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserção de caixas padrão conforme especificação (2.5 kg, 2 kg)
INSERT INTO public.caixas_tara (id, nome, tara_kg, ativo)
VALUES 
  ('caixa-1', 'Caixa 1', 2.500, TRUE),
  ('caixa-2', 'Caixa 2', 2.000, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. Módulo de Simples Conferência (Independente de estoque e de perdas)
CREATE TABLE IF NOT EXISTS public.simples_conferencia (
  id TEXT PRIMARY KEY,
  produto_reduzido TEXT,
  produto_nome TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  peso_bruto NUMERIC(10, 3) NOT NULL,
  tipo_carrinho_id TEXT,
  tipo_carrinho_nome TEXT,
  tara_carrinho_kg NUMERIC(6, 3) NOT NULL DEFAULT 0,
  tipo_caixa_id TEXT,
  tipo_caixa_nome TEXT,
  tara_caixa_kg NUMERIC(6, 3) NOT NULL DEFAULT 0,
  peso_liquido NUMERIC(10, 3) NOT NULL,
  observacao TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS simples_conferencia_created_at_idx 
  ON public.simples_conferencia (created_at DESC);
CREATE INDEX IF NOT EXISTS simples_conferencia_produto_idx 
  ON public.simples_conferencia (produto_nome);
CREATE INDEX IF NOT EXISTS simples_conferencia_responsavel_idx 
  ON public.simples_conferencia (responsavel);

-- 4. Aprimoramento da Tabela de Ocorrências de Perdas
ALTER TABLE public.perdas_ocorrencias 
  ADD COLUMN IF NOT EXISTS motivo TEXT,
  ADD COLUMN IF NOT EXISTS setor TEXT DEFAULT 'Geral',
  ADD COLUMN IF NOT EXISTS valor_estimado NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS individual_records JSONB DEFAULT '[]'::jsonb;

-- 5. Tabelas para o Módulo de Separação de Pedidos (Não público por padrão)
CREATE TABLE IF NOT EXISTS public.pedidos_separacao (
  id TEXT PRIMARY KEY,
  numero_pedido TEXT NOT NULL,
  cliente_nome TEXT,
  arquivo_pdf_nome TEXT,
  status TEXT NOT NULL DEFAULT 'aguardando_distribuicao',
  -- 'aguardando_distribuicao' | 'em_separacao' | 'em_conferencia' | 'concluido' | 'cancelado'
  total_itens INTEGER NOT NULL DEFAULT 0,
  itens_concluidos INTEGER NOT NULL DEFAULT 0,
  criado_por TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tarefas_separacao (
  id TEXT PRIMARY KEY,
  pedido_id TEXT NOT NULL REFERENCES public.pedidos_separacao(id) ON DELETE CASCADE,
  produto_reduzido TEXT,
  produto_nome TEXT NOT NULL,
  quantidade_solicitada NUMERIC(10, 3) NOT NULL DEFAULT 1,
  unidade_medida TEXT NOT NULL DEFAULT 'cx',
  peso_estimado_kg NUMERIC(10, 3) DEFAULT 0,
  ajudante_usuario TEXT,
  ajudante_nome TEXT,
  modalidade_distribuicao TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'sorteio'
  status TEXT NOT NULL DEFAULT 'aguardando_separacao',
  -- 'aguardando_distribuicao' | 'atribuido' | 'aguardando_separacao' | 'em_separacao' | 'aguardando_pesagem' | 'em_conferencia' | 'conferido' | 'concluido' | 'cancelado'
  setor TEXT DEFAULT 'Setor 15',
  peso_bruto_registrado NUMERIC(10, 3),
  tara_total_registrada NUMERIC(6, 3),
  peso_liquido_registrado NUMERIC(10, 3),
  pesagem_feita_por TEXT,
  pesagem_horario TIMESTAMPTZ,
  conferido_por TEXT,
  conferido_horario TIMESTAMPTZ,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.historico_redistribuicoes (
  id TEXT PRIMARY KEY,
  tarefa_id TEXT NOT NULL REFERENCES public.tarefas_separacao(id) ON DELETE CASCADE,
  pedido_id TEXT NOT NULL,
  ajudante_anterior TEXT,
  ajudante_novo TEXT NOT NULL,
  conferente TEXT NOT NULL,
  justificativa TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Configurações de Módulos (Flags)
INSERT INTO public.sistema_configuracoes (chave, valor, updated_at, updated_by)
VALUES 
  (
    'modulos',
    '{
      "moduloEstoqueAtivo": false,
      "moduloPerdasAtivo": true,
      "moduloConferenciaAtivo": true,
      "moduloSeparacaoAtivo": false,
      "moduloExcelAtivo": false,
      "moduloCloudR2Ativo": false,
      "moduloSyncAgentAtivo": false
    }'::jsonb,
    NOW(),
    'sistema'
  )
ON CONFLICT (chave) DO NOTHING;
