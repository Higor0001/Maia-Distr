import { NextResponse } from "next/server"
import { getCaixas, saveCaixa } from "@/lib/conferencia"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const caixas = await getCaixas()
    return NextResponse.json({ ok: true, caixas })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = getSession(request)
    if (session?.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Acesso restrito a administradores." }, { status: 403 })
    }

    const body = await request.json()
    if (!body.nome || body.taraKg === undefined) {
      return NextResponse.json({ ok: false, error: "Nome e tara (kg) são obrigatórios." }, { status: 400 })
    }

    const item = {
      id: body.id || `caixa_${Date.now()}`,
      nome: String(body.nome).trim(),
      taraKg: Math.max(0, Number(body.taraKg)),
      ativo: body.ativo !== false,
    }

    const caixas = await saveCaixa(item)
    return NextResponse.json({ ok: true, caixas, item })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
