import { supabaseFetch } from "@/lib/db"
import fs from "fs/promises"
import path from "path"

export interface CarrinhoTara {
  id: string
  nome: string
  taraKg: number
  ativo: boolean
}

export interface CaixaTara {
  id: string
  nome: string
  taraKg: number
  ativo: boolean
}

export interface SimplesConferenciaItem {
  id: string
  produtoReduzido?: string
  produtoNome: string
  responsavel: string
  pesoBruto: number
  tipoCarrinhoId?: string
  tipoCarrinhoNome?: string
  taraCarrinhoKg: number
  tipoCaixaId?: string
  tipoCaixaNome?: string
  quantidadeCaixas?: number
  taraCaixaKg: number
  pesoLiquido: number
  observacao?: string
  fotoUrl?: string
  createdAt: string
}

const CARRINHOS_FILE = path.join(process.cwd(), "data", "carrinhos-tara.json")
const CAIXAS_FILE = path.join(process.cwd(), "data", "caixas-tara.json")
const CONFERENCIA_FILE = path.join(process.cwd(), "data", "simples-conferencia.json")

const DEFAULT_CARRINHOS: CarrinhoTara[] = [
  { id: "carrinho-1", nome: "Carrinho 1", taraKg: 25.5, ativo: true },
  { id: "carrinho-2", nome: "Carrinho 2", taraKg: 19.0, ativo: true },
  { id: "carrinho-3", nome: "Carrinho 3", taraKg: 27.0, ativo: true },
]

const DEFAULT_CAIXAS: CaixaTara[] = [
  { id: "caixa-1", nome: "Caixa 1", taraKg: 2.5, ativo: true },
  { id: "caixa-2", nome: "Caixa 2", taraKg: 2.0, ativo: true },
]

// --- CARRINHOS ---
export async function getCarrinhos(): Promise<CarrinhoTara[]> {
  try {
    const res = await supabaseFetch("carrinhos_tara?select=*&order=nome.asc")
    if (res && res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        return data.map((c: any) => ({
          id: c.id,
          nome: c.nome,
          taraKg: Number(c.tara_kg || c.taraKg || 0),
          ativo: c.ativo !== false,
        }))
      }
    }
  } catch (err) {
    console.warn("Aviso ao buscar carrinhos no Supabase:", err)
  }

  try {
    const raw = await fs.readFile(CARRINHOS_FILE, "utf-8")
    return JSON.parse(raw)
  } catch {
    return DEFAULT_CARRINHOS
  }
}

export async function saveCarrinho(item: CarrinhoTara): Promise<CarrinhoTara[]> {
  const list = await getCarrinhos()
  const idx = list.findIndex((c) => c.id === item.id)
  if (idx >= 0) {
    list[idx] = item
  } else {
    list.push(item)
  }

  try {
    await fs.writeFile(CARRINHOS_FILE, JSON.stringify(list, null, 2), "utf-8")
  } catch (err) {
    console.error("Erro ao salvar carrinhos-tara.json:", err)
  }

  try {
    await supabaseFetch("carrinhos_tara?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        id: item.id,
        nome: item.nome,
        tara_kg: item.taraKg,
        ativo: item.ativo,
        updated_at: new Date().toISOString(),
      }),
    })
  } catch (err) {
    console.warn("Aviso ao persistir carrinho no Supabase:", err)
  }

  return list
}

// --- CAIXAS ---
export async function getCaixas(): Promise<CaixaTara[]> {
  try {
    const res = await supabaseFetch("caixas_tara?select=*&order=nome.asc")
    if (res && res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        return data.map((c: any) => ({
          id: c.id,
          nome: c.nome,
          taraKg: Number(c.tara_kg || c.taraKg || 0),
          ativo: c.ativo !== false,
        }))
      }
    }
  } catch (err) {
    console.warn("Aviso ao buscar caixas no Supabase:", err)
  }

  try {
    const raw = await fs.readFile(CAIXAS_FILE, "utf-8")
    return JSON.parse(raw)
  } catch {
    return DEFAULT_CAIXAS
  }
}

export async function saveCaixa(item: CaixaTara): Promise<CaixaTara[]> {
  const list = await getCaixas()
  const idx = list.findIndex((c) => c.id === item.id)
  if (idx >= 0) {
    list[idx] = item
  } else {
    list.push(item)
  }

  try {
    await fs.writeFile(CAIXAS_FILE, JSON.stringify(list, null, 2), "utf-8")
  } catch (err) {
    console.error("Erro ao salvar caixas-tara.json:", err)
  }

  try {
    await supabaseFetch("caixas_tara?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        id: item.id,
        nome: item.nome,
        tara_kg: item.taraKg,
        ativo: item.ativo,
        updated_at: new Date().toISOString(),
      }),
    })
  } catch (err) {
    console.warn("Aviso ao persistir caixa no Supabase:", err)
  }

  return list
}

