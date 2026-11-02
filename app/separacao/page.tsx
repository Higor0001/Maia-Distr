"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { NavHeader } from "@/components/layout/nav-header"
import {
  Layers,
  FileUp,
  Shuffle,
  UserCheck,
  Scale,
  CheckCircle2,
  Clock,
  ArrowRight,
  Tablet,
  AlertCircle,
  RefreshCw,
  Plus,
  Lock,
  Box,
  ShoppingCart,
  ShieldCheck,
  History,
} from "lucide-react"
import type { PedidoSeparacao, TarefaSeparacao } from "@/lib/separacao"

export default function SeparacaoPage() {
  const [user, setUser] = useState<{
    usuario: string
    nome?: string
    unidade?: string
    role?: string
  } | null>(null)

  const [moduloSeparacaoAtivo, setModuloSeparacaoAtivo] = useState(false)
  const [loadingConfig, setLoadingConfig] = useState(true)

  // Modos dos 4 Tablets
  const [tabletMode, setTabletMode] = useState<"conferente" | "balanca" | "separador" | "setor15">(
    "conferente"
  )

  const [pedidos, setPedidos] = useState<PedidoSeparacao[]>([])
  const [carrinhos, setCarrinhos] = useState<any[]>([])
  const [caixas, setCaixas] = useState<any[]>([])
  const [usuariosAjudantes, setUsuariosAjudantes] = useState<Array<{ usuario: string; nome: string }>>([])

  // Modal Novo Pedido
  const [modalNovoPedido, setModalNovoPedido] = useState(false)
  const [novoNumPedido, setNovoNumPedido] = useState("")
  const [novoCliente, setNovoCliente] = useState("")
  const [novoItensTexto, setNovoItensTexto] = useState(
    "Abóbora Maranhão, 10, cx\nBanana-da-terra, 5, cx\nBatata Especial, 8, sc\nTomate Longa Vida, 12, cx"
  )

  // Pesagem no Tablet Balança
  const [tarefaSelecionadaPesagem, setTarefaSelecionadaPesagem] = useState<{
    pedidoId: string
    tarefa: TarefaSeparacao
  } | null>(null)
  const [pesoBrutoInput, setPesoBrutoInput] = useState("")
  const [selectedCarrinhoId, setSelectedCarrinhoId] = useState("")
  const [selectedCaixaId, setSelectedCaixaId] = useState("")
  const [pesagemObs, setPesagemObs] = useState("")

  // Redistribuição
  const [modalRedistribuir, setModalRedistribuir] = useState<{
    pedidoId: string
    tarefa: TarefaSeparacao
  } | null>(null)
  const [novoAjudanteUsuario, setNovoAjudanteUsuario] = useState("")
  const [justificativaRedist, setJustificativaRedist] = useState("")

  // Feedback
  const [msgFeedback, setMsgFeedback] = useState("")
  const [loadingAction, setLoadingAction] = useState(false)

  // 1. Carregar Sessão e Configurações
  useEffect(() => {
    fetch("/api/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data?.user) {
          setUser(data.user)
        }
      })
      .catch(() => {})

    fetch("/api/admin/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings?.modulos?.moduloSeparacaoAtivo) {
          setModuloSeparacaoAtivo(true)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingConfig(false))
  }, [])

  // 2. Carregar Pedidos e Dados Operacionais
  const carregarDados = async () => {
    try {
      const resPedidos = await fetch("/api/separacao/pedidos")
      if (resPedidos.ok) {
        const pData = await resPedidos.json()
        setPedidos(Array.isArray(pData?.pedidos) ? pData.pedidos : [])
      }

      const resCarrinhos = await fetch("/api/carrinhos-tara")
      if (resCarrinhos.ok) {
        const cData = await resCarrinhos.json()
        setCarrinhos(Array.isArray(cData?.carrinhos) ? cData.carrinhos : [])
      }

      const resCaixas = await fetch("/api/caixas-tara")
      if (resCaixas.ok) {
        const cxData = await resCaixas.json()
        setCaixas(Array.isArray(cxData?.caixas) ? cxData.caixas : [])
      }

      const resUsers = await fetch("/api/users")
      if (resUsers.ok) {
        const uData = await resUsers.json()
        setUsuariosAjudantes(Array.isArray(uData?.users) ? uData.users : [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (!loadingConfig && (moduloSeparacaoAtivo || user?.role === "admin")) {
      carregarDados()
    }
  }, [loadingConfig, moduloSeparacaoAtivo, user])

  // Fallback de Ajudantes caso banco não tenha outros cadastros
  const ajudantesLista = useMemo(() => {
    if (usuariosAjudantes.length > 0) return usuariosAjudantes
    return [
      { usuario: "alexandre", nome: "Alexandre Queiroz" },
      { usuario: "joao", nome: "João Silva" },
      { usuario: "carlos", nome: "Carlos Santos" },
      { usuario: "marcos", nome: "Marcos Oliveira" },
    ]
  }, [usuariosAjudantes])

  // Cálculo de Tara para Pesagem
  const cTara = carrinhos.find((c) => c.id === selectedCarrinhoId)?.taraKg || 0
  const cxTara = caixas.find((c) => c.id === selectedCaixaId)?.taraKg || 0
  const taraTotal = Number((cTara + cxTara).toFixed(3))
  const pBruto = parseFloat(pesoBrutoInput.replace(",", ".")) || 0
  const pLiquido = Math.max(0, Number((pBruto - taraTotal).toFixed(3)))

  // 1. Criar Pedido
  const handleCriarPedido = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingAction(true)
    try {
      const linhas = novoItensTexto.split("\n").filter((l) => l.trim())
      const itens = linhas.map((linha) => {
        const partes = linha.split(",").map((p) => p.trim())
        return {
          produtoNome: partes[0] || "Hortifruti Geral",
          quantidade: parseFloat(partes[1]) || 1,
          unidade: partes[2] || "cx",
        }
      })

      const res = await fetch("/api/separacao/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numeroPedido: novoNumPedido || `PED-${Math.floor(1000 + Math.random() * 9000)}`,
          clienteNome: novoCliente || "Distribuição Matriz",
          itens,
        }),
      })

      const data = await res.json()
      if (res.ok && data.ok) {
        setPedidos((prev) => [data.pedido, ...prev])
        setModalNovoPedido(false)
        setNovoNumPedido("")
        setNovoCliente("")
        setMsgFeedback("Pedido importado e pronto para distribuição.")
      }
    } catch (err: any) {
      setMsgFeedback(err.message)
    } finally {
      setLoadingAction(false)
    }
  }

  // 2. Sortear Ajudantes (Modalidade B)
  const handleSortear = async (pedidoId: string) => {
    if (!confirm("Deseja sortear aleatoriamente as tarefas entre os ajudantes disponíveis?")) return
    setLoadingAction(true)
    try {
      const res = await fetch("/api/separacao/tarefas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sorteio",
          pedidoId,
          ajudantes: ajudantesLista,
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setPedidos((prev) => prev.map((p) => (p.id === pedidoId ? data.pedido : p)))
        setMsgFeedback("Sorteio de ajudantes executado com sucesso.")
      }
    } catch (err: any) {
      setMsgFeedback(err.message)
    } finally {
      setLoadingAction(false)
    }
  }

  // 3. Salvar Pesagem (Balança)
  const handleSalvarPesagem = async () => {
    if (!tarefaSelecionadaPesagem || pBruto <= 0) return
    setLoadingAction(true)
    try {
      const res = await fetch("/api/separacao/tarefas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pesagem",
          pedidoId: tarefaSelecionadaPesagem.pedidoId,
          tarefaId: tarefaSelecionadaPesagem.tarefa.id,
          pesoBruto: pBruto,
          taraTotal,
          pesoLiquido: pLiquido,
          observacao: pesagemObs,
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setMsgFeedback(`Pesagem registrada: ${pBruto.toFixed(2)} kg → ${pLiquido.toFixed(2)} kg.`)
        setTarefaSelecionadaPesagem(null)
        setPesoBrutoInput("")
        setPesagemObs("")
        carregarDados()
      }
    } catch (err: any) {
      setMsgFeedback(err.message)
    } finally {
      setLoadingAction(false)
    }
  }

  // 4. Salvar Redistribuição com Justificativa
  const handleSalvarRedistribuicao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalRedistribuir || !novoAjudanteUsuario || !justificativaRedist) return
    setLoadingAction(true)
    try {
      const ajudanteObj = ajudantesLista.find((a) => a.usuario === novoAjudanteUsuario) || {
        usuario: novoAjudanteUsuario,
        nome: novoAjudanteUsuario,
      }
      const res = await fetch("/api/separacao/tarefas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "redistribuir",
          pedidoId: modalRedistribuir.pedidoId,
          tarefaId: modalRedistribuir.tarefa.id,
          novoAjudante: ajudanteObj,
          justificativa: justificativaRedist,
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setMsgFeedback("Tarefa redistribuída e auditada no histórico.")
        setModalRedistribuir(null)
        setJustificativaRedist("")
        carregarDados()
      }
    } catch (err: any) {
      setMsgFeedback(err.message)
    } finally {
      setLoadingAction(false)
    }
  }

  // 5. Aprovar Tarefa
  const handleAprovarTarefa = async (pedidoId: string, tarefaId: string) => {
    setLoadingAction(true)
    try {
      const res = await fetch("/api/separacao/tarefas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "aprovar",
          pedidoId,
          tarefaId,
        }),
      })
      if (res.ok) {
        setMsgFeedback("Item conferido e aprovado pelo conferente.")
        carregarDados()
      }
    } catch (err: any) {
      setMsgFeedback(err.message)
    } finally {
      setLoadingAction(false)
    }
  }

  // PROTEÇÃO: MÓDULO NÃO PÚBLICO
  if (!loadingConfig && !moduloSeparacaoAtivo && user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-200 space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-2xl font-bold">
            <Lock className="w-8 h-8 text-amber-700" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-slate-900">Módulo Não Público</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              O módulo de Separação e Distribuição de Pedidos está pronto na base de código, mas requer
              ativação formal nas configurações do sistema ou credenciais de Administrador.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/simples-conferencia"
              className="w-full py-3 px-4 bg-[#1a2a6c] text-white font-bold rounded-xl text-sm transition-all shadow"
            >
              Voltar para Simples Conferência
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <NavHeader user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
        {/* Top Header & Seletor dos 4 Tablets */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-100 text-[#1a2a6c] rounded-xl">
                <Layers className="w-6 h-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Separação & Distribuição de Pedidos
                  </h1>
                  {!moduloSeparacaoAtivo && (
                    <span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full uppercase">
                      Modo Prévia Admin
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-500">
                  Distribuição por produto, sorteio automatizado e pesagem vinculada aos ajudantes operacionais.
                </p>
              </div>
            </div>
          </div>

          {/* SELETOR DOS 4 TABLETS OPERACIONAIS */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-x-auto self-start sm:self-center">
            <button
              onClick={() => setTabletMode("conferente")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                tabletMode === "conferente"
                  ? "bg-[#1a2a6c] text-white shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              Tablet 2: Conferente
            </button>
            <button
              onClick={() => setTabletMode("balanca")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                tabletMode === "balanca"
                  ? "bg-[#1a2a6c] text-white shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              Tablet 1: Balança
            </button>
            <button
              onClick={() => setTabletMode("separador")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                tabletMode === "separador"
                  ? "bg-[#1a2a6c] text-white shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Tablet 3: Separação
            </button>
            <button
              onClick={() => setTabletMode("setor15")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                tabletMode === "setor15"
                  ? "bg-[#1a2a6c] text-white shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              Tablet 4: Setor 15
            </button>
          </div>
        </div>

        {/* FEEDBACK */}
        {msgFeedback && (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between text-xs sm:text-sm font-bold text-blue-900">
            <span>{msgFeedback}</span>
            <button onClick={() => setMsgFeedback("")} className="text-blue-500 font-black">
              ×
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* TABLET 2: CONFERENTE (Gestão Completa de Pedidos & Sorteio) */}
        {/* ========================================================= */}
        {tabletMode === "conferente" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Painel do Conferente</h2>
                <p className="text-xs text-slate-500">
                  Importe pedidos, execute o sorteio de ajudantes e aprove as pesagens realizadas.
                </p>
              </div>
              <button
                onClick={() => setModalNovoPedido(true)}
                className="px-4 py-2 bg-[#1a2a6c] hover:bg-[#203a8f] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow"
              >
                <Plus className="w-4 h-4" /> Importar Novo Pedido / PDF
              </button>
            </div>

            {/* Lista de Pedidos */}
            <div className="space-y-4">
              {pedidos.map((pedido) => (
                <div
                  key={pedido.id}
                  className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-base font-black text-slate-900">
                          {pedido.numeroPedido}
                        </span>
                        <span className="text-xs bg-slate-100 px-2.5 py-0.5 rounded-full font-bold text-slate-700">
                          {pedido.clienteNome}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            pedido.status === "concluido"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {pedido.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Criado em {new Date(pedido.createdAt).toLocaleString("pt-BR")} por{" "}
                        {pedido.criadoPor}
                      </div>
                    </div>

                    {/* Botões do Conferente: Sorteio e Status */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSortear(pedido.id)}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow"
                      >
                        <Shuffle className="w-3.5 h-3.5" /> Sortear Ajudantes
                      </button>
                    </div>
                  </div>

                  {/* Tabela de Produtos / Tarefas deste Pedido */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">Produto</th>
                          <th className="p-2.5">Qtd Solicitada</th>
                          <th className="p-2.5">Ajudante Responsável</th>
                          <th className="p-2.5">Modalidade</th>
                          <th className="p-2.5">Pesagem Bruto → Líquido</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {pedido.tarefas.map((tarefa) => (
                          <tr key={tarefa.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-900">{tarefa.produtoNome}</td>
                            <td className="p-2.5">
                              {tarefa.quantidadeSolicitada} {tarefa.unidadeMedida}
                            </td>
                            <td className="p-2.5">
                              <span className="font-semibold text-slate-800">
                                {tarefa.ajudanteNome || "— Aguardando"}
                              </span>
                            </td>
                            <td className="p-2.5 text-[11px] text-slate-500 uppercase">
                              {tarefa.modalidadeDistribuicao}
                            </td>
                            <td className="p-2.5">
                              {tarefa.pesoLiquidoRegistrado !== undefined ? (
                                <span className="font-mono text-emerald-700 font-bold">
                                  {tarefa.pesoBrutoRegistrado?.toFixed(2)} kg →{" "}
                                  {tarefa.pesoLiquidoRegistrado?.toFixed(2)} kg
                                </span>
                              ) : (
                                <span className="text-slate-400">Pendente na balança</span>
                              )}
                            </td>
                            <td className="p-2.5">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                  tarefa.status === "concluido"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : tarefa.status === "em_conferencia"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {tarefa.status.replace("_", " ")}
                              </span>
                            </td>
                            <td className="p-2.5 text-right space-x-1.5">
                              {tarefa.status !== "concluido" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setModalRedistribuir({ pedidoId: pedido.id, tarefa })
                                  }
                                  className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 rounded"
                                >
                                  Redistribuir
                                </button>
                              )}
                              {tarefa.status === "em_conferencia" && (
                                <button
                                  type="button"
                                  onClick={() => handleAprovarTarefa(pedido.id, tarefa.id)}
                                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow"
                                >
                                  Aprovar
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {pedidos.length === 0 && (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
                  Nenhum pedido cadastrado no momento. Clique em &quot;Importar Novo Pedido / PDF&quot; para iniciar.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TABLET 1: BALANÇA (Pesagem Rápida das Tarefas Separadas) */}
        {/* ========================================================= */}
        {tabletMode === "balanca" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Lado Esquerdo: Fila de Produtos Aguardando Pesagem */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Fila de Itens Aguardando Balança
              </h3>

              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {pedidos.flatMap((p) =>
                  p.tarefas
                    .filter((t) => t.status !== "concluido")
                    .map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setTarefaSelecionadaPesagem({ pedidoId: p.id, tarefa: t })
                        }
                        className={`w-full text-left p-3.5 rounded-xl transition-all flex items-center justify-between ${
                          tarefaSelecionadaPesagem?.tarefa.id === t.id
                            ? "bg-blue-50 border-2 border-[#1a2a6c]"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{t.produtoNome}</div>
                          <div className="text-xs text-slate-500">
                            Pedido: <span className="font-mono">{p.numeroPedido}</span> • Resp:{" "}
                            <span className="font-semibold text-slate-700">
                              {t.ajudanteNome || "Sem ajudante"}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold bg-slate-100 px-2.5 py-1 rounded-md text-slate-700">
                          {t.quantidadeSolicitada} {t.unidadeMedida}
                        </span>
                      </button>
                    ))
                )}
              </div>
            </div>

            {/* Lado Direito: Terminal da Balança */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
              {tarefaSelecionadaPesagem ? (
                <>
                  <div className="border-b border-slate-100 pb-3">
                    <div className="text-xs font-bold text-blue-600 uppercase">
                      Pesando Item do Pedido
                    </div>
                    <div className="text-xl font-black text-slate-900">
                      {tarefaSelecionadaPesagem.tarefa.produtoNome}
                    </div>
                    <div className="text-xs text-slate-500">
                      Ajudante: {tarefaSelecionadaPesagem.tarefa.ajudanteNome} • Qtd:{" "}
                      {tarefaSelecionadaPesagem.tarefa.quantidadeSolicitada}{" "}
                      {tarefaSelecionadaPesagem.tarefa.unidadeMedida}
                    </div>
                  </div>

                  {/* Input Peso Bruto */}
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500">
                      Peso Bruto na Balança (kg)
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={pesoBrutoInput}
                        onChange={(e) => setPesoBrutoInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full text-3xl font-black px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-[#1a2a6c] outline-none font-mono"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                        KG
                      </span>
                    </div>
                  </div>

                  {/* Taras Carrinho e Caixa */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500">Carrinho</label>
                      <select
                        value={selectedCarrinhoId}
                        onChange={(e) => setSelectedCarrinhoId(e.target.value)}
                        className="w-full mt-1 p-2 text-xs font-bold border border-slate-300 rounded-lg outline-none"
                      >
                        <option value="">Nenhum (0 kg)</option>
                        {carrinhos.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome} ({c.taraKg} kg)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500">Caixa</label>
                      <select
                        value={selectedCaixaId}
                        onChange={(e) => setSelectedCaixaId(e.target.value)}
                        className="w-full mt-1 p-2 text-xs font-bold border border-slate-300 rounded-lg outline-none"
                      >
                        <option value="">Nenhuma (0 kg)</option>
                        {caixas.map((cx) => (
                          <option key={cx.id} value={cx.id}>
                            {cx.nome} ({cx.taraKg} kg)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Display Bruto -> Líquido */}
                  <div className="bg-[#1a2a6c] text-white p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase text-blue-200">Bruto</div>
                      <div className="text-xl font-mono font-bold">{pBruto.toFixed(2)} kg</div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-amber-400" />
                    <div>
                      <div className="text-[10px] uppercase text-amber-300">Líquido</div>
                      <div className="text-2xl font-mono font-black text-amber-300">
                        {pLiquido.toFixed(2)} kg
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={pBruto <= 0 || loadingAction}
                    onClick={handleSalvarPesagem}
                    className={`w-full py-3.5 rounded-xl font-black text-sm uppercase transition-all flex items-center justify-center gap-2 ${
                      pBruto > 0
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg cursor-pointer"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" /> Confirmar Pesagem da Balança
                  </button>
                </>
              ) : (
                <div className="p-12 text-center text-slate-400">
                  Selecione um item da fila ao lado para iniciar a pesagem na balança.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TABLET 3: ÁREA DE SEPARAÇÃO (Vista do Ajudante) */}
        {/* ========================================================= */}
        {tabletMode === "separador" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-base font-black text-slate-900">
              Minhas Tarefas de Separação Atribuídas
            </h3>
            <p className="text-xs text-slate-500">
              Separe os itens abaixo e leve-os até a balança para registro de tara e peso líquido.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              {pedidos.flatMap((p) =>
                p.tarefas
                  .filter((t) => t.status !== "concluido")
                  .map((t) => (
                    <div
                      key={t.id}
                      className="border-2 border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3 bg-slate-50/50"
                    >
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">
                          Pedido {p.numeroPedido}
                        </div>
                        <div className="font-black text-slate-900 text-base">{t.produtoNome}</div>
                        <div className="text-xs font-mono font-bold text-blue-700 mt-1">
                          Separar: {t.quantidadeSolicitada} {t.unidadeMedida}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">
                          👤 {t.ajudanteNome || "Não atribuído"}
                        </span>
                        <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                          {t.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TABLET 4: SETOR 15 (Controle de Cargas do Setor) */}
        {/* ========================================================= */}
        {tabletMode === "setor15" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-base font-black text-slate-900">Tarefas Destinadas ao Setor 15</h3>
            <p className="text-xs text-slate-500">
              Acompanhamento operacional das cargas e separações em andamento no setor.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600">
                  <tr>
                    <th className="p-3">Pedido</th>
                    <th className="p-3">Produto</th>
                    <th className="p-3">Quantidade</th>
                    <th className="p-3">Ajudante</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pedidos.flatMap((p) =>
                    p.tarefas.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold">{p.numeroPedido}</td>
                        <td className="p-3 font-bold text-slate-900">{t.produtoNome}</td>
                        <td className="p-3 font-semibold">
                          {t.quantidadeSolicitada} {t.unidadeMedida}
                        </td>
                        <td className="p-3">{t.ajudanteNome || "Pendente"}</td>
                        <td className="p-3">
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold uppercase">
                            {t.status.replace("_", " ")}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL NOVO PEDIDO / PDF */}
        {modalNovoPedido && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FileUp className="w-5 h-5 text-blue-600" />
                Importar Pedido para Separação
              </h3>
              <form onSubmit={handleCriarPedido} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-500">Número do Pedido</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: PED-2026-089"
                    value={novoNumPedido}
                    onChange={(e) => setNovoNumPedido(e.target.value)}
                    className="w-full mt-1 p-2.5 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-[#1a2a6c]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Cliente / Destino</label>
                  <input
                    type="text"
                    placeholder="Ex: Supermercados ABC"
                    value={novoCliente}
                    onChange={(e) => setNovoCliente(e.target.value)}
                    className="w-full mt-1 p-2.5 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-[#1a2a6c]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">
                    Itens do Pedido (Linha por linha: Produto, Qtd, Unidade)
                  </label>
                  <textarea
                    rows={5}
                    value={novoItensTexto}
                    onChange={(e) => setNovoItensTexto(e.target.value)}
                    className="w-full mt-1 p-2.5 text-xs font-mono border border-slate-300 rounded-xl outline-none focus:border-[#1a2a6c]"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalNovoPedido(false)}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#1a2a6c] text-white font-bold rounded-xl text-xs hover:bg-[#203a8f]"
                  >
                    Salvar e Liberar Pedido
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL REDISTRIBUIR COM JUSTIFICATIVA */}
        {modalRedistribuir && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-amber-600" />
                Redistribuição Auditada de Tarefa
              </h3>
              <div className="text-xs text-slate-600">
                Produto: <strong>{modalRedistribuir.tarefa.produtoNome}</strong>
                <br />
                Ajudante atual:{" "}
                <strong>{modalRedistribuir.tarefa.ajudanteNome || "Nenhum"}</strong>
              </div>

              <form onSubmit={handleSalvarRedistribuicao} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-500">Novo Ajudante</label>
                  <select
                    required
                    value={novoAjudanteUsuario}
                    onChange={(e) => setNovoAjudanteUsuario(e.target.value)}
                    className="w-full mt-1 p-2.5 text-xs font-bold border border-slate-300 rounded-xl outline-none"
                  >
                    <option value="">Selecione o novo responsável...</option>
                    {ajudantesLista.map((a) => (
                      <option key={a.usuario} value={a.usuario}>
                        {a.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">
                    Justificativa Obrigatória (Auditoria)
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Ex: Ajudante anterior realocado para descarregamento emergencial..."
                    value={justificativaRedist}
                    onChange={(e) => setJustificativaRedist(e.target.value)}
                    className="w-full mt-1 p-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-[#1a2a6c]"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalRedistribuir(null)}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#1a2a6c] text-white font-bold rounded-xl text-xs hover:bg-[#203a8f]"
                  >
                    Registrar Redistribuição
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
