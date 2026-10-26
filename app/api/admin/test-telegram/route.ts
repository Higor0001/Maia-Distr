import { NextResponse } from "next/server"
import { requireSession } from "@/lib/auth"
import { getSystemSettings } from "@/lib/settings"

function requireAdmin(request: Request) {
  const auth = requireSession(request)
  if ("response" in auth) return auth
  if (auth.session.role !== "admin") {
    return { response: NextResponse.json({ ok: false, error: "Acesso restrito a administradores." }, { status: 403 }) }
  }
  return auth
}

export async function POST(request: Request) {
  const auth = requireAdmin(request)
  if ("response" in auth) return auth.response

  try {
    const body = await request.json()
    let token = String(body?.botToken || "").trim()
    let chatId = String(body?.chatId || "").trim()

    if (!token || !chatId) {
      const current = await getSystemSettings()
      token = token || current.telegram.botToken
      chatId = chatId || current.telegram.chatIdFilial || current.telegram.chatIdMatriz
    }

    if (!token || !chatId) {
      return NextResponse.json({ ok: false, error: "Informe o Bot Token e o Chat ID para realizar o teste." }, { status: 400 })
    }

    const text = `🤖 *Teste de Integração Telegram*\n\n` +
      `✅ Mensagem enviada com sucesso a partir do *Painel Administrativo*!\n` +
      `👤 Enviado por: ${auth.session.nome || auth.session.usuario}\n` +
      `⏰ Data/Hora: ${new Date().toLocaleString("pt-BR")}`

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    })

    const data = await res.json()
    if (!res.ok || !data.ok) {
      return NextResponse.json({
        ok: false,
        error: data.description || "O Telegram recusou o envio da mensagem.",
      }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      message: "Mensagem de teste entregue com sucesso no Telegram!",
      result: data.result,
    })
  } catch (error: any) {
    console.error("POST /api/admin/test-telegram error:", error)
    return NextResponse.json({ ok: false, error: error?.message || "Erro de conexão com o Telegram." }, { status: 500 })
  }
}