// --- SIMPLES CONFERÊNCIA ---
export async function getSimplesConferencias(limit = 100): Promise<SimplesConferenciaItem[]> {
  try {
    const res = await supabaseFetch(
      `simples_conferencia?select=*&order=created_at.desc&limit=${limit}`
    )
    if (res && res.ok) {
      const rows = await res.json()
      if (Array.isArray(rows)) {
        return rows.map((r: any) => ({
          id: r.id,
          produtoReduzido: r.produto_reduzido,
          produtoNome: r.produto_nome,
          responsavel: r.responsavel,
          pesoBruto: Number(r.peso_bruto || 0),
          tipoCarrinhoId: r.tipo_carrinho_id,
          tipoCarrinhoNome: r.tipo_carrinho_nome,
          taraCarrinhoKg: Number(r.tara_carrinho_kg || 0),
          tipoCaixaId: r.tipo_caixa_id,
          tipoCaixaNome: r.tipo_caixa_nome,
          quantidadeCaixas: Number(r.quantidade_caixas || 1),
          taraCaixaKg: Number(r.tara_caixa_kg || 0),
          pesoLiquido: Number(r.peso_liquido || 0),
          observacao: r.observacao || "",
          fotoUrl: r.foto_url || "",
          createdAt: r.created_at,
        }))
      }
    }
  } catch (err) {
    console.warn("Aviso ao buscar simples_conferencia no Supabase:", err)
  }

  try {
    const raw = await fs.readFile(CONFERENCIA_FILE, "utf-8")
    const list: SimplesConferenciaItem[] = JSON.parse(raw)
    return list.slice(0, limit)
  } catch {
    return []
  }
}

export async function addSimplesConferencia(
  item: Omit<SimplesConferenciaItem, "id" | "createdAt"> & { id?: string; createdAt?: string }
): Promise<SimplesConferenciaItem> {
  const finalItem: SimplesConferenciaItem = {
    id: item.id || `conf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    produtoReduzido: item.produtoReduzido || "",
    produtoNome: item.produtoNome,
    responsavel: item.responsavel,
    pesoBruto: Number(item.pesoBruto),
    tipoCarrinhoId: item.tipoCarrinhoId || "",
    tipoCarrinhoNome: item.tipoCarrinhoNome || "",
    taraCarrinhoKg: Number(item.taraCarrinhoKg || 0),
    tipoCaixaId: item.tipoCaixaId || "",
    tipoCaixaNome: item.tipoCaixaNome || "",
    quantidadeCaixas: Math.max(1, Number(item.quantidadeCaixas) || 1),
    taraCaixaKg: Number(item.taraCaixaKg || 0),
    pesoLiquido: Number(item.pesoLiquido),
    observacao: item.observacao || "",
    fotoUrl: item.fotoUrl || "",
    createdAt: item.createdAt || new Date().toISOString(),
  }

  // 1. Salvar localmente
  try {
    let list: SimplesConferenciaItem[] = []
    try {
      const raw = await fs.readFile(CONFERENCIA_FILE, "utf-8")
      list = JSON.parse(raw)
    } catch {
      list = []
    }
    list.unshift(finalItem)
    await fs.writeFile(CONFERENCIA_FILE, JSON.stringify(list, null, 2), "utf-8")
  } catch (err) {
    console.error("Erro ao salvar local em simples-conferencia.json:", err)
  }

  // 2. Salvar no Supabase
  try {
    await supabaseFetch("simples_conferencia", {
      method: "POST",
      body: JSON.stringify({
        id: finalItem.id,
        produto_reduzido: finalItem.produtoReduzido,
        produto_nome: finalItem.produtoNome,
        responsavel: finalItem.responsavel,
        peso_bruto: finalItem.pesoBruto,
        tipo_carrinho_id: finalItem.tipoCarrinhoId || null,
        tipo_carrinho_nome: finalItem.tipoCarrinhoNome || null,
        tara_carrinho_kg: finalItem.taraCarrinhoKg,
        tipo_caixa_id: finalItem.tipoCaixaId || null,
        tipo_caixa_nome: finalItem.tipoCaixaNome || null,
        quantidade_caixas: finalItem.quantidadeCaixas,
        tara_caixa_kg: finalItem.taraCaixaKg,
        peso_liquido: finalItem.pesoLiquido,
        observacao: finalItem.observacao || null,
        foto_url: finalItem.fotoUrl || null,
        created_at: finalItem.createdAt,
      }),
    })
  } catch (err) {
    console.warn("Aviso ao salvar simples_conferencia no Supabase:", err)
  }

  return finalItem
}
