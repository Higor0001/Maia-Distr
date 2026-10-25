import { NextResponse } from "next/server"
import { requireSession } from "@/lib/auth"
import { supabaseFetch } from "@/lib/db"
import { stockRecordSchema } from "@/lib/validation"

export async function GET(request: Request) {
  const auth = requireSession(request)
  if ("response" in auth) return auth.response
  const { searchParams } = new URL(request.url)
  const scope = searchParams.get("scope") === "matriz" ? "matriz" : "filial"
  const date = searchParams.get("date") || ""
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 10)))
  if (auth.session.unidade !== "matriz" && scope !== auth.session.unidade) return NextResponse.json({ ok: false, error: "Sem acesso a esta unidade." }, { status: 403 })
  const dateFilter = /^\d{2}\/\d{2}\/\d{4}$/.test(date) ? `&date=eq.${encodeURIComponent(date)}` : ""
  const response = await supabaseFetch(`estoque_contagens?select=id,scope,date,contador,items,updated_at&scope=eq.${scope}${dateFilter}&order=updated_at.desc&limit=${limit}`)
  if (!response?.ok) return NextResponse.json({ ok: false, error: "Não foi possível carregar contagens." }, { status: 502 })
  const rows = await response.json()
  return NextResponse.json({ ok: true, records: Array.isArray(rows) ? rows.map((row) => ({ id: row.id, scope: row.scope, date: row.date, contador: row.contador, items: row.items || [], updatedAt: row.updated_at })) : [] })
}

export async function POST(request: Request) {
  const auth = requireSession(request)
  if ("response" in auth) return auth.response
  const parsed = stockRecordSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || "Contagem inválida." }, { status: 400 })
  if (auth.session.unidade !== "matriz" && parsed.data.scope !== auth.session.unidade) return NextResponse.json({ ok: false, error: "Sem acesso a esta unidade." }, { status: 403 })
  const id = `${parsed.data.scope}_${parsed.data.date.replaceAll("/", "-")}`
  const updatedAt = new Date().toISOString()
  const response = await supabaseFetch("estoque_contagens?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ id, ...parsed.data, contador: auth.session.nome, updated_at: updatedAt }),
  })
  if (!response?.ok) return NextResponse.json({ ok: false, error: "Não foi possível salvar a contagem." }, { status: 502 })
  return NextResponse.json({ ok: true, record: { id, ...parsed.data, contador: auth.session.nome, updatedAt } })
}
