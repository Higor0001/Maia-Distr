import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { supabaseFetch } from "@/lib/db"

export interface EstoqueCountItem {
  reduzido: string
  descricao: string
  pallets?: string
  lastros?: string
  fardos?: string
  unidades?: string
  pickingPallets?: string
  pickingLastros?: string
  pickingFardos?: string
  pickingUnidades?: string
  avariaPallets?: string
  avariaLastros?: string
  avariaFardos?: string
  avariaUnidades?: string
  faltante?: boolean
  quantidadeTotal?: number
}

export interface EstoqueRecord {
  id: string
  scope: string
  date: string
  contador: string
  items: EstoqueCountItem[]
  updatedAt: string
}

const DATA_DIR = path.join(process.cwd(), "data")
const RECORDS_FILE = path.join(DATA_DIR, "estoque-records.json")

function loadRecords(): EstoqueRecord[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (!fs.existsSync(RECORDS_FILE)) {
      return []
    }
    const raw = fs.readFileSync(RECORDS_FILE, "utf-8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRecords(records: EstoqueRecord[]) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  fs.writeFileSync(RECORDS_FILE, JSON.stringify(records, null, 2), "utf-8")
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") || ""
    const scope = searchParams.get("scope") || "filial"
    const limit = Number(searchParams.get("limit") || "10")

    // Tentar carregar do Supabase caso configurado
    const queryParts = [`scope=eq.${encodeURIComponent(scope)}`, `order=updated_at.desc`, `limit=${Math.max(1, limit)}`]
    if (date) queryParts.push(`date=eq.${encodeURIComponent(date)}`)
    const supaRes = await supabaseFetch(`estoque_contagens?${queryParts.join("&")}`)
    if (supaRes && supaRes.ok) {
      const rows = await supaRes.json()
      if (Array.isArray(rows) && rows.length > 0) {
        return NextResponse.json({
          ok: true,
          records: rows.map((r: any) => ({
            id: r.id,
            scope: r.scope,
            date: r.date,
            contador: r.contador,
            items: r.items || [],
            updatedAt: r.updated_at || r.updatedAt,
          })),
        })
      }
    }

    const records = loadRecords()
    const filtered = records.filter((rec) => {
      if (date && rec.date !== date) return false
      if (scope && rec.scope !== scope) return false
      return true
    })

    return NextResponse.json({
      ok: true,
      records: filtered.slice(0, Math.max(1, limit)),
    })
  } catch (error) {
    console.error("GET /api/estoque error:", error)
    return NextResponse.json(
      { ok: false, error: "Falha ao carregar contagem." },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const scope = String(body?.scope || "filial")
    const date = String(body?.date || "").trim()
    const contador = String(body?.contador || "").trim()
    const items = Array.isArray(body?.items) ? body.items : []

    if (!date || !contador) {
      return NextResponse.json(
        { ok: false, error: "Informe data e contador." },
        { status: 400 }
      )
    }

    const record: EstoqueRecord = {
      id: `${scope}_${date.replace(/\//g, "-")}`,
      scope,
      date,
      contador,
      items,
      updatedAt: new Date().toISOString(),
    }

    // Sincronizar com Supabase caso configurado
    await supabaseFetch("estoque_contagens?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        id: record.id,
        scope: record.scope,
        date: record.date,
        contador: record.contador,
        items: record.items,
        updated_at: record.updatedAt,
      }),
    }).catch((err) => console.warn("Supabase count sync warning:", err))

    const records = loadRecords()
    const existingIndex = records.findIndex(
      (rec) => rec.date === date && rec.scope === scope
    )

    if (existingIndex >= 0) {
      records[existingIndex] = record
    } else {
      records.unshift(record)
    }

    saveRecords(records)
    return NextResponse.json({ ok: true, record })
  } catch (error) {
    console.error("POST /api/estoque error:", error)
    return NextResponse.json(
      { ok: false, error: "Falha ao salvar contagem." },
      { status: 500 }
    )
  }
}
