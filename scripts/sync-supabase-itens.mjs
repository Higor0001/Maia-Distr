import fs from "node:fs/promises"
import path from "node:path"

async function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local")
  const envVars = {}
  try {
    const raw = await fs.readFile(envPath, "utf-8")
    for (const line of raw.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const idx = trimmed.indexOf("=")
      if (idx !== -1) {
        const k = trimmed.slice(0, idx).trim()
        const v = trimmed.slice(idx + 1).trim()
        envVars[k] = v
      }
    }
  } catch {}
  return envVars
}

async function main() {
  console.log("==================================================================")
  console.log("   Sincronizador de Catálogo de Produtos -> Supabase")
  console.log("==================================================================")

  const envVars = await loadEnv()

  const cliKey = process.argv[2]?.trim()
  const supabaseUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    envVars.NEXT_PUBLIC_SUPABASE_URL ||
    "https://clmsaapyiwrkgvprtlum.supabase.co"
  ).replace(/\/+$/, "")

  const supabaseKey = (
    cliKey ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    envVars.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  ).trim()

  console.log(`📡 URL Supabase: ${supabaseUrl}`)
  console.log(`🔑 Chave detectada: ${supabaseKey ? `${supabaseKey.slice(0, 12)}... (OK)` : "NENHUMA (vazio)"}`)

  if (!supabaseKey) {
    console.error("\n❌ ERRO: Nenhuma chave Supabase (Service Role ou Anon Key) foi encontrada.")
    console.log("\n💡 Como resolver:")
    console.log("1. Obtenha sua chave no Supabase (Project Settings > API > service_role secret ou anon public).")
    console.log("2. Execute este comando passando sua chave:")
    console.log("   node scripts/sync-supabase-itens.mjs SUA_CHAVE_AQUI\n")
    console.log("Ou cole no seu arquivo .env.local na linha SUPABASE_SERVICE_ROLE_KEY=...\n")
    process.exit(1)
  }

  // Se o usuário passou a chave via argumento e .env.local não tinha, salva no .env.local
  if (cliKey && (!envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY !== cliKey)) {
    try {
      const envPath = path.join(process.cwd(), ".env.local")
      let content = ""
      try {
        content = await fs.readFile(envPath, "utf-8")
      } catch {}

      if (content.includes("SUPABASE_SERVICE_ROLE_KEY=")) {
        content = content.replace(/SUPABASE_SERVICE_ROLE_KEY=.*/, `SUPABASE_SERVICE_ROLE_KEY=${cliKey}`)
      } else {
        content += `\nSUPABASE_SERVICE_ROLE_KEY=${cliKey}\n`
      }
      await fs.writeFile(envPath, content, "utf-8")
      console.log("💾 Chave salva com sucesso em .env.local!")
    } catch (err) {
      console.warn("Aviso ao salvar no .env.local:", err.message)
    }
  }

  // 1. Ler os produtos locais
  const jsonPath = path.join(process.cwd(), "data", "estoque-itens.json")
  let items = []
  try {
    const raw = await fs.readFile(jsonPath, "utf-8")
    items = JSON.parse(raw)
  } catch (err) {
    console.error("❌ Falha ao ler data/estoque-itens.json:", err.message)
    process.exit(1)
  }

  console.log(`📦 Produtos locais lidos: ${items.length} itens.`)

  // 2. Testar consulta no Supabase
  console.log("\n🔍 Testando consulta à tabela 'estoque_itens' no Supabase...")
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
  }

  const testRes = await fetch(`${supabaseUrl}/rest/v1/estoque_itens?select=reduzido&limit=5`, {
    headers,
  })

  if (!testRes.ok) {
    const errText = await testRes.text()
    console.error(`❌ O Supabase retornou status ${testRes.status}:`)
    console.error(errText)

    if (testRes.status === 401 || testRes.status === 403) {
      console.log("\n⚠️ Causa: A chave informada é inválida ou o RLS/permissões estão bloqueando a consulta.")
      console.log("   Execute o script 'scripts/005_setup_supabase_estoque.sql' no SQL Editor do Supabase.")
    } else if (testRes.status === 404 || testRes.status === 400) {
      console.log("\n⚠️ Causa: A tabela 'estoque_itens' ainda não foi criada ou falta a coluna 'reduzido'.")
      console.log("   Execute o script 'scripts/005_setup_supabase_estoque.sql' no SQL Editor do Supabase.")
    }
    process.exit(1)
  }

  console.log("✅ Tabela 'estoque_itens' encontrada e acessível no Supabase!")

  // 3. Fazer upload em lotes de 50 produtos com ON CONFLICT (upsert)
  console.log(`\n🚀 Enviando ${items.length} produtos para o Supabase...`)

  const payload = items.map((item) => ({
    reduzido: String(item.reduzido),
    descricao: String(item.descricao),
    pallet_total: Number(item.palletTotal || 0),
    lastro: Number(item.lastro || 0),
    unidade: Boolean(item.unidade),
    tipo_unidade: String(item.tipoUnidade || "cx"),
    tara_kg: Number(item.taraKg || 0),
    peso_kg: Number(item.pesoKg || 0),
    ativo: true,
    updated_at: new Date().toISOString(),
  }))

  const batchSize = 50
  let uploaded = 0

  for (let i = 0; i < payload.length; i += batchSize) {
    const batch = payload.slice(i, i + batchSize)
    const upsertRes = await fetch(`${supabaseUrl}/rest/v1/estoque_itens?on_conflict=reduzido`, {
      method: "POST",
      headers: {
        ...headers,
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(batch),
    })

    if (!upsertRes.ok) {
      const err = await upsertRes.text()
      console.error(`❌ Erro no lote ${i + 1}-${i + batch.length}: ${upsertRes.status} - ${err}`)
    } else {
      uploaded += batch.length
      console.log(`   ✓ Lote enviado: ${uploaded}/${payload.length} produtos`)
    }
  }

  // 4. Verificar contagem total no Supabase
  const countRes = await fetch(`${supabaseUrl}/rest/v1/estoque_itens?select=reduzido`, {
    method: "HEAD",
    headers: {
      ...headers,
      Prefer: "count=exact",
    },
  })

  const cr = countRes.headers.get("content-range")
  const totalInCloud = cr && cr.includes("/") ? cr.split("/")[1] : "OK"

  console.log("\n==================================================================")
  console.log(`🎉 Sucesso! Total de produtos disponíveis no Supabase: ${totalInCloud}`)
  console.log("==================================================================")
}

main().catch((err) => {
  console.error("Erro fatal:", err)
  process.exit(1)
})
