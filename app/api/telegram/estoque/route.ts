import { NextResponse } from "next/server"
import { requireSession } from "@/lib/auth"

const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(request: Request) {
  const auth = requireSession(request)
  if ("response" in auth) return auth.response
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File) || file.type !== "application/pdf" || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ ok: false, error: "Envie um PDF de até 10 MB." }, { status: 400 })
    }
    const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim()
    const chatId = process.env.TELEGRAM_CHAT_ID_FILIAL?.trim()
    if (!botToken || !chatId) return NextResponse.json({ ok: false, error: "Telegram não configurado." }, { status: 503 })
    const telegramForm = new FormData()
    telegramForm.append("chat_id", chatId)
    telegramForm.append("document", file, file.name || `estoque_${Date.now()}.pdf`)
    telegramForm.append("caption", `Relatório de estoque enviado por ${auth.session.nome}`)
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, { method: "POST", body: telegramForm })
    if (!response.ok) return NextResponse.json({ ok: false, error: "O Telegram recusou o envio." }, { status: 502 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/telegram/estoque error:", error)
    return NextResponse.json({ ok: false, error: "Não foi possível enviar o relatório." }, { status: 500 })
  }
}
