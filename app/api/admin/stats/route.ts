import { NextResponse } from "next/server"
import { requireSession } from "@/lib/auth"
import { supabaseFetch, getSupabaseConfig } from "@/lib/db"
import { getSystemSettings } from "@/lib/settings"
import fs from "fs/promises"
import path from "path"

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

  let usersCount = 0
  let itemsCount = 0
  let countsCount = 0
  let perdasCount = 0
  let isSupabaseOnline = false

  const sbCfg = getSupabaseConfig()

  // 1. Tenta coletar contagens via Supabase
  if (sbCfg) {
    try {
      const [resUsers, resItems, resCounts, resPerdas] = await Promise.all([
        supabaseFetch("triagem_usuarios?select=usuario", { method: "HEAD", headers: { Prefer: "count=exact" } }),
        supabaseFetch("estoque_itens?select=reduzido", { method: "HEAD", headers: { Prefer: "count=exact" } }),
        supabaseFetch("estoque_contagens?select=id", { method: "HEAD", headers: { Prefer: "count=exact" } }),
        supabaseFetch("perdas_ocorrencias?select=id", { method: "HEAD", headers: { Prefer: "count=exact" } }),
      ])

      const parseCount = (res: Response | null) => {
        if (!res || !res.ok) return null
        const cr = res.headers.get("content-range")
        if (cr && cr.includes("/")) {
          const total = Number.parseInt(cr.split("/")[1], 10)
          return Number.isFinite(total) ? total : null
        }
        return null
      }

      const cUsers = parseCount(resUsers)
      const cItems = parseCount(resItems)
      const cCounts = parseCount(resCounts)
      const cPerdas = parseCount(resPerdas)

      if (cUsers !== null || cItems !== null) {
        isSupabaseOnline = true
        usersCount = cUsers ?? 0
        itemsCount = cItems ?? 0
        countsCount = cCounts ?? 0
        perdasCount = cPerdas ?? 0
      }
    } catch {
      isSupabaseOnline = false
    }
  }

  // 2. Fallbacks locais se banco estiver offline ou incompleto
  if (!isSupabaseOnline || usersCount === 0) {
    try {
      const uPath = path.join(process.cwd(), "data", "usuarios.json")
      const uData = JSON.parse(await fs.readFile(uPath, "utf-8"))
      if (Array.isArray(uData) && usersCount === 0) usersCount = uData.length
    } catch {}

    try {
      const iPath = path.join(process.cwd(), "data", "estoque-itens.json")
      const iData = JSON.parse(await fs.readFile(iPath, "utf-8"))
      if (Array.isArray(iData) && itemsCount === 0) itemsCount = iData.length
    } catch {}

    try {
      const pPath = path.join(process.cwd(), "data", "perdas-ocorrencias.json")
      const pData = JSON.parse(await fs.readFile(pPath, "utf-8"))
      if (Array.isArray(pData) && perdasCount === 0) perdasCount = pData.length
    } catch {}
  }

  const settings = await getSystemSettings()

  return NextResponse.json({
    ok: true,
    stats: {
      usersCount,
      itemsCount,
      countsCount,
      perdasCount,
    },
    services: {
      database: {
        type: isSupabaseOnline ? "Supabase (Cloud)" : "Local JSON (Fallback)",
        online: true,
        cloudConnected: isSupabaseOnline,
      },
      smtp: {
        configured: Boolean(settings.smtp.host && (settings.smtp.user || !settings.smtp.enabled)),
        enabled: settings.smtp.enabled,
        host: settings.smtp.host || "Não configurado",
        port: settings.smtp.port,
        fromEmail: settings.smtp.fromEmail || settings.smtp.user,
      },
      telegram: {
        configured: Boolean(settings.telegram.botToken && (settings.telegram.chatIdFilial || settings.telegram.chatIdMatriz)),
        botTokenSet: Boolean(settings.telegram.botToken),
        hasFilialChat: Boolean(settings.telegram.chatIdFilial),
        hasMatrizChat: Boolean(settings.telegram.chatIdMatriz),
      },
      smb: {
        enabled: settings.smb.enabled,
        configured: Boolean(settings.smb.sharePath),
        sharePath: settings.smb.sharePath,
      },
    },
  })
}
