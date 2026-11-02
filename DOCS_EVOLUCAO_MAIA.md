# Evolução do Sistema Operacional — Maia Distribuidora

Data de Atualização: 01/11/2026
Repositório: `C:\Users\user\Downloads\Maia-Distr-main`
Status: Compilação de Produção Next.js Concluída com Sucesso (32 rotas estáticas e dinâmicas geradas sem erros).

---

## 1. Visão Geral das Novas Funcionalidades e Ajustes

### A. Alinhamento Visual 100% com o Controle de Perdas
- **Layout Unificado:** O módulo de **Simples Conferência** (`/simples-conferencia`) adota rigorosamente a mesma identidade visual do **Controle de Perdas** (`/`):
  - Fundo com marca d'água (`/images/login-bg.jpg`).
  - Cartão centralizado `.container` com cantos arredondados (20px), fundo translúcido `rgba(255, 255, 255, 0.95)` e efeito `backdrop-filter: blur(10px)`.
  - Cabeçalho com logo redondo Maia (`56px`), borda marrom `#5c4632` e sombra suave.
  - Título em tom azul naval (`#1a2a6c`) e botões de ação com gradiente `#1a2a6c` → `#b21f1f`.
  - Botões inativos em `#e9ecef` com texto em `#1a2a6c`.
  - Barra de navegação inferior idêntica à do Controle de Perdas.

### B. Quantidade de Caixas e Lista com "Adicionar Item" (Padrão Perdas)
- **Botão "➕ Adicionar Item à Lista":** Exatamente como no módulo de Controle de Perdas, o operador pode:
  1. Digitar/selecionar o produto hortigranjeiro.
  2. Informar o peso bruto medido na balança.
  3. Selecionar o carrinho (desconto de tara) e o tipo de caixa.
  4. Informar o **número de caixas** (stepper `+`/`-`, digitação ou botões rápidos de `1` a `50` caixas).
  5. Clicar em **➕ Adicionar Item à Lista** (botão verde `#28a745`).
- **Lista de Itens na Fila de Conferência:**
  - Mostra todos os itens adicionados com número do item, nome, código reduzido, bruto, tara do carrinho, tara das caixas e peso líquido.
  - Totalizador acumulado em tempo real: `Total Líquido: X.XX kg` e `Total Bruto: Y.YY kg`.
  - Botão de remoção individual `🗑️ Remover` para cada item da lista.
  - Botão `Limpar toda a lista`.
- **Gravação em Lote:** O botão principal `💾 Confirmar e Gravar Todos os Itens (N)` grava todos os produtos da fila de uma só vez via `/api/simples-conferencia`. Se o operador não adicionou itens à lista mas preencheu o produto diretamente, ele permite a gravação avulsa imediata.

### C. Maia Sync Agent como Setup para Computador Externo
- **Arquitetura Autônoma:** O Maia Sync Agent é um pacote independente para ser instalado no computador da balança ou da expedição, e **não** um componente web do navegador.
- **Pasta do Instalador:** `setup-maia-sync-agent/`
  - `INSTALADOR_WINDOWS.bat`: Cria pastas locais (`C:\MaiaRelatorios`), atalho no Startup do Windows (início automático no boot) e atalho na Área de Trabalho.
  - `maia_sync_agent.py`: Agente Python autônomo com polling, download e envio à impressora Windows.
  - `config.json`: Configuração de URL do servidor, intervalo de polling, pasta de destino e nome da impressora.
  - `INICIAR_AGENTE.bat`: Inicializador manual em console para testes ou monitoramento.
  - `DESINSTALAR.bat`: Remoção limpa do serviço e encerramento de processos.
  - `LEIA-ME.txt`: Instruções passo a passo em português.
- **Download no Painel Admin:** Disponibilizado arquivo compactado `setup-maia-sync-agent.zip` para download com 1 clique diretamente na aba *Módulos Operacionais* do `/admin`.

### D. Reativação Dinâmica dos Módulos no Sistema
- **Controle Central no Admin:** Quando qualquer módulo for ativado ou desativado na aba *Módulos Operacionais* do `/admin`:
  - `moduloEstoqueAtivo` → Exibe o link **📦 Gerenciador de Estoque** (`/gerenciador-estoque`).
  - `moduloSeparacaoAtivo` → Exibe o link **📋 Separação de Pedidos** (`/separacao`).
  - `moduloExcelAtivo` → Exibe o link **📊 Atualização de Preços** (`/precos`).
  - `moduloConferenciaAtivo` → Exibe o link **⚖️ Simples Conferência** (`/simples-conferencia`).
  - `moduloPerdasAtivo` → Exibe o link **⚠️ Controle de Perdas** (`/`).
- **Propagação em Tempo Real:** O endpoint público `/api/modulos` entrega as flags operacionais sem cache (`no-store`), atualizando instantaneamente o cabeçalho e o rodapé de navegação em todas as páginas do sistema.

---

## 2. Estrutura de Arquivos

| Arquivo / Pasta | Finalidade |
|---|---|
| `app/simples-conferencia/page.tsx` | Simples Conferência com layout de perdas, seletor de caixas e lista de itens adicionados |
| `app/page.tsx` | Controle de Perdas com links e navegação dinâmica por módulo ativo |
| `app/admin/page.tsx` | Painel Admin com ativação de feature flags e download do setup do Sync Agent |
| `app/api/modulos/route.ts` | Endpoint público em tempo real para flags operacionais |
| `app/api/simples-conferencia/route.ts` | Registro em lote e individual com quantidade de caixas |
| `lib/conferencia.ts` | Camada de persistência e cálculo de taras e caixas |
| `setup-maia-sync-agent/` | Pasta do instalador autônomo para computadores externos Windows |
| `public/downloads/setup-maia-sync-agent.zip` | Pacote ZIP para download no painel administrativo |
| `scripts/006_evolucao_modulos_operacionais.sql` | Migration SQL atualizada com `quantidade_caixas` |
