import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { supabaseFetch } from "@/lib/db"
import { stockRecordSchema } from "@/lib/validation"
import fs from "fs/promises"
import path from "path"

const CONTAGENS_FILE = path.join(process.cwd(), "data", "estoque-contagens.json")

interface ContagemRecord {
  id: string
  scope: string
  date: string
  contador: string
  items: unknown[]
  updatedAt: string
}

async function getLocalContagens(): Promise<ContagemRecord[]> {
  try {
    const raw = await fs.readFile(CONTAGENS_FILE, "utf-8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function saveLocalContagens(list: ContagemRecord[]) {
  try {
    await fs.writeFile(CONTAGENS_FILE, JSON.stringify(list, null, 2), "utf-8")
  } catch (err) {
    console.error("Erro ao salvar contagens locais:", err)
  }
}

export async function GET(request: Request) {
  const session = getSession(request)
  const { searchParams } = new URL(request.url)
  const scope = searchParams.get("scope") === "matriz" ? "matriz" : "filial"
  const date = searchParams.get("date") || ""
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 10)))

  if (session && session.unidade !== "matriz" && scope !== session.unidade) {
    return NextResponse.json({ ok: false, error: "Sem acesso a esta unidade." }, { status: 403 })
  }

  // Tenta Supabase
  try {
    const dateFilter = /^\d{2}\/\d{2}\/\d{4}$/.test(date) ? `&date=eq.${encodeURIComponent(date)}` : ""
    const response = await supabaseFetch(
      `estoque_contagens?select=id,scope,date,contador,items,updated_at&scope=eq.${scope}${dateFilter}&order=updated_at.desc&limit=${limit}`
    )
    if (response?.ok) {
      const rows = await response.json()
      if (Array.isArray(rows)) {
        return NextResponse.json({
          ok: true,
          records: rows.map((row) => ({
            id: row.id,
            scope: row.scope,
            date: row.date,
            contador: row.contador,
            items: row.items || [],
            updatedAt: row.updated_at,
          })),
        })
      }
    }
  } catch (err) {
    console.error("[Supabase] Erro ao buscar estoque_contagens:", err)
  }

  // Fallback local
  const localList = await getLocalContagens()
  const filtered = localList
    .filter((c) => c.scope === scope && (!date || c.date === date))
    .slice(0, limit)

  return NextResponse.json({ ok: true, records: filtered })
}

export async function POST(request: Request) {
  const session = getSession(request)
  const parsed = stockRecordSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || "Contagem inválida." }, { status: 400 })
  }

  if (session && session.unidade !== "matriz" && parsed.data.scope !== session.unidade) {
    return NextResponse.json({ ok: false, error: "Sem acesso a esta unidade." }, { status: 403 })
  }

  const id = `${parsed.data.scope}_${parsed.data.date.replaceAll("/", "-")}`
  const updatedAt = new Date().toISOString()
  const contadorNome = session?.nome || parsed.data.contador

  // 1. Tenta salvar no Supabase
  let savedInSupabase = false
  try {
    const response = await supabaseFetch("estoque_contagens?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        id,
        scope: parsed.data.scope,
        date: parsed.data.date,
        contador: contadorNome,
        items: parsed.data.items,
        updated_at: updatedAt,
      }),
    })
    if (response?.ok) {
      savedInSupabase = true
    }
  } catch (err) {
    console.error("[Supabase] Erro ao salvar contagem:", err)
  }

  // 2. Mantém cópia local sincronizada
  const localList = await getLocalContagens()
  const record: ContagemRecord = {
    id,
    scope: parsed.data.scope,
    date: parsed.data.date,
    contador: contadorNome,
    items: parsed.data.items,
    updatedAt,
  }
  const nextList = [record, ...localList.filter((c) => c.id !== id)]
  await saveLocalContagens(nextList)

  return NextResponse.json({
    ok: true,
    record,
    savedInCloud: savedInSupabase,
  })
}

