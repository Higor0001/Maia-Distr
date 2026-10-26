-- ============================================================================
-- SETUP COMPLETO: Catálogo de Produtos e Permissões Supabase (Hortigranjeiros)
-- Execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/clmsaapyiwrkgvprtlum/sql
-- ============================================================================

-- 1. Criar ou atualizar a tabela de produtos
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

-- Garantir colunas essenciais caso a tabela já existisse com estrutura antiga
ALTER TABLE public.estoque_itens ADD COLUMN IF NOT EXISTS reduzido TEXT;
ALTER TABLE public.estoque_itens ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.estoque_itens ADD COLUMN IF NOT EXISTS pallet_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.estoque_itens ADD COLUMN IF NOT EXISTS lastro INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.estoque_itens ADD COLUMN IF NOT EXISTS unidade BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.estoque_itens ADD COLUMN IF NOT EXISTS tipo_unidade TEXT NOT NULL DEFAULT 'cx';
ALTER TABLE public.estoque_itens ADD COLUMN IF NOT EXISTS tara_kg NUMERIC(6, 3) NOT NULL DEFAULT 0;
ALTER TABLE public.estoque_itens ADD COLUMN IF NOT EXISTS peso_kg NUMERIC(10, 3) NOT NULL DEFAULT 0;
ALTER TABLE public.estoque_itens ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.estoque_itens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.estoque_itens ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Permitir leitura de estoque_itens" ON public.estoque_itens;
CREATE POLICY "Permitir leitura de estoque_itens"
  ON public.estoque_itens FOR SELECT
  TO anon, authenticated, service_role
  USING (true);

DROP POLICY IF EXISTS "Permitir gerenciamento total por service_role" ON public.estoque_itens;
CREATE POLICY "Permitir gerenciamento total por service_role"
  ON public.estoque_itens FOR ALL
  TO service_role
  USING (true);

-- Permissões explícitas para a API REST (anon e authenticated)
GRANT SELECT ON public.estoque_itens TO anon, authenticated;
GRANT ALL ON public.estoque_itens TO service_role;

