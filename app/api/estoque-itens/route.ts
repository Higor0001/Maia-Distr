import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { supabaseFetch } from "@/lib/db"

export type TipoUnidade = "cx" | "kg" | "sc" | "bdj" | "dz" | "un"

export interface EstoqueItem {
  reduzido: string
  descricao: string
  palletTotal: number
  lastro: number
  unidade?: boolean
  tipoUnidade?: TipoUnidade
  taraKg?: number
}

const DATA_DIR = path.join(process.cwd(), "data")
const ITEMS_FILE = path.join(DATA_DIR, "estoque-itens.json")

function loadItemsFromDbFile(): EstoqueItem[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (!fs.existsSync(ITEMS_FILE)) {
      fs.writeFileSync(ITEMS_FILE, "[]", "utf-8")
      return []
    }
    const raw = fs.readFileSync(ITEMS_FILE, "utf-8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveItemsToDbFile(items: EstoqueItem[]) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  fs.writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2), "utf-8")
}

export async function GET() {
  try {
    const supaRes = await supabaseFetch(
      "estoque_itens?ativo=eq.true&order=reduzido.asc"
    )
    if (supaRes) {
      if (!supaRes.ok) {
        return NextResponse.json(
          { ok: false, error: "Falha ao consultar produtos no banco de dados." },
          { status: 502 }
        )
      }
      const rows = await supaRes.json()
      const mapped: EstoqueItem[] = Array.isArray(rows)
        ? rows.map((r: any) => ({
            reduzido: String(r.reduzido),
            descricao: String(r.descricao),
            palletTotal: Number(r.pallet_total ?? r.palletTotal ?? 0),
            lastro: Number(r.lastro ?? 0),
            unidade: Boolean(r.unidade),
            tipoUnidade: (r.tipo_unidade || r.tipoUnidade || "cx") as TipoUnidade,
            taraKg: Number(r.tara_kg ?? r.taraKg ?? 0),
          }))
        : []
      return NextResponse.json({ ok: true, items: mapped })
    }

    const items = loadItemsFromDbFile()
    return NextResponse.json({ ok: true, items })
  } catch (error) {
    console.error("GET /api/estoque-itens error:", error)
    return NextResponse.json(
      { ok: false, error: "Falha ao carregar itens do banco." },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Suporte para importação em lote no banco (body.items = [...])
    const incomingList: any[] = Array.isArray(body?.items) ? body.items : [body]
    const normalizedItems: EstoqueItem[] = []

    for (const raw of incomingList) {
      const reduzido = String(raw?.reduzido || "").replace(/\D+/g, "")
      const descricao = String(raw?.descricao || "").trim()
      const palletTotal = Math.max(0, Number(raw?.palletTotal) || 0)
      const lastro = Math.max(0, Number(raw?.lastro) || 0)
      const unidade = Boolean(raw?.unidade)
      const tipoUnidade = (raw?.tipoUnidade || "cx") as TipoUnidade
      const taraKg = Math.max(0, Number(raw?.taraKg) || 0)

      if (reduzido && descricao) {
        normalizedItems.push({
          reduzido,
          descricao,
          palletTotal,
          lastro,
          unidade,
          tipoUnidade,
          taraKg,
        })
      }
    }

    if (!normalizedItems.length) {
      return NextResponse.json(
        { ok: false, error: "Preencha codigo e descricao." },
        { status: 400 }
      )
    }

    const supaPayload = normalizedItems.map((item) => ({
      reduzido: item.reduzido,
      descricao: item.descricao,
      pallet_total: item.palletTotal,
      lastro: item.lastro,
      unidade: Boolean(item.unidade),
      tipo_unidade: item.tipoUnidade || "cx",
      tara_kg: item.taraKg || 0,
      ativo: true,
      updated_at: new Date().toISOString(),
    }))

    const supaRes = await supabaseFetch("estoque_itens?on_conflict=reduzido", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(supaPayload),
    })

    if (supaRes && !supaRes.ok) {
      return NextResponse.json(
        { ok: false, error: "Falha ao salvar produto no banco de dados." },
        { status: 502 }
      )
    }

    const items = loadItemsFromDbFile()
    for (const newItem of normalizedItems) {
      const existingIndex = items.findIndex((item) => item.reduzido === newItem.reduzido)
      if (existingIndex >= 0) {
        items[existingIndex] = newItem
      } else {
        items.unshift(newItem)
      }
    }
    saveItemsToDbFile(items)

    return NextResponse.json({
      ok: true,
      item: normalizedItems[0],
      addedCount: normalizedItems.length,
      items,
    })
  } catch (error) {
    console.error("POST /api/estoque-itens error:", error)
    return NextResponse.json(
      { ok: false, error: "Falha ao salvar item no banco." },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reduzido = (searchParams.get("reduzido") || "").replace(/\D+/g, "")

    if (!reduzido) {
      return NextResponse.json(
        { ok: false, error: "Informe o codigo reduzido para excluir." },
        { status: 400 }
      )
    }

    await supabaseFetch(`estoque_itens?reduzido=eq.${encodeURIComponent(reduzido)}`, {
      method: "DELETE",
    })

    const items = loadItemsFromDbFile().filter((i) => i.reduzido !== reduzido)
    saveItemsToDbFile(items)

    return NextResponse.json({ ok: true, items })
  } catch (error) {
    console.error("DELETE /api/estoque-itens error:", error)
    return NextResponse.json(
      { ok: false, error: "Falha ao remover item do banco." },
      { status: 500 }
    )
  }
}
