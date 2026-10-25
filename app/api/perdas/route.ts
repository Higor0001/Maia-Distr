import { NextResponse } from "next/server"
import { requireSession } from "@/lib/auth"
import { supabaseFetch } from "@/lib/db"
import { lossSchema } from "@/lib/validation"

export async function GET(request: Request) {
  const auth = requireSession(request)
  if ("response" in auth) return auth.response
  const date = new URL(request.url).searchParams.get("date") || ""
  const response = await supabaseFetch("perdas_ocorrencias?select=id,category,operator_name,observation,items,total_weight_kg,date,timestamp,status&order=timestamp.desc&limit=200")
  if (!response?.ok) return NextResponse.json({ ok: false, error: "Não foi possível carregar perdas." }, { status: 502 })
  const rows = await response.json()
  const occurrences = Array.isArray(rows) ? rows.map((row) => ({
    id: String(row.id), category: String(row.category), photo: "", items: Array.isArray(row.items) ? row.items : [],
    observation: String(row.observation || ""), operatorName: String(row.operator_name || ""), date: String(row.date || ""),
    status: row.status || "sent", timestamp: Number(row.timestamp || 0),
  })).filter((item) => !date || item.date.startsWith(date)) : []
  return NextResponse.json({ ok: true, occurrences })
}

export async function POST(request: Request) {
  const auth = requireSession(request)
  if ("response" in auth) return auth.response
  const parsed = lossSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || "Perda inválida." }, { status: 400 })
  const data = parsed.data
  const timestamp = data.timestamp || Date.now()
  const occurrence = {
    id: data.id || crypto.randomUUID(), category: data.category, operator_name: auth.session.nome,
    observation: data.observation, items: data.items, total_weight_kg: data.items.reduce((sum, item) => sum + item.weightKg, 0),
    date: data.date || new Date().toLocaleString("pt-BR"), timestamp, status: data.status,
  }
  const response = await supabaseFetch("perdas_ocorrencias?on_conflict=id", {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(occurrence),
  })
  if (!response?.ok) return NextResponse.json({ ok: false, error: "Não foi possível salvar a perda." }, { status: 502 })
  return NextResponse.json({ ok: true, occurrence: { ...occurrence, operatorName: occurrence.operator_name, photo: "" } })
}
