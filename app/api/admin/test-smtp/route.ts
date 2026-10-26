import { NextResponse } from "next/server"
import { requireSession } from "@/lib/auth"
import { sendSmtpTestEmail, verifySmtpConnection } from "@/lib/email"
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
    const { toEmail, onlyVerify, ...smtpData } = body

    // Se senha for máscara "••••••••", recupera a senha gravada no sistema
    if (smtpData.pass === "••••••••" || !smtpData.pass) {
      const current = await getSystemSettings()
      smtpData.pass = current.smtp.pass
    }

    if (onlyVerify) {
      const result = await verifySmtpConnection(smtpData)
      return NextResponse.json(result)
    }

    const recipient = String(toEmail || "").trim()
    if (!recipient || !recipient.includes("@")) {
      return NextResponse.json({ ok: false, error: "Informe um e-mail válido para receber o teste." }, { status: 400 })
    }

    const sendResult = await sendSmtpTestEmail(recipient, smtpData)
    return NextResponse.json({
      ok: true,
      message: `E-mail de teste enviado com sucesso para ${recipient}!`,
      details: sendResult,
    })
  } catch (error: any) {
    console.error("POST /api/admin/test-smtp error:", error)
    return NextResponse.json({
      ok: false,
      error: error?.message || "Falha ao enviar e-mail de teste via SMTP.",
      code: error?.code,
    }, { status: 400 })
  }
}
