import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import fs from "fs/promises"
import path from "path"

const HISTORICO_PRECOS_FILE = path.join(process.cwd(), "data", "precos-historico.json")

export async function GET() {
  try {
    let historico = []
    try {
      const raw = await fs.readFile(HISTORICO_PRECOS_FILE, "utf-8")
      historico = JSON.parse(raw)
    } catch {
      historico = []
    }

    return NextResponse.json({ ok: true, historico })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = getSession(request)

    const body = await request.json()
    const { alteracoes, arquivoOrigem, colunaPreco } = body

    if (!alteracoes || !Array.isArray(alteracoes) || alteracoes.length === 0) {
      return NextResponse.json({ ok: false, error: "Nenhuma alteração de preço para aplicar." }, { status: 400 })
    }

    const registroAuditoria = {
      id: `preco_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      data: new Date().toISOString(),
      responsavel: session?.nome || session?.usuario || "Administrador",
      arquivoOrigem: arquivoOrigem || "Planilha Precos.xlsx",
      colunaPreco: colunaPreco || "Preco_Venda",
      totalItens: alteracoes.length,
      alteracoes,
    }

    let historico = []
    try {
      const raw = await fs.readFile(HISTORICO_PRECOS_FILE, "utf-8")
      historico = JSON.parse(raw)
    } catch {
      historico = []
    }
    historico.unshift(registroAuditoria)

    const dir = path.dirname(HISTORICO_PRECOS_FILE)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(HISTORICO_PRECOS_FILE, JSON.stringify(historico, null, 2), "utf-8")

    return NextResponse.json({ ok: true, registro: registroAuditoria })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
