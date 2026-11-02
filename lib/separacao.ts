import { supabaseFetch } from "@/lib/db"
import fs from "fs/promises"
import path from "path"

export type StatusTarefa =
  | "aguardando_distribuicao"
  | "atribuido"
  | "aguardando_separacao"
  | "em_separacao"
  | "aguardando_pesagem"
  | "em_conferencia"
  | "conferido"
  | "concluido"
  | "cancelado"

export type StatusPedido =
  | "aguardando_distribuicao"
  | "em_separacao"
  | "em_conferencia"
  | "concluido"
  | "cancelado"

export interface TarefaSeparacao {
  id: string
  pedidoId: string
  produtoReduzido?: string
  produtoNome: string
  quantidadeSolicitada: number
  unidadeMedida: string
  pesoEstimadoKg?: number
  ajudanteUsuario?: string
  ajudanteNome?: string
  modalidadeDistribuicao: "manual" | "sorteio"
  status: StatusTarefa
  setor: string
  pesoBrutoRegistrado?: number
  taraTotalRegistrada?: number
  pesoLiquidoRegistrado?: number
  pesagemFeitaPor?: string
  pesagemHorario?: string
  conferidoPor?: string
  conferidoHorario?: string
  observacao?: string
  createdAt: string
  updatedAt: string
}

export interface PedidoSeparacao {
  id: string
  numeroPedido: string
  clienteNome?: string
  arquivoPdfNome?: string
  status: StatusPedido
  totalItens: number
  itensConcluidos: number
  criadoPor: string
  tarefas: TarefaSeparacao[]
  createdAt: string
  updatedAt: string
}

export interface HistoricoRedistribuicao {
  id: string
  tarefaId: string
  pedidoId: string
  ajudanteAnterior?: string
  ajudanteNovo: string
  conferente: string
  justificativa: string
  createdAt: string
}

const PEDIDOS_FILE = path.join(process.cwd(), "data", "pedidos-separacao.json")
const REDISTRIBUICOES_FILE = path.join(process.cwd(), "data", "redistribuicoes-historico.json")

export async function getPedidosSeparacao(): Promise<PedidoSeparacao[]> {
  try {
    const raw = await fs.readFile(PEDIDOS_FILE, "utf-8")
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export async function savePedidosSeparacao(pedidos: PedidoSeparacao[]): Promise<void> {
  try {
    const dir = path.dirname(PEDIDOS_FILE)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(PEDIDOS_FILE, JSON.stringify(pedidos, null, 2), "utf-8")
  } catch (err) {
    console.error("Erro ao salvar pedidos-separacao.json:", err)
  }
}

export async function getPedidoPorId(id: string): Promise<PedidoSeparacao | null> {
  const pedidos = await getPedidosSeparacao()
  return pedidos.find((p) => p.id === id) || null
}

export async function criarPedidoSeparacao(dados: {
  numeroPedido: string
  clienteNome?: string
  arquivoPdfNome?: string
  criadoPor: string
  itens: Array<{
    produtoReduzido?: string
    produtoNome: string
    quantidade: number
    unidade?: string
    pesoEstimado?: number
  }>
}): Promise<PedidoSeparacao> {
  const pedidos = await getPedidosSeparacao()
  const pedidoId = `ped_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  const now = new Date().toISOString()

  const tarefas: TarefaSeparacao[] = dados.itens.map((item, index) => ({
    id: `tar_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
    pedidoId,
    produtoReduzido: item.produtoReduzido || "",
    produtoNome: item.produtoNome,
    quantidadeSolicitada: item.quantidade || 1,
    unidadeMedida: item.unidade || "cx",
    pesoEstimadoKg: item.pesoEstimado || 0,
    modalidadeDistribuicao: "manual",
    status: "aguardando_distribuicao",
    setor: "Setor 15",
    createdAt: now,
    updatedAt: now,
  }))

  const novoPedido: PedidoSeparacao = {
    id: pedidoId,
    numeroPedido: dados.numeroPedido || `PED-${Date.now().toString().slice(-4)}`,
    clienteNome: dados.clienteNome || "Carga Geral",
    arquivoPdfNome: dados.arquivoPdfNome || "",
    status: "aguardando_distribuicao",
    totalItens: tarefas.length,
    itensConcluidos: 0,
    criadoPor: dados.criadoPor,
    tarefas,
    createdAt: now,
    updatedAt: now,
  }

  pedidos.unshift(novoPedido)
  await savePedidosSeparacao(pedidos)
  return novoPedido
}

