import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as Blob | null
    const customBot = (formData.get("botToken") as string | null)?.trim()
    const customChat = (formData.get("chatId") as string | null)?.trim()

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "Arquivo PDF nao enviado." },
        { status: 400 }
      )
    }

    const botToken =
      customBot ||
      process.env.NEXT_PUBLIC_TELEGRAM_BOT ||
      process.env.TELEGRAM_BOT_TOKEN ||
      "7862091156:AAH-H_N63-A2b1R1n05N53A90uX2_uW27K4"
    const chatId =
      customChat ||
      process.env.NEXT_PUBLIC_TELEGRAM_CHAT ||
      process.env.TELEGRAM_CHAT_ID ||
      "-1002302617954"

    const telegramForm = new FormData()
    telegramForm.append("chat_id", chatId)
    telegramForm.append(
      "document",
      file,
      (file as File).name || `estoque_${Date.now()}.pdf`
    )
    telegramForm.append("caption", "📦 Relatório de Contagem de Estoque")

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendDocument`,
      {
        method: "POST",
        body: telegramForm,
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error("Telegram API error:", errText)
      return NextResponse.json(
        { ok: false, error: "Falha ao enviar PDF ao Telegram." },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/telegram/estoque error:", error)
    return NextResponse.json(
      { ok: false, error: "Erro ao enviar PDF ao Telegram." },
      { status: 500 }
    )
  }
}
