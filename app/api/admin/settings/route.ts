import { NextResponse } from "next/server"
import { requireSession } from "@/lib/auth"
import { getSystemSettings, saveSystemSettings, maskSecrets } from "@/lib/settings"

function requireAdmin(request: Request) {
  const auth = requireSession(request)
  if ("response" in auth) return auth
  if (auth.session.role !== "admin") {
    return { response: NextResponse.json({ ok: false, error: "Acesso restrito a administradores." }, { status: 403 }) }
  }
  return auth
}

export async function GET(request: Request) {
  const auth = requireAdmin(request)
  if ("response" in auth) return auth.response

  try {
    const settings = await getSystemSettings()
    return NextResponse.json({
      ok: true,
      settings: maskSecrets(settings),
    })
  } catch (error: any) {
    console.error("GET /api/admin/settings error:", error)
    return NextResponse.json({ ok: false, error: "Não foi possível carregar as configurações." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = requireAdmin(request)
  if ("response" in auth) return auth.response

  try {
    const body = await request.json()
    const saved = await saveSystemSettings(body, auth.session.usuario)
    return NextResponse.json({
      ok: true,
      message: "Configurações salvas com sucesso!",
      settings: maskSecrets(saved),
    })
  } catch (error: any) {
    console.error("POST /api/admin/settings error:", error)
    return NextResponse.json({ ok: false, error: error?.message || "Não foi possível salvar as configurações." }, { status: 500 })
  }
}