-- 3. Inserir / Atualizar os 140 Produtos Hortigranjeiros (Validados com pesos e unidades)
INSERT INTO public.estoque_itens (reduzido, descricao, pallet_total, lastro, unidade, tipo_unidade, tara_kg, peso_kg, ativo)
VALUES
  ('1001', 'ABACATE 20 KG', 0, 0, TRUE, 'kg', 0, 20, TRUE),
  ('1002', 'ABACAXI GRANDE', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1003', 'ABACAXI MÉDIO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1004', 'ABOBRINHA PRINCESA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1005', 'ABOBRINHA VERDE', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1006', 'ABÓBORA JACARÉ', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1007', 'ABÓBORA JACARÉ REGIÃO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1008', 'ABÓBORA JAPONESA 20 KG', 0, 0, TRUE, 'kg', 0, 20, TRUE),
  ('1009', 'ABÓBORA JAPONESA 38 KG', 0, 0, TRUE, 'kg', 0, 38, TRUE),
  ('1010', 'ABÓBORA MARANHÃO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1011', 'ACELGA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1012', 'AIPIM', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1013', 'ALHO ARGENTINO 5 LIMPO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1014', 'ALHO ARGENTINO 6 CAT II', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1015', 'ALHO ARGENTINO 6 LIMPO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1016', 'ALHO ARGENTINO 7 CAT 2 PALHA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1017', 'ALHO ARGENTINO 7 CAT I', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1018', 'ALHO ARGENTINO CAT II 5 LIMPO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1019', 'ALHO CHINÊS 9', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1020', 'AMEIXA EMBALADA 10 KG', 0, 0, TRUE, 'kg', 0, 10, TRUE),
  ('1021', 'AMEIXA NACIONAL 9 KG', 0, 0, TRUE, 'kg', 0, 9, TRUE),
  ('1022', 'AMEIXA SECA SEM CAROÇO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1023', 'AMENDOIM TORRADO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1024', 'BANANA DA TERRA BANDEJA', 0, 0, TRUE, 'bdj', 0, 0, TRUE),
  ('1025', 'BANANA DA TERRA GRANDE', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1026', 'BANANA NANICA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1027', 'BANANA NANICA 20 KG', 0, 0, TRUE, 'kg', 0, 20, TRUE),
  ('1028', 'BANANA NANICA BANDEJA', 0, 0, TRUE, 'bdj', 0, 0, TRUE),
  ('1029', 'BANANA PRATA EXTRA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1030', 'BANANA PRATA GRANDE 10 KG', 0, 0, TRUE, 'kg', 0, 10, TRUE),
  ('1031', 'BANANA PRATA MÉDIA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1032', 'BATATA DOCE', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1033', 'BATATA DOCE BRANCA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1034', 'BATATA DOCE MÉDIA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1035', 'BATATA EXTRA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1036', 'BATATA PRIMEIRINHA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1037', 'BERINGELA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1038', 'BETERRABA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1039', 'CEBOLA CAT 2', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1040', 'CEBOLA CAT 3', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1041', 'CEBOLA CAT 4', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1042', 'CEBOLA ROXA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1043', 'CENOURA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1044', 'CENOURA QUEBRADA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1045', 'CHUCHU', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1046', 'COCO SECO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1047', 'COCO VERDE UNIDADE', 0, 0, TRUE, 'un', 0, 0, TRUE),
  ('1048', 'COLORAU', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1049', 'COUVE FLOR', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1050', 'FEIJÃO PRETO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1051', 'FEIJÃO VERMELHO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1052', 'FRUTAS CRISTALIZADAS', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1053', 'GENGIBRE', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1054', 'GOIABA CAIXA GRANDE', 0, 0, TRUE, 'cx', 0, 0, TRUE),
  ('1055', 'INHAME CABEÇA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1056', 'INHAME DEDO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1057', 'INHAME MÉDIO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1058', 'JILÓ', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1059', 'KIWI', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1060', 'LARANJA BAHIA IMPORTADA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1061', 'LARANJA LIMA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1062', 'LARANJA PERA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1063', 'LIMÃO REGIÃO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1064', 'LIMÃO SP', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1065', 'MAMÃO CAIXA MADEIRA', 0, 0, TRUE, 'cx', 0, 0, TRUE),
  ('1066', 'MAMÃO CAIXA PAPELÃO', 0, 0, TRUE, 'cx', 0, 0, TRUE),
  ('1067', 'MANGA PALMER 12 KG', 0, 0, TRUE, 'kg', 0, 12, TRUE),
  ('1068', 'MANGA TOMY', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1069', 'MARACUJÁ', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1070', 'MAÇA A GRANEL', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1071', 'MAÇA ARGENTINA 10 KG', 0, 0, TRUE, 'kg', 0, 10, TRUE),
  ('1072', 'MAÇA ARGENTINA 15 KG', 0, 0, TRUE, 'kg', 0, 15, TRUE),
  ('1073', 'MAÇA EVA CAT III 120', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1074', 'MAÇA EVA CAT III 135', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1075', 'MAÇA FUJI 135 CAT I', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1076', 'MAÇA GALA CAT I 135', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1077', 'MAÇA GALA CAT III 120', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1078', 'MAÇA GALA CAT III 135', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1079', 'MAÇA GALA CAT III 150', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1080', 'MAÇA GALA I 120', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1081', 'MAÇA GS 9 KG', 0, 0, TRUE, 'kg', 0, 9, TRUE),
  ('1082', 'MAÇA NACIONAL 135 CAT I', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1083', 'MAÇA NACIONAL AGRANEL', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1084', 'MAÇA NACIONAL CAT III GRANEL', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1085', 'MAÇA NACIONAL GALA CAT I 120', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1086', 'MELANCIA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1087', 'MELANCIA BABY', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1088', 'MELÃO AMARELO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1089', 'MELÃO CEPI', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1090', 'MELÃO REI', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1091', 'MELÃO SAPO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1092', 'MILHO VERDE BANDEJA', 0, 0, TRUE, 'bdj', 0, 0, TRUE),
  ('1093', 'MILHO VERDE UNIDADE', 0, 0, TRUE, 'un', 0, 0, TRUE),
  ('1094', 'MORANGO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1095', 'NOZES BANDEJA', 0, 0, TRUE, 'bdj', 0, 0, TRUE),
  ('1096', 'OVO BRANCO EMB. 20 DZ', 0, 0, TRUE, 'dz', 0, 0, TRUE),
  ('1097', 'OVO CAIPIRA 30 DZ', 0, 0, TRUE, 'dz', 0, 0, TRUE),
  ('1098', 'OVO CAIPIRA EMB. 20 DZ', 0, 0, TRUE, 'dz', 0, 0, TRUE),
  ('1099', 'OVO CODORNA CONSERVA', 0, 0, TRUE, 'dz', 0, 0, TRUE),
  ('1100', 'OVO DE CODORNA', 0, 0, TRUE, 'dz', 0, 0, TRUE),
  ('1101', 'OVO EXTRA', 0, 0, TRUE, 'dz', 0, 0, TRUE),
  ('1102', 'OVO FILMADO', 0, 0, TRUE, 'dz', 0, 0, TRUE),
  ('1103', 'OVO GRANDE', 0, 0, TRUE, 'dz', 0, 0, TRUE),
  ('1104', 'OVO JUMBO 20 DZ', 0, 0, TRUE, 'dz', 0, 0, TRUE),
  ('1105', 'OVO JUMBO 30 DZ', 0, 0, TRUE, 'dz', 0, 0, TRUE),
  ('1106', 'OVO MÉDIO', 0, 0, TRUE, 'dz', 0, 0, TRUE),
  ('1107', 'OVO VERMELHO 30 DZ', 0, 0, TRUE, 'dz', 0, 0, TRUE),
  ('1108', 'OVO VERMELHO EMB. 20 DZ', 0, 0, TRUE, 'dz', 0, 0, TRUE),
  ('1109', 'PEPINO EUREKA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1110', 'PEPINO JAPONÊS', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1111', 'PEPINO VERDE', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1112', 'PERA DANJU 18 KG', 0, 0, TRUE, 'kg', 0, 18, TRUE),
  ('1113', 'PERA PORTUGUESA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1114', 'PERA PT 120 (MIÚDA)', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1115', 'PERA PT GRAÚDA 18 KG', 0, 0, TRUE, 'kg', 0, 18, TRUE),
  ('1116', 'PERA WILLIANS 10 KG', 0, 0, TRUE, 'kg', 0, 10, TRUE),
  ('1117', 'PERA WILLIANS 18 KG', 0, 0, TRUE, 'kg', 0, 18, TRUE),
  ('1118', 'PIMENTÃO AMARELO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1119', 'PIMENTÃO VERDE', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1120', 'PIMENTÃO VERMELHO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1121', 'PITAYA 10 KG', 0, 0, TRUE, 'kg', 0, 10, TRUE),
  ('1122', 'PITAYA 4 KG', 0, 0, TRUE, 'kg', 0, 4, TRUE),
  ('1123', 'PÊSSEGO NACIONAL 6 KG', 0, 0, TRUE, 'kg', 0, 6, TRUE),
  ('1124', 'QUIABO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1125', 'REPOLHO BRANCO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1126', 'REPOLHO ROXO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1127', 'TOMATE 6', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1128', 'TOMATE 7', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1129', 'TOMATE 8', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1130', 'TOMATE ITALIANO', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1131', 'TÂMARA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1132', 'UVA ISÍS EMBALADA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1133', 'UVA ITÁLIA CX 8 KG', 0, 0, TRUE, 'cx', 0, 8, TRUE),
  ('1134', 'UVA RED 8 KG', 0, 0, TRUE, 'kg', 0, 8, TRUE),
  ('1135', 'UVA RED GLOBE', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1136', 'UVA THOMPSON', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1137', 'UVA VITÓRIA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1138', 'UVAS PASSAS', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1139', 'VAGEM BRANCA', 0, 0, TRUE, 'kg', 0, 0, TRUE),
  ('1140', 'VAGEM VERDE', 0, 0, TRUE, 'kg', 0, 0, TRUE)
ON CONFLICT (reduzido) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  tipo_unidade = EXCLUDED.tipo_unidade,
  tara_kg = EXCLUDED.tara_kg,
  peso_kg = EXCLUDED.peso_kg,
  ativo = TRUE,
  updated_at = NOW();

-- 4. Verificação final
SELECT COUNT(*) AS total_produtos_hortigranjeiros FROM public.estoque_itens;
