import { NextResponse } from "next/server"
import { requireSession } from "@/lib/auth"
import { supabaseFetch } from "@/lib/db"
import { stockItemSchema } from "@/lib/validation"

const select = "reduzido,descricao,pallet_total,lastro,unidade,tipo_unidade,tara_kg,peso_kg,ativo"

function mapItem(row: Record<string, unknown>) {
  return {
    reduzido: String(row.reduzido),
    descricao: String(row.descricao),
    palletTotal: Number(row.pallet_total || 0),
    lastro: Number(row.lastro || 0),
    unidade: Boolean(row.unidade),
    tipoUnidade: String(row.tipo_unidade || "cx"),
    taraKg: Number(row.tara_kg || 0),
    pesoKg: Number(row.peso_kg || 0),
  }
}

export async function GET(request: Request) {
  const auth = requireSession(request)
  if ("response" in auth) return auth.response
  const response = await supabaseFetch(`estoque_itens?select=${select}&ativo=eq.true&order=reduzido.asc`)
  if (!response?.ok) return NextResponse.json({ ok: false, error: "Não foi possível carregar os produtos." }, { status: 502 })
  const rows = await response.json()
  return NextResponse.json({ ok: true, items: Array.isArray(rows) ? rows.map(mapItem) : [] })
}

export async function POST(request: Request) {
  const auth = requireSession(request)
  if ("response" in auth) return auth.response
  if (!auth.session.canRegister && auth.session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Sem permissão para alterar o catálogo." }, { status: 403 })
  }

  const body = await request.json()
  const rawItems = Array.isArray(body?.items) ? body.items : [body]
  const parsed = stockItemSchema.array().min(1).max(1000).safeParse(rawItems)
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || "Produto inválido." }, { status: 400 })

  const payload = parsed.data.map((item) => ({
    reduzido: item.reduzido,
    descricao: item.descricao,
    pallet_total: item.palletTotal,
    lastro: item.lastro,
    unidade: item.unidade,
    tipo_unidade: item.tipoUnidade,
    tara_kg: item.taraKg,
    peso_kg: item.pesoKg,
    ativo: true,
    updated_at: new Date().toISOString(),
  }))
  const response = await supabaseFetch("estoque_itens?on_conflict=reduzido", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload),
  })
  if (!response?.ok) return NextResponse.json({ ok: false, error: "Não foi possível salvar o produto." }, { status: 502 })
  return NextResponse.json({ ok: true, items: (await response.json()).map(mapItem) })
}

export async function DELETE(request: Request) {
  const auth = requireSession(request)
  if ("response" in auth) return auth.response
  if (auth.session.role !== "admin") return NextResponse.json({ ok: false, error: "Apenas administradores podem inativar produtos." }, { status: 403 })
  const reduzido = new URL(request.url).searchParams.get("reduzido") || ""
  if (!/^\d{1,30}$/.test(reduzido)) return NextResponse.json({ ok: false, error: "Código inválido." }, { status: 400 })
  const response = await supabaseFetch(`estoque_itens?reduzido=eq.${encodeURIComponent(reduzido)}`, {
    method: "PATCH",
    body: JSON.stringify({ ativo: false, updated_at: new Date().toISOString() }),
  })
  if (!response?.ok) return NextResponse.json({ ok: false, error: "Não foi possível inativar o produto." }, { status: 502 })
  return NextResponse.json({ ok: true })
}
