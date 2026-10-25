// Helper de integração híbrida: Supabase REST API (quando configurado no .env.local) + Banco Local JSON (data/)

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "")
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ""

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

  return fetch(`${cfg.url}/rest/v1/${tableAndQuery}`, {
    ...options,
    headers,
    cache: "no-store",
  })
}
