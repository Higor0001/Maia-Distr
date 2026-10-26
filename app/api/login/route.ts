import { NextResponse } from "next/server"
import { createSessionResponse, verifyPassword } from "@/lib/auth"
import { supabaseFetch } from "@/lib/db"
import fs from "fs/promises"
import path from "path"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const usuario = String(body?.usuario || "").trim().toLowerCase()
    const senha = String(body?.senha || "")

    if (!usuario || !senha) {
      return NextResponse.json({ ok: false, error: "Informe usuário e senha." }, { status: 400 })
    }

    let user: any = null

    // 1. Tenta buscar usuário no Supabase
    try {
      const response = await supabaseFetch(
        `triagem_usuarios?select=usuario,nome,unidade,can_register,role,senha_hash,senha&usuario=eq.${encodeURIComponent(usuario)}&limit=1`
      )
      if (response && response.ok) {
        const rows = await response.json()
        if (Array.isArray(rows) && rows.length > 0) {
          user = rows[0]
        }
      }
    } catch {
      // Ignora erro de rede/Supabase e segue para fallback local
    }

    // 2. Fallback para data/usuarios.json se usuário não encontrado no Supabase
    if (!user) {
      try {
        const filePath = path.join(process.cwd(), "data", "usuarios.json")
        const content = await fs.readFile(filePath, "utf-8")
        const localList = JSON.parse(content)
        if (Array.isArray(localList)) {
          user = localList.find((u: any) => String(u.usuario || "").trim().toLowerCase() === usuario)
        }
      } catch {
        // Arquivo local indisponível
      }
    }

    if (!user) {
      return NextResponse.json({ ok: false, error: "Usuário ou senha inválidos." }, { status: 401 })
    }

    const hashToVerify = user.senha_hash || user.senha
    if (!hashToVerify || !(await verifyPassword(senha, String(hashToVerify)))) {
      return NextResponse.json({ ok: false, error: "Usuário ou senha inválidos." }, { status: 401 })
    }

    const role = (user.role === "admin" || user.usuario === "admin" || user.usuario === "higor") ? "admin" : (user.role || "operator")

    return createSessionResponse({
      usuario: String(user.usuario),
      nome: String(user.nome || user.usuario),
      unidade: user.unidade === "matriz" ? "matriz" : "filial",
      canRegister: Boolean(user.can_register ?? user.canRegister),
      role,
    })
  } catch (error) {
    console.error("POST /api/login error:", error)
    return NextResponse.json({ ok: false, error: "Não foi possível autenticar." }, { status: 500 })
  }
}
