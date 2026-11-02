import { NextResponse } from "next/server"
import { getPedidosSeparacao, criarPedidoSeparacao } from "@/lib/separacao"
import { getSession } from "@/lib/auth"
import { getSystemSettings } from "@/lib/settings"

export async function GET(request: Request) {
  try {
    const settings = await getSystemSettings()
    const session = getSession(request)

    // Se o módulo não estiver ativo e o usuário não for admin, bloqueia acesso público
    if (!settings.modulos?.moduloSeparacaoAtivo && session?.role !== "admin") {
      return NextResponse.json(
        { ok: false, error: "Módulo de separação em fase de testes interna." },
        { status: 403 }
      )
    }

    const pedidos = await getPedidosSeparacao()
    return NextResponse.json({ ok: true, pedidos })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = getSession(request)
    const body = await request.json()

    if (!body.itens || !Array.isArray(body.itens) || body.itens.length === 0) {
      return NextResponse.json(
        { ok: false, error: "É necessário informar ao menos um produto para o pedido." },
        { status: 400 }
      )
    }

    const criadoPor = session?.nome || session?.usuario || "Conferente"

    const novoPedido = await criarPedidoSeparacao({
      numeroPedido: body.numeroPedido,
      clienteNome: body.clienteNome,
      arquivoPdfNome: body.arquivoPdfNome,
      criadoPor,
      itens: body.itens,
    })

    return NextResponse.json({ ok: true, pedido: novoPedido })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
