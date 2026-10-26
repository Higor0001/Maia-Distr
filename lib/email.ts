import nodemailer from "nodemailer"
import { SmtpSettings, getSystemSettings } from "@/lib/settings"

export async function createSmtpTransporter(overrideConfig?: Partial<SmtpSettings>) {
  const settings = await getSystemSettings()
  const cfg = {
    ...settings.smtp,
    ...(overrideConfig || {}),
  }

  if (!cfg.host) {
    throw new Error("Servidor SMTP (Host) não está preenchido.")
  }

  const port = Number(cfg.port) || 587
  const isDirectSsl = port === 465 || Boolean(cfg.secure)

  const transportOptions = {
    host: cfg.host.trim(),
    port,
    secure: isDirectSsl,
    auth: cfg.user?.trim()
      ? {
          user: cfg.user.trim(),
          pass: (cfg.pass || "").replace(/\s+/g, "").trim(),
        }
      : undefined,
    tls: {
      rejectUnauthorized: false, // Permite certificados auto-assinados de redes locais
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  }

  return {
    transporter: nodemailer.createTransport(transportOptions),
    config: cfg,
  }
}

function formatSmtpErrorMessage(err: any, host = ""): string {
  const raw = String(err?.message || err?.response || "")
  if (
    host.toLowerCase().includes("gmail") &&
    (raw.includes("535") ||
      raw.includes("BadCredentials") ||
      raw.includes("Username and Password not accepted") ||
      raw.includes("Application-specific password required"))
  ) {
    return "Erro de autenticação no Gmail (535): O Google não aceita a sua senha pessoal comum. É obrigatório ativar a 'Verificação em 2 etapas' na sua conta Google e gerar uma 'Senha de App' de 16 letras em: https://myaccount.google.com/apppasswords"
  }
  if (err?.code === "ETIMEDOUT" || err?.code === "ESOCKET") {
    return `Tempo limite esgotado ao conectar no servidor ${host}. Verifique se a porta (587 ou 465) está liberada em sua rede.`
  }
  if (err?.code === "ENOTFOUND") {
    return `Servidor SMTP não encontrado (${host}). Verifique a digitação do Host.`
  }
  return err?.message || "Falha ao comunicar com o servidor SMTP."
}

export async function verifySmtpConnection(overrideConfig?: Partial<SmtpSettings>) {
  const startTime = Date.now()
  let host = ""
  try {
    const { transporter, config } = await createSmtpTransporter(overrideConfig)
    host = config.host
    await transporter.verify()
    const elapsed = Date.now() - startTime
    return { ok: true, elapsedMs: elapsed }
  } catch (err: any) {
    const elapsed = Date.now() - startTime
    return {
      ok: false,
      elapsedMs: elapsed,
      error: formatSmtpErrorMessage(err, host || overrideConfig?.host || ""),
      code: err?.code,
      response: err?.response,
    }
  }
}

export async function sendSmtpTestEmail(
  toEmail: string,
  overrideConfig?: Partial<SmtpSettings>
) {
  const { transporter, config } = await createSmtpTransporter(overrideConfig)
  const fromName = config.fromName || "Triagem Filial - Hortigranjeiros"
  const fromAddress = config.fromEmail || config.user || "no-reply@maiadistribuidora.com"
  const from = `"${fromName}" <${fromAddress}>`
  const now = new Date().toLocaleString("pt-BR")

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Teste de Conexão SMTP</title>
    </head>
    <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
        <tr>
          <td style="background: linear-gradient(135deg, #1a2a6c 0%, #203a43 50%, #059669 100%); padding: 36px 30px; text-align: center; color: #ffffff;">
            <div style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 6px;">MAIA DISTRIBUIDORA</div>
            <div style="font-size: 14px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Triagem Filial • Hortigranjeiros</div>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px 30px;">
            <div style="display: inline-block; background: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; margin-bottom: 16px;">
              ✓ Diagnóstico Concluído
            </div>
            <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 22px; font-weight: 700;">Conexão SMTP validada com sucesso!</h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
              Este e-mail confirma que o módulo de envio <strong>SMTP</strong> foi configurado corretamente no Painel Administrativo do sistema e está pronto para despachar relatórios diários de estoque e alertas de perdas.
            </p>

            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
              <tr>
                <td style="padding: 6px 12px; color: #64748b; font-size: 13px; font-weight: 600; width: 140px;">Servidor (Host):</td>
                <td style="padding: 6px 12px; color: #0f172a; font-size: 13px; font-weight: 700;">${config.host}</td>
              </tr>
              <tr>
                <td style="padding: 6px 12px; color: #64748b; font-size: 13px; font-weight: 600;">Porta / Criptografia:</td>
                <td style="padding: 6px 12px; color: #0f172a; font-size: 13px; font-weight: 700;">${config.port} (${config.secure ? "SSL Direto" : "STARTTLS"})</td>
              </tr>
              <tr>
                <td style="padding: 6px 12px; color: #64748b; font-size: 13px; font-weight: 600;">Remetente:</td>
                <td style="padding: 6px 12px; color: #0f172a; font-size: 13px;">${from}</td>
              </tr>
              <tr>
                <td style="padding: 6px 12px; color: #64748b; font-size: 13px; font-weight: 600;">Data do Teste:</td>
                <td style="padding: 6px 12px; color: #0f172a; font-size: 13px;">${now}</td>
              </tr>
            </table>

            <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px;">
              Mensagem gerada automaticamente pelo Sistema de Triagem e Gerenciamento de Estoque.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  try {
    const info = await transporter.sendMail({
      from,
      to: toEmail,
      subject: `✅ [Teste SMTP] Sistema Hortigranjeiros - ${now}`,
      text: `Conexão SMTP validada com sucesso!\nServidor: ${config.host}:${config.port}\nRemetente: ${from}\nData: ${now}`,
      html,
    })

    return {
      ok: true,
      messageId: info.messageId,
      response: info.response,
    }
  } catch (err: any) {
    throw new Error(formatSmtpErrorMessage(err, config.host))
  }
}

export async function sendReportEmail({
  to,
  subject,
  html,
  text,
  attachments,
}: {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}) {
  const { transporter, config } = await createSmtpTransporter()
  const fromName = config.fromName || "Triagem Filial - Hortigranjeiros"
  const fromAddress = config.fromEmail || config.user || "no-reply@maiadistribuidora.com"
  const from = `"${fromName}" <${fromAddress}>`

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text: text || "Segue anexo o relatório emitido pelo sistema de Hortigranjeiros.",
    html,
    attachments,
  })

  return { ok: true, messageId: info.messageId }
}
