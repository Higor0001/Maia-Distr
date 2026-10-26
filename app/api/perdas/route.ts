import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { supabaseFetch } from "@/lib/db"
import { lossSchema } from "@/lib/validation"
import fs from "fs/promises"
import path from "path"

const PERDAS_FILE = path.join(process.cwd(), "data", "perdas-ocorrencias.json")

interface OccurrenceRecord {
  id: string
  category: string
  photo: string
  items: unknown[]
  observation: string
  operatorName: string
  date: string
  status: string
  timestamp: number
}

async function getLocalPerdas(): Promise<OccurrenceRecord[]> {
  try {
    const raw = await fs.readFile(PERDAS_FILE, "utf-8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function saveLocalPerdas(list: OccurrenceRecord[]) {
  try {
    await fs.writeFile(PERDAS_FILE, JSON.stringify(list, null, 2), "utf-8")
  } catch (err) {
    console.error("Erro ao salvar perdas locais:", err)
  }
}

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") || ""

  // 1. Tenta Supabase
  try {
    const response = await supabaseFetch(
      "perdas_ocorrencias?select=id,category,operator_name,observation,items,total_weight_kg,date,timestamp,status&order=timestamp.desc&limit=200"
    )
    if (response?.ok) {
      const rows = await response.json()
      if (Array.isArray(rows)) {
        const occurrences: OccurrenceRecord[] = rows
          .map((row) => ({
            id: String(row.id),
            category: String(row.category),
            photo: "",
            items: Array.isArray(row.items) ? row.items : [],
            observation: String(row.observation || ""),
            operatorName: String(row.operator_name || ""),
            date: String(row.date || ""),
            status: row.status || "sent",
            timestamp: Number(row.timestamp || 0),
          }))
          .filter((item) => !date || item.date.startsWith(date))

        // Mantém cópia local sincronizada se houver dados
        if (occurrences.length > 0) {
          void saveLocalPerdas(occurrences)
        }

        return NextResponse.json({ ok: true, occurrences })
      }
    }
  } catch (err) {
    console.error("[Supabase] Falha ao carregar perdas:", err)
  }

  // 2. Fallback local
  const localList = await getLocalPerdas()
  const filtered = localList.filter((item) => !date || item.date.startsWith(date))
  return NextResponse.json({ ok: true, occurrences: filtered })
}

export async function POST(request: Request) {
  const session = getSession(request)
  const parsed = lossSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || "Perda inválida." }, { status: 400 })
  }

  const data = parsed.data
  const timestamp = data.timestamp || Date.now()
  const opName = session?.nome || data.operatorName || "Operador"
  const occurrence = {
    id: data.id || crypto.randomUUID(),
    category: data.category,
    operator_name: opName,
    observation: data.observation || "",
    items: data.items,
    total_weight_kg: data.items.reduce((sum, item) => sum + item.weightKg, 0),
    date: data.date || new Date().toLocaleString("pt-BR"),
    timestamp,
    status: data.status || "sent",
  }

  // 1. Tenta salvar no Supabase
  let savedInSupabase = false
  try {
    const response = await supabaseFetch("perdas_ocorrencias?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(occurrence),
    })
    if (response?.ok) {
      savedInSupabase = true
    }
  } catch (err) {
    console.error("[Supabase] Erro ao salvar perda no Supabase:", err)
  }

  // 2. Mantém cópia local sincronizada
  const localList = await getLocalPerdas()
  const localItem: OccurrenceRecord = {
    id: occurrence.id,
    category: occurrence.category,
    photo: "",
    items: occurrence.items,
    observation: occurrence.observation,
    operatorName: opName,
    date: occurrence.date,
    status: occurrence.status,
    timestamp: occurrence.timestamp,
  }
  const nextList = [localItem, ...localList.filter((o) => o.id !== occurrence.id)]
  await saveLocalPerdas(nextList)

  return NextResponse.json({
    ok: true,
    occurrence: { ...occurrence, operatorName: opName, photo: "" },
    savedInCloud: savedInSupabase,
  })
}

