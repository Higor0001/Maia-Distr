// Helper de integração híbrida: Supabase REST API (quando configurado no .env.local) + Banco Local JSON (data/)

export function getSupabaseConfig() {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  ).trim().replace(/\/+$/, "")

  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    ""
  ).trim()

  if (!url || !key) return null
  return { url, key }
}

export async function supabaseFetch(
  tableAndQuery: string,
  options: RequestInit = {}
) {
  const cfg = getSupabaseConfig()
  if (!cfg) return null

  const headers: Record<string, string> = {
    apikey: cfg.key,
    Authorization: `Bearer ${cfg.key}`,
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  try {
    return await fetch(`${cfg.url}/rest/v1/${tableAndQuery}`, {
      ...options,
      headers,
      cache: "no-store",
    })
  } catch (err) {
    console.error(`[Supabase] Erro de conexão em ${tableAndQuery}:`, err)
    return null
  }
}

