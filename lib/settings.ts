import { supabaseFetch } from "@/lib/db"
import fs from "fs/promises"
import path from "path"

export interface SmtpSettings {
  enabled: boolean
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  fromName: string
  fromEmail: string
  recipientsEstoqueFilial: string[]
  recipientsEstoqueMatriz: string[]
  recipientsPerdas: string[]
  autoSendEstoque: boolean
  autoSendPerdas: boolean
}

export interface TelegramSettings {
  botToken: string
  chatIdFilial: string
  chatIdMatriz: string
  autoSend: boolean
}

export interface SmbSettings {
  enabled: boolean
  sharePath: string
  username: string
  domain: string
  saveEstoquePdf: boolean
  savePerdasPdf: boolean
}

export interface GeralSettings {
  empresaNome: string
  unidadeNome: string
  notificacoesAtivas: boolean
}

export interface SystemSettings {
  smtp: SmtpSettings
  telegram: TelegramSettings
  smb: SmbSettings
  geral: GeralSettings
}

const SETTINGS_FILE = path.join(process.cwd(), "data", "sistema-configuracoes.json")

export function getDefaultSettings(): SystemSettings {
  return {
    smtp: {
      enabled: false,
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      user: "",
      pass: "",
      fromName: "Triagem Filial - Hortigranjeiros",
      fromEmail: "",
      recipientsEstoqueFilial: [],
      recipientsEstoqueMatriz: [],
      recipientsPerdas: [],
      autoSendEstoque: false,
      autoSendPerdas: false,
    },
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || "",
      chatIdFilial: process.env.TELEGRAM_CHAT_ID_FILIAL || "",
      chatIdMatriz: process.env.TELEGRAM_CHAT_ID_MATRIZ || "",
      autoSend: true,
    },
    smb: {
      enabled: false,
      sharePath: "\\\\servidor\\hortifruti\\relatorios",
      username: "",
      domain: "",
      saveEstoquePdf: false,
      savePerdasPdf: false,
    },
    geral: {
      empresaNome: "Maia Distribuidora",
      unidadeNome: "Filial Hortigranjeiros",
      notificacoesAtivas: true,
    },
  }
}

export async function loadLocalSettings(): Promise<SystemSettings> {
  const defaults = getDefaultSettings()
  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf-8")
    const parsed = JSON.parse(raw)
    return {
      smtp: { ...defaults.smtp, ...(parsed.smtp || {}) },
      telegram: { ...defaults.telegram, ...(parsed.telegram || {}) },
      smb: { ...defaults.smb, ...(parsed.smb || {}) },
      geral: { ...defaults.geral, ...(parsed.geral || {}) },
    }
  } catch {
    return defaults
  }
}

export async function saveLocalSettings(settings: SystemSettings): Promise<void> {
  try {
    const dir = path.dirname(SETTINGS_FILE)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8")
  } catch (err) {
    console.error("Erro ao salvar sistema-configuracoes.json:", err)
  }
}

export async function getSystemSettings(): Promise<SystemSettings> {
  const settings = await loadLocalSettings()

  try {
    const res = await supabaseFetch("sistema_configuracoes?select=chave,valor")
    if (res && res.ok) {
      const rows = await res.json()
      if (Array.isArray(rows)) {
        for (const row of rows) {
          if (row.chave === "smtp" && row.valor) {
            settings.smtp = { ...settings.smtp, ...row.valor }
          } else if (row.chave === "telegram" && row.valor) {
            settings.telegram = { ...settings.telegram, ...row.valor }
          } else if (row.chave === "smb" && row.valor) {
            settings.smb = { ...settings.smb, ...row.valor }
          } else if (row.chave === "geral" && row.valor) {
            settings.geral = { ...settings.geral, ...row.valor }
          }
        }
      }
    }
  } catch {
    // Mantém as configurações locais se Supabase falhar
  }

  // Preenche valores com env se ainda vazios
  if (!settings.telegram.botToken && process.env.TELEGRAM_BOT_TOKEN) {
    settings.telegram.botToken = process.env.TELEGRAM_BOT_TOKEN
  }
  if (!settings.telegram.chatIdFilial && process.env.TELEGRAM_CHAT_ID_FILIAL) {
    settings.telegram.chatIdFilial = process.env.TELEGRAM_CHAT_ID_FILIAL
  }
  if (!settings.telegram.chatIdMatriz && process.env.TELEGRAM_CHAT_ID_MATRIZ) {
    settings.telegram.chatIdMatriz = process.env.TELEGRAM_CHAT_ID_MATRIZ
  }

  return settings
}

export async function saveSystemSettings(
  updated: Partial<SystemSettings>,
  updatedBy?: string
): Promise<SystemSettings> {
  const current = await getSystemSettings()

  // Preserva senhas mascaradas
  let smtpPass = current.smtp.pass
  if (updated.smtp?.pass && updated.smtp.pass !== "••••••••") {
    smtpPass = updated.smtp.pass
  }

  const merged: SystemSettings = {
    smtp: {
      ...current.smtp,
      ...(updated.smtp || {}),
      pass: smtpPass,
    },
    telegram: {
      ...current.telegram,
      ...(updated.telegram || {}),
    },
    smb: {
      ...current.smb,
      ...(updated.smb || {}),
    },
    geral: {
      ...current.geral,
      ...(updated.geral || {}),
    },
  }

  // 1. Salva localmente
  await saveLocalSettings(merged)

  // 2. Salva no Supabase
  try {
    const keys = ["smtp", "telegram", "smb", "geral"] as const
    const now = new Date().toISOString()
    const rows = keys.map((key) => ({
      chave: key,
      valor: merged[key],
      updated_at: now,
      updated_by: updatedBy || "admin",
    }))

    await supabaseFetch("sistema_configuracoes?on_conflict=chave", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(rows),
    })
  } catch (err) {
    console.warn("Aviso: Não foi possível salvar sistema_configuracoes no Supabase:", err)
  }

  return merged
}

export function maskSecrets(settings: SystemSettings) {
  return {
    ...settings,
    smtp: {
      ...settings.smtp,
      pass: settings.smtp.pass ? "••••••••" : "",
    },
  }
}
