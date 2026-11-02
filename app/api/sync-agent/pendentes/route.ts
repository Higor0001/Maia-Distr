import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

export interface RelatorioFila {
  id: string
  tipo: "simples_conferencia" | "perdas" | "separacao"
  nomeArquivo: string
  conteudoBase64?: string
  imprimir: boolean
  status: "pendente" | "baixado" | "impresso" | "erro"
  criadoEm: string
}

const FILA_FILE = path.join(process.cwd(), "data", "relatorios-fila-sync.json")

async function getFila(): Promise<RelatorioFila[]> {
  try {
    const raw = await fs.readFile(FILA_FILE, "utf-8")
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function saveFila(fila: RelatorioFila[]) {
  try {
    const dir = path.dirname(FILA_FILE)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(FILA_FILE, JSON.stringify(fila, null, 2), "utf-8")
  } catch (err) {
    console.error("Erro ao salvar relatorios-fila-sync.json:", err)
  }
}

// O Maia Sync Agent (Python) faz polling aqui
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const statusFiltro = searchParams.get("status") || "pendente"
    const fila = await getFila()
    const pendentes = fila.filter((r) => r.status === statusFiltro)
    return NextResponse.json({ ok: true, relatorios: pendentes })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

// O agente atualiza o status de impressão/salvamento
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { relatorioId, novoStatus, erro } = body

    if (!relatorioId || !novoStatus) {
      return NextResponse.json({ ok: false, error: "ID e novo status são obrigatórios." }, { status: 400 })
    }

    const fila = await getFila()
    const item = fila.find((r) => r.id === relatorioId)
    if (!item) {
      return NextResponse.json({ ok: false, error: "Relatório não encontrado na fila." }, { status: 404 })
    }

    item.status = novoStatus
    await saveFila(fila)

    return NextResponse.json({ ok: true, item })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
