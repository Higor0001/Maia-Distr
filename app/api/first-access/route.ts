import { NextResponse } from "next/server"
import { hashPassword, requireSession } from "@/lib/auth"
import { supabaseFetch } from "@/lib/db"

export async function POST(request: Request) {
  const auth = requireSession(request)
  if ("response" in auth) return auth.response
  if (auth.session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Apenas administradores podem cadastrar usuários." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const usuario = String(body?.usuario || "").trim().toLowerCase()
    const nome = String(body?.nome || "").trim()
    const email = String(body?.email || "").trim().toLowerCase()
    const senha = String(body?.senha || "")
    const unidade = body?.unidade === "matriz" ? "matriz" : "filial"

    if (!/^[a-z0-9._-]{3,60}$/.test(usuario) || nome.length < 2 || !email.includes("@") || senha.length < 10) {
      return NextResponse.json({ ok: false, error: "Informe usuário válido, nome, e-mail e uma senha de pelo menos 10 caracteres." }, { status: 400 })
    }

    const response = await supabaseFetch("triagem_usuarios?on_conflict=usuario", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([{ usuario, nome, email, unidade, senha_hash: await hashPassword(senha), senha: null, role: "operator", can_register: false }]),
    })
    if (!response?.ok) return NextResponse.json({ ok: false, error: "Não foi possível salvar o usuário." }, { status: 502 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/first-access error:", error)
    return NextResponse.json({ ok: false, error: "Erro ao cadastrar usuário." }, { status: 500 })
  }
}
