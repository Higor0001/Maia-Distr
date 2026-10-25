import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { supabaseFetch } from "@/lib/db"

export interface PerdaItem {
  id: string
  name: string
  weightKg: number
  grossWeightKg?: number
  boxesCount?: number
  tarePerBoxKg?: number
}

export interface PerdaOccurrence {
  id: string
  category: string
  photo: string
  items: PerdaItem[]
  observation: string
  operatorName?: string
  date: string
  status: "sent" | "pending" | "error"
  timestamp: number
}

const DATA_DIR = path.join(process.cwd(), "data")
const PERDAS_FILE = path.join(DATA_DIR, "perdas-ocorrencias.json")

function loadPerdasFromDbFile(): PerdaOccurrence[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (!fs.existsSync(PERDAS_FILE)) {
      fs.writeFileSync(PERDAS_FILE, "[]", "utf-8")
      return []
    }
    const raw = fs.readFileSync(PERDAS_FILE, "utf-8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function savePerdasToDbFile(list: PerdaOccurrence[]) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  fs.writeFileSync(PERDAS_FILE, JSON.stringify(list, null, 2), "utf-8")
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const datePrefix = searchParams.get("date") || "" // ex: "25/10/2026"

    const supaRes = await supabaseFetch(
      "perdas_ocorrencias?order=timestamp.desc&limit=200"
    )
    if (supaRes && supaRes.ok) {
      const rows = await supaRes.json()
      if (Array.isArray(rows)) {
        const mapped: PerdaOccurrence[] = rows.map((r: any) => ({
          id: String(r.id),
          category: String(r.category),
          photo: String(r.photo || ""),
          items: Array.isArray(r.items) ? r.items : [],
          observation: String(r.observation || ""),
          operatorName: String(r.operator_name || ""),
          date: String(r.date || ""),
          status: (r.status || "sent") as "sent" | "pending" | "error",
          timestamp: Number(r.timestamp || Date.now()),
        }))
        const filtered = datePrefix
          ? mapped.filter((o) => o.date.startsWith(datePrefix))
          : mapped
        return NextResponse.json({ ok: true, occurrences: filtered })
      }
    }

    const list = loadPerdasFromDbFile()
    const filtered = datePrefix
      ? list.filter((o) => o.date.startsWith(datePrefix))
      : list
    return NextResponse.json({ ok: true, occurrences: filtered })
  } catch (error) {
    console.error("GET /api/perdas error:", error)
    return NextResponse.json(
      { ok: false, error: "Falha ao carregar ocorrencias de perdas." },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const id = String(body?.id || Date.now())
    const category = String(body?.category || "")
    const items: PerdaItem[] = Array.isArray(body?.items) ? body.items : []
    const observation = String(body?.observation || "")
    const operatorName = String(body?.operatorName || "")
    const date = String(body?.date || new Date().toLocaleString("pt-BR"))
    const status = (body?.status || "sent") as "sent" | "pending" | "error"
    const timestamp = Number(body?.timestamp || Date.now())
    const photo = String(body?.photo || "")

    if (!category || !items.length) {
      return NextResponse.json(
        { ok: false, error: "Categoria e itens sao obrigatorios." },
        { status: 400 }
      )
    }

    const totalWeightKg = items.reduce(
      (sum, item) => sum + (Number(item.weightKg) || 0),
      0
    )

    await supabaseFetch("perdas_ocorrencias?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        id,
        category,
        operator_name: operatorName,
        observation,
        items,
        total_weight_kg: totalWeightKg,
        date,
        timestamp,
        status,
      }),
    }).catch((err) => console.warn("Supabase perdas sync warning:", err))

    const list = loadPerdasFromDbFile()
    const occurrence: PerdaOccurrence = {
      id,
      category,
      photo,
      items,
      observation,
      operatorName,
      date,
      status,
      timestamp,
    }

    const idx = list.findIndex((o) => o.id === id)
    if (idx >= 0) {
      list[idx] = occurrence
    } else {
      list.unshift(occurrence)
    }
    savePerdasToDbFile(list)

    return NextResponse.json({ ok: true, occurrence })
  } catch (error) {
    console.error("POST /api/perdas error:", error)
    return NextResponse.json(
      { ok: false, error: "Falha ao salvar ocorrencia no banco." },
      { status: 500 }
    )
  }
}
