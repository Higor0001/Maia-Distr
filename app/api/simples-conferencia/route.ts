import { NextResponse } from "next/server"
import { getSimplesConferencias, addSimplesConferencia } from "@/lib/conferencia"
import { getSession } from "@/lib/auth"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get("limit") || "100")
    const list = await getSimplesConferencias(limit)
    return NextResponse.json({ ok: true, list })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = getSession(request)
    const body = await request.json()
    const responsavel = body.responsavel || session?.nome || session?.usuario || "Operador Balança"

    // Suporte a lote de múltiplos itens adicionados
    if (Array.isArray(body.items) && body.items.length > 0) {
      const savedItems = []
      for (const it of body.items) {
        if (!it.produtoNome || it.pesoBruto === undefined) continue
        const saved = await addSimplesConferencia({
          produtoReduzido: it.produtoReduzido,
          produtoNome: it.produtoNome,
          responsavel,
          pesoBruto: Number(it.pesoBruto),
          tipoCarrinhoId: it.tipoCarrinhoId,
          tipoCarrinhoNome: it.tipoCarrinhoNome,
          taraCarrinhoKg: Number(it.taraCarrinhoKg || 0),
          tipoCaixaId: it.tipoCaixaId,
          tipoCaixaNome: it.tipoCaixaNome,
          quantidadeCaixas: Math.max(1, Number(it.quantidadeCaixas) || 1),
          taraCaixaKg: Number(it.taraCaixaKg || 0),
          pesoLiquido: Number(it.pesoLiquido),
          observacao: it.observacao || body.observacao || "",
          fotoUrl: it.fotoUrl || body.fotoUrl || "",
        })
        savedItems.push(saved)
      }
      return NextResponse.json({ ok: true, items: savedItems, count: savedItems.length })
    }

    if (!body.produtoNome || body.pesoBruto === undefined) {
      return NextResponse.json(
        { ok: false, error: "Produto e peso bruto são obrigatórios." },
        { status: 400 }
      )
    }

    const saved = await addSimplesConferencia({
      produtoReduzido: body.produtoReduzido,
      produtoNome: body.produtoNome,
      responsavel,
      pesoBruto: Number(body.pesoBruto),
      tipoCarrinhoId: body.tipoCarrinhoId,
      tipoCarrinhoNome: body.tipoCarrinhoNome,
      taraCarrinhoKg: Number(body.taraCarrinhoKg || 0),
      tipoCaixaId: body.tipoCaixaId,
      tipoCaixaNome: body.tipoCaixaNome,
      quantidadeCaixas: Math.max(1, Number(body.quantidadeCaixas) || 1),
      taraCaixaKg: Number(body.taraCaixaKg || 0),
      pesoLiquido: Number(body.pesoLiquido),
      observacao: body.observacao,
      fotoUrl: body.fotoUrl,
    })

    return NextResponse.json({ ok: true, item: saved })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
