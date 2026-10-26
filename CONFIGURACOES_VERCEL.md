# 🚀 Guia de Configuração e Variáveis de Ambiente - Vercel
**Projeto:** Maia Hortifrutigranjeiros - Sistema de Triagem Filial  
**Data de Atualização:** 26/10/2026

---

## 1. 🔑 Variáveis de Ambiente (Environment Variables)

Adicione as variáveis abaixo no painel da **Vercel** (`Project Settings` > `Environment Variables`):

| Variável | Obrigatória? | Descrição / Valor Sugerido |
| :--- | :---: | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | **SIM** | `https://clmsaapyiwrkgvprtlum.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | **SIM** | *(Sua chave Service Role do Supabase - Project Settings > API > service_role secret)* |
| `SESSION_SECRET` | **SIM** | `c9f7a8b23e1d459082ef45b81a7d620934cba879102837465928172948576102` *(ou gere uma chave aleatória de 32+ caracteres)* |
| `NEXT_PUBLIC_APP_URL` | Opcional | URL de produção da Vercel (ex: `https://seu-projeto.vercel.app`) |
| `TELEGRAM_BOT_TOKEN` | Opcional | Token do bot do Telegram para notificações de triagem |
| `TELEGRAM_CHAT_ID_FILIAL` | Opcional | ID do chat/canal da filial |
| `TELEGRAM_CHAT_ID_MATRIZ` | Opcional | ID do chat/canal da matriz |

### Bloco para Copiar e Colar (formato `.env`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://clmsaapyiwrkgvprtlum.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY_AQUI
SESSION_SECRET=c9f7a8b23e1d459082ef45b81a7d620934cba879102837465928172948576102

# Notificações Telegram (se utilizar):
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_CHAT_ID_FILIAL=
# TELEGRAM_CHAT_ID_MATRIZ=
```

---

## 2. 🗄️ Estrutura do Banco de Dados (Supabase SQL)

Para garantir que a tabela de itens de estoque funcione perfeitamente com a API e o Gerenciador de Estoque, execute o script SQL abaixo no **SQL Editor** do Supabase:

```sql
-- 1. Criação da tabela de itens de estoque com as colunas oficiais do sistema
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

-- 2. Habilitar RLS e permitir leitura pública/autenticada do catálogo
ALTER TABLE public.estoque_itens ENABLE ROW LEVEL SECURITY;

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

-- 3. Conceder permissões para a API Data REST do Supabase
GRANT SELECT ON public.estoque_itens TO anon, authenticated;
GRANT ALL ON public.estoque_itens TO service_role;
```

---

## 3. 📦 Status dos Produtos e Catálogo

- **Total de Itens Validados:** 140 produtos sincronizados com a planilha `Estoque em Loja.xlsx`.
- **Arquivo de Fallback Local:** `data/estoque-itens.json` atualizado e testado.
- **Relatório Completo de Itens:** Consulte o artefato salvo em seu painel ou o arquivo local caso queira checar código por código.

---

## 4. 🎨 Layout e Telas Atualizadas

- **Área Administrativa (`/admin`):**
  - Padronizada com a identidade visual oficial Maia (background temático, card centralizado em glassmorphism, logo circular, abas azul-marinho, métricas organizadas e botões sem distorção).
- **Termos e Condições (`/termos`):**
  - Padronizada com fundo claro e tipografia oficial.
- **Folha de Estilos (`app/globals.css`):**
  - Regras antigas de formulários legados restritas ao container específico (`.marca-foto-container`), prevenindo quebras em botões e inputs de outras páginas.
- **Build de Produção:**
  - Testado localmente via `npm run build` com status **100% aprovado (0 erros)**.

---

## 5. 🚀 Passo a Passo de Deploy na Vercel

1. Suba as alterações para o seu repositório no GitHub (`git add .`, `git commit -m "feat: design maia e estoque atualizado"`, `git push`).
2. Acesse o painel da **Vercel** e abra o projeto.
3. Vá em **Settings** > **Environment Variables**.
4. Adicione as variáveis listadas na **Seção 1**.
5. Dispare um novo **Deploy** (ou aguarde o deploy automático do commit na branch `main`).
