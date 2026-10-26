import { NextResponse } from "next/server"
import { requireSession } from "@/lib/auth"
import { sendReportEmail } from "@/lib/email"
import { getSystemSettings } from "@/lib/settings"

const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15 MB

export async function POST(request: Request) {
  const auth = requireSession(request)
  if ("response" in auth) return auth.response

  try {
    const formData = await request.formData()
    const file = formData.get("file")
    const reportType = String(formData.get("type") || "estoque") // "estoque" | "perdas"
    const unit = String(formData.get("unit") || "filial") // "filial" | "matriz"
    const customRecipient = formData.get("recipient")?.toString().trim()

    if (!(file instanceof File) || file.type !== "application/pdf" || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ ok: false, error: "Envie um arquivo PDF de até 15 MB." }, { status: 400 })
    }

    const settings = await getSystemSettings()
    if (!settings.smtp.enabled && !customRecipient) {
      return NextResponse.json({ ok: false, error: "Módulo SMTP não está ativado no Painel Admin." }, { status: 503 })
    }

    if (!settings.smtp.host) {
      return NextResponse.json({ ok: false, error: "Servidor SMTP não configurado. Acesse o Painel Admin." }, { status: 503 })
    }

    // Determina destinatários
    let recipients: string[] = []
    if (customRecipient) {
      recipients = [customRecipient]
    } else if (reportType === "estoque") {
      recipients = unit === "matriz" ? settings.smtp.recipientsEstoqueMatriz : settings.smtp.recipientsEstoqueFilial
    } else {
      recipients = settings.smtp.recipientsPerdas
    }

    if (recipients.length === 0) {
      return NextResponse.json({
        ok: false,
        error: `Nenhum destinatário de e-mail configurado para ${reportType} (${unit}). Configure no Painel Admin.`,
      }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const now = new Date().toLocaleString("pt-BR")
    const title = reportType === "estoque"
      ? `Relatório de Estoque Hortigranjeiros - ${unit.toUpperCase()}`
      : `Relatório de Ocorrências e Perdas - Hortigranjeiros`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #1a2a6c; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">MAIA DISTRIBUIDORA</h2>
          <p style="margin: 6px 0 0; opacity: 0.9; font-size: 13px;">Triagem Filial • Hortigranjeiros</p>
        </div>
        <div style="padding: 24px; background: #ffffff;">
          <h3 style="color: #0f172a; margin-top: 0;">${title}</h3>
          <p style="color: #475569; font-size: 14px; line-height: 1.5;">
            Segue em anexo o arquivo oficial em PDF referente ao fechamento operacional.
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 13px; color: #334155;">
            <div><strong>Emissor:</strong> ${auth.session.nome || auth.session.usuario}</div>
            <div><strong>Unidade:</strong> ${auth.session.unidade.toUpperCase()}</div>
            <div><strong>Data/Hora:</strong> ${now}</div>
            <div><strong>Arquivo:</strong> ${file.name || "relatorio.pdf"} (${(file.size / 1024).toFixed(1)} KB)</div>
          </div>
        </div>
      </div>
    `

    const result = await sendReportEmail({
      to: recipients,
      subject: `📋 ${title} - ${now}`,
      html,
      attachments: [
        {
          filename: file.name || `relatorio_${reportType}_${Date.now()}.pdf`,
          content: buffer,
          contentType: "application/pdf",
        },
      ],
    })

    return NextResponse.json({
      ok: true,
      message: `Relatório enviado com sucesso para: ${recipients.join(", ")}`,
      result,
    })
  } catch (error: any) {
    console.error("POST /api/email/send-report error:", error)
    return NextResponse.json({
      ok: false,
      error: error?.message || "Não foi possível enviar o relatório por e-mail.",
    }, { status: 500 })
  }
}
