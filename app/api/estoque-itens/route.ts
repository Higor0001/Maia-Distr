import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { supabaseFetch, getSupabaseConfig } from "@/lib/db"
import { stockItemSchema } from "@/lib/validation"
import fs from "fs/promises"
import path from "path"

const select = "reduzido,descricao,pallet_total,lastro,unidade,tipo_unidade,tara_kg,peso_kg,ativo"

interface MappedItem {
  reduzido: string
  descricao: string
  palletTotal: number
  lastro: number
  unidade: boolean
  tipoUnidade: string
  taraKg: number
  pesoKg: number
}

function mapItem(row: Record<string, unknown>): MappedItem {
  const code = String(row.reduzido ?? row.codigo ?? row.id ?? "").trim()
  const desc = String(row.descricao ?? row.nome ?? "").trim()
  return {
    reduzido: code,
    descricao: desc,
    palletTotal: Number(row.pallet_total ?? row.palletTotal ?? 0),
    lastro: Number(row.lastro ?? 0),
    unidade: Boolean(row.unidade),
    tipoUnidade: String(row.tipo_unidade ?? row.tipoUnidade ?? row.unidade ?? "cx").toLowerCase(),
    taraKg: Number(row.tara_kg ?? row.taraKg ?? 0),
    pesoKg: Number(row.peso_kg ?? row.pesoKg ?? 0),
  }
}

async function getLocalItems(): Promise<MappedItem[]> {
  try {
    const filePath = path.join(process.cwd(), "data", "estoque-itens.json")
    const content = await fs.readFile(filePath, "utf-8")
    const list = JSON.parse(content)
    if (Array.isArray(list)) {
      return list.map(mapItem).filter((i) => i.reduzido && i.descricao)
    }
  } catch (err) {
    console.error("Erro ao ler data/estoque-itens.json:", err)
  }
  return []
}

async function saveLocalItems(items: MappedItem[]) {
  try {
    const filePath = path.join(process.cwd(), "data", "estoque-itens.json")
    await fs.writeFile(filePath, JSON.stringify(items, null, 2), "utf-8")
  } catch (err) {
    console.error("Erro ao salvar data/estoque-itens.json:", err)
  }
}

async function seedSupabaseItems(items: MappedItem[]) {
  try {
    const payload = items.map((item) => ({
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
    const res = await supabaseFetch("estoque_itens?on_conflict=reduzido", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(payload),
    })
    if (res?.ok) {
      console.info(`[Supabase] ${payload.length} produtos sincronizados automaticamente com Supabase!`)
    } else if (res) {
      const errText = await res.text().catch(() => "")
      console.warn(`[Supabase] Resposta ao semear produtos (HTTP ${res.status}):`, errText)
    }
  } catch (err) {
    console.error("[Supabase] Falha ao sincronizar produtos:", err)
  }
}

export async function GET() {
  // Acesso de leitura ao catálogo liberado para permitir que o Gerenciador de Estoque
  // e telas operacionais carreguem a lista de produtos sem interrupção de sessão.
  const cfg = getSupabaseConfig()

  if (cfg) {
    try {
      // 1. Tenta consulta padrão ordenada com filtro ativo
      let response = await supabaseFetch(
        `estoque_itens?select=${select}&ativo=eq.true&order=reduzido.asc`
      )

      // 2. Se a tabela não tiver a coluna 'ativo' (HTTP 400), consulta sem filtro ativo
      if (!response?.ok && response?.status === 400) {
        console.warn("[Supabase] Tentando consulta alternativa sem filtro 'ativo'...")
        response = await supabaseFetch(
          `estoque_itens?select=reduzido,descricao,pallet_total,lastro,unidade,tipo_unidade,tara_kg,peso_kg&order=reduzido.asc`
        )
      }

      // 3. Se ainda retornar 400 (ex: colunas com nomes alternativos), consulta aberta
      if (!response?.ok && response?.status === 400) {
        console.warn("[Supabase] Tentando consulta genérica (select=*)...")
        response = await supabaseFetch(`estoque_itens?select=*&limit=1000`)
      }

      if (response?.ok) {
        const rows = await response.json()
        if (Array.isArray(rows) && rows.length > 0) {
          const items = rows
            .map(mapItem)
            .filter((i) => i.reduzido && i.descricao)
          if (items.length > 0) {
            void saveLocalItems(items)
            return NextResponse.json({ ok: true, items, source: "supabase" })
          }
        } else if (Array.isArray(rows) && rows.length === 0) {
          // Tabela existe no Supabase mas está vazia. Auto-semeia com o catálogo padrão
          console.info("[Supabase] Tabela estoque_itens vazia no Supabase. Semeando dados padrão...")
          const localItems = await getLocalItems()
          if (localItems.length > 0) {
            void seedSupabaseItems(localItems)
            return NextResponse.json({ ok: true, items: localItems, source: "local_seeded" })
          }
        }
      } else if (response) {
        const errorText = await response.text().catch(() => "")
        console.error(`[Supabase] Erro HTTP ${response.status} ao carregar produtos:`, errorText)
      }
    } catch (err) {
      console.error("[Supabase] Falha ao consultar estoque_itens:", err)
    }
  }

  // Fallback seguro usando catálogo local salvo em data/estoque-itens.json
  const localItems = await getLocalItems()
  return NextResponse.json({ ok: true, items: localItems, source: "local" })
}

export async function POST(request: Request) {
  const session = getSession(request)
  if (session && !session.canRegister && session.role !== "admin") {
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

  let savedItems: MappedItem[] = []
  try {
    const response = await supabaseFetch("estoque_itens?on_conflict=reduzido", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload),
    })
    if (response?.ok) {
      savedItems = (await response.json()).map(mapItem)
    }
  } catch {}

  // Atualiza e mantém data/estoque-itens.json sincronizado
  const currentLocal = await getLocalItems()
  const map = new Map<string, MappedItem>()
  currentLocal.forEach((it) => map.set(it.reduzido, it))
  parsed.data.forEach((item) => {
    map.set(item.reduzido, {
      reduzido: item.reduzido,
      descricao: item.descricao,
      palletTotal: item.palletTotal,
      lastro: item.lastro,
      unidade: item.unidade,
      tipoUnidade: item.tipoUnidade,
      taraKg: item.taraKg,
      pesoKg: item.pesoKg,
    })
  })
  const updatedList = Array.from(map.values()).sort((a, b) => Number(a.reduzido) - Number(b.reduzido))
  await saveLocalItems(updatedList)

  return NextResponse.json({ ok: true, items: savedItems.length > 0 ? savedItems : parsed.data.map((i) => mapItem(i as any)) })
}

export async function DELETE(request: Request) {
  const session = getSession(request)
  if (session && session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Apenas administradores podem inativar produtos." }, { status: 403 })
  }
  const reduzido = new URL(request.url).searchParams.get("reduzido") || ""
  if (!/^\d{1,30}$/.test(reduzido)) return NextResponse.json({ ok: false, error: "Código inválido." }, { status: 400 })

  try {
    await supabaseFetch(`estoque_itens?reduzido=eq.${encodeURIComponent(reduzido)}`, {
      method: "PATCH",
      body: JSON.stringify({ ativo: false, updated_at: new Date().toISOString() }),
    })
  } catch {}

  const currentLocal = await getLocalItems()
  const filtered = currentLocal.filter((it) => it.reduzido !== reduzido)
  await saveLocalItems(filtered)

  return NextResponse.json({ ok: true })
}

