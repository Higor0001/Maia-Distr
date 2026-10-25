-- ============================================================================
-- Schema do Banco de Dados: Hortigranjeiros (Gerenciador de Estoque & Perdas)
-- Compatível com Supabase / PostgreSQL / Neon
-- ============================================================================

-- 1. Tabela de Catálogo de Produtos (Gerenciador de Estoque e Perdas)
CREATE TABLE IF NOT EXISTS public.estoque_itens (
  reduzido TEXT PRIMARY KEY,
  descricao TEXT NOT NULL,
  pallet_total INTEGER NOT NULL DEFAULT 0,
  lastro INTEGER NOT NULL DEFAULT 0,
  unidade BOOLEAN NOT NULL DEFAULT FALSE,
  tipo_unidade TEXT NOT NULL DEFAULT 'cx', -- 'kg' | 'cx' | 'sc' | 'bdj' | 'dz' | 'un'
  tara_kg NUMERIC(6, 3) NOT NULL DEFAULT 0,
  peso_kg NUMERIC(10, 3) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela de Contagens de Estoque (/gerenciador-estoque)
CREATE TABLE IF NOT EXISTS public.estoque_contagens (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT 'filial', -- 'filial' | 'matriz'
  date TEXT NOT NULL,                   -- formato DD/MM/YYYY
  contador TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (scope, date)
);

-- 3. Tabela de Ocorrências de Perdas (Controle de Perdas em kg)
CREATE TABLE IF NOT EXISTS public.perdas_ocorrencias (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,               -- 'puxada' | 'passagem' | 'armazem' | 'deterioracao'
  operator_name TEXT,
  observation TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_weight_kg NUMERIC(10, 3) NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  timestamp BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
