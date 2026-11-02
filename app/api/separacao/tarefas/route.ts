import { NextResponse } from "next/server"
import {
  sortearAjudantes,
  redistribuirTarefa,
  registrarPesagemSeparacao,
  aprovarTarefaSeparacao,
  getPedidosSeparacao,
  savePedidosSeparacao,
} from "@/lib/separacao"
import { getSession } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const session = getSession(request)
    const body = await request.json()
    const { action, pedidoId, tarefaId } = body

    if (!action || !pedidoId) {
      return NextResponse.json({ ok: false, error: "Ação e pedidoId são obrigatórios." }, { status: 400 })
    }

    // 1. SORTEIO AUTOMÁTICO DE AJUDANTES
    if (action === "sorteio") {
      const { ajudantes } = body
      const pedidoAtualizado = await sortearAjudantes(pedidoId, ajudantes)
      return NextResponse.json({ ok: true, pedido: pedidoAtualizado })
    }

    // 2. ATRIBUIÇÃO MANUAL
    if (action === "atribuir_manual") {
      const { ajudante } = body
      const pedidos = await getPedidosSeparacao()
      const pedido = pedidos.find((p) => p.id === pedidoId)
      if (!pedido) throw new Error("Pedido não encontrado.")

      const tarefa = pedido.tarefas.find((t) => t.id === tarefaId)
      if (!tarefa) throw new Error("Tarefa não encontrada.")

      tarefa.ajudanteUsuario = ajudante.usuario
      tarefa.ajudanteNome = ajudante.nome
      tarefa.modalidadeDistribuicao = "manual"
      tarefa.status = "aguardando_separacao"
      tarefa.updatedAt = new Date().toISOString()

      pedido.status = "em_separacao"
      await savePedidosSeparacao(pedidos)
      return NextResponse.json({ ok: true, tarefa })
    }

    // 3. REDISTRIBUIÇÃO AUDITADA
    if (action === "redistribuir") {
      const { novoAjudante, justificativa } = body
      if (!novoAjudante || !justificativa) {
        return NextResponse.json(
          { ok: false, error: "Novo ajudante e justificativa são obrigatórios." },
          { status: 400 }
        )
      }
      const conferente = session?.nome || session?.usuario || "Conferente"
      const tarefaAtualizada = await redistribuirTarefa({
        pedidoId,
        tarefaId,
        novoAjudante,
        conferente,
        justificativa,
      })
      return NextResponse.json({ ok: true, tarefa: tarefaAtualizada })
    }

    // 4. PESAGEM NA BALANÇA
    if (action === "pesagem") {
      const { pesoBruto, taraTotal, pesoLiquido, observacao } = body
      const operador = session?.nome || session?.usuario || "Balança"
      const tarefaAtualizada = await registrarPesagemSeparacao({
        pedidoId,
        tarefaId,
        pesoBruto: Number(pesoBruto),
        taraTotal: Number(taraTotal || 0),
        pesoLiquido: Number(pesoLiquido),
        operadorPesagem: operador,
        observacao,
      })
      return NextResponse.json({ ok: true, tarefa: tarefaAtualizada })
    }

    // 5. APROVAÇÃO FINAL DO CONFERENTE
    if (action === "aprovar") {
      const conferente = session?.nome || session?.usuario || "Conferente"
      const tarefaAtualizada = await aprovarTarefaSeparacao({
        pedidoId,
        tarefaId,
        conferente,
      })
      return NextResponse.json({ ok: true, tarefa: tarefaAtualizada })
    }

    return NextResponse.json({ ok: false, error: `Ação '${action}' inválida.` }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
