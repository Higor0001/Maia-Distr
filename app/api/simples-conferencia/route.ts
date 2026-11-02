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

    if (!body.produtoNome || body.pesoBruto === undefined) {
      return NextResponse.json(
        { ok: false, error: "Produto e peso bruto são obrigatórios." },
        { status: 400 }
      )
    }

    const responsavel = body.responsavel || session?.nome || session?.usuario || "Operador Balança"

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