// Sorteio de Ajudantes (Modalidade B)
export async function sortearAjudantes(
  pedidoId: string,
  ajudantesDisponiveis: Array<{ usuario: string; nome: string }>
): Promise<PedidoSeparacao> {
  const pedidos = await getPedidosSeparacao()
  const pedido = pedidos.find((p) => p.id === pedidoId)
  if (!pedido) throw new Error("Pedido não encontrado.")
  if (!ajudantesDisponiveis || ajudantesDisponiveis.length === 0) {
    throw new Error("Nenhum ajudante disponível selecionado para o sorteio.")
  }

  const now = new Date().toISOString()

  // Sorteia aleatoriamente cada tarefa pendente entre os ajudantes selecionados
  pedido.tarefas = pedido.tarefas.map((tarefa) => {
    if (tarefa.status === "aguardando_distribuicao" || tarefa.status === "atribuido") {
      const sorteado = ajudantesDisponiveis[Math.floor(Math.random() * ajudantesDisponiveis.length)]
      return {
        ...tarefa,
        ajudanteUsuario: sorteado.usuario,
        ajudanteNome: sorteado.nome,
        modalidadeDistribuicao: "sorteio",
        status: "aguardando_separacao",
        updatedAt: now,
      }
    }
    return tarefa
  })

  pedido.status = "em_separacao"
  pedido.updatedAt = now

  await savePedidosSeparacao(pedidos)
  return pedido
}

// Redistribuição Auditada de Tarefa
export async function redistribuirTarefa(params: {
  pedidoId: string
  tarefaId: string
  novoAjudante: { usuario: string; nome: string }
  conferente: string
  justificativa: string
}): Promise<TarefaSeparacao> {
  const pedidos = await getPedidosSeparacao()
  const pedido = pedidos.find((p) => p.id === params.pedidoId)
  if (!pedido) throw new Error("Pedido não encontrado.")

  const tarefa = pedido.tarefas.find((t) => t.id === params.tarefaId)
  if (!tarefa) throw new Error("Tarefa não encontrada.")

  if (tarefa.status === "concluido") {
    throw new Error("Tarefas já concluídas exigem procedimento de correção administrativa.")
  }

  const ajudanteAnterior = tarefa.ajudanteNome || tarefa.ajudanteUsuario || "Não atribuído"
  const now = new Date().toISOString()

  tarefa.ajudanteUsuario = params.novoAjudante.usuario
  tarefa.ajudanteNome = params.novoAjudante.nome
  tarefa.updatedAt = now

  // Registro de Auditoria
  const historico: HistoricoRedistribuicao = {
    id: `redist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tarefaId: tarefa.id,
    pedidoId: pedido.id,
    ajudanteAnterior,
    ajudanteNovo: params.novoAjudante.nome,
    conferente: params.conferente,
    justificativa: params.justificativa,
    createdAt: now,
  }

  try {
    let histList: HistoricoRedistribuicao[] = []
    try {
      const raw = await fs.readFile(REDISTRIBUICOES_FILE, "utf-8")
      histList = JSON.parse(raw)
    } catch {
      histList = []
    }
    histList.unshift(historico)
    await fs.writeFile(REDISTRIBUICOES_FILE, JSON.stringify(histList, null, 2), "utf-8")
  } catch (err) {
    console.error("Erro ao salvar histórico de redistribuição:", err)
  }

  await savePedidosSeparacao(pedidos)
  return tarefa
}

// Registro de Pesagem na Balança
export async function registrarPesagemSeparacao(params: {
  pedidoId: string
  tarefaId: string
  pesoBruto: number
  taraTotal: number
  pesoLiquido: number
  operadorPesagem: string
  observacao?: string
}): Promise<TarefaSeparacao> {
  const pedidos = await getPedidosSeparacao()
  const pedido = pedidos.find((p) => p.id === params.pedidoId)
  if (!pedido) throw new Error("Pedido não encontrado.")

  const tarefa = pedido.tarefas.find((t) => t.id === params.tarefaId)
  if (!tarefa) throw new Error("Tarefa não encontrada.")

  const now = new Date().toISOString()
  tarefa.pesoBrutoRegistrado = params.pesoBruto
  tarefa.taraTotalRegistrada = params.taraTotal
  tarefa.pesoLiquidoRegistrado = params.pesoLiquido
  tarefa.pesagemFeitaPor = params.operadorPesagem
  tarefa.pesagemHorario = now
  tarefa.status = "em_conferencia"
  tarefa.observacao = params.observacao || tarefa.observacao
  tarefa.updatedAt = now

  await savePedidosSeparacao(pedidos)
  return tarefa
}

// Aprovação / Conferência Final do Conferente
export async function aprovarTarefaSeparacao(params: {
  pedidoId: string
  tarefaId: string
  conferente: string
}): Promise<TarefaSeparacao> {
  const pedidos = await getPedidosSeparacao()
  const pedido = pedidos.find((p) => p.id === params.pedidoId)
  if (!pedido) throw new Error("Pedido não encontrado.")

  const tarefa = pedido.tarefas.find((t) => t.id === params.tarefaId)
  if (!tarefa) throw new Error("Tarefa não encontrada.")

  const now = new Date().toISOString()
  tarefa.status = "concluido"
  tarefa.conferidoPor = params.conferente
  tarefa.conferidoHorario = now
  tarefa.updatedAt = now

  // Recalcula status geral do pedido
  const concluidas = pedido.tarefas.filter((t) => t.status === "concluido").length
  pedido.itensConcluidos = concluidas
  if (concluidas === pedido.tarefas.length) {
    pedido.status = "concluido"
  } else {
    pedido.status = "em_conferencia"
  }
  pedido.updatedAt = now

  await savePedidosSeparacao(pedidos)
  return tarefa
}
