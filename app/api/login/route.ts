import { NextResponse } from "next/server"
import { createSessionResponse, verifyPassword } from "@/lib/auth"
import { supabaseFetch } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const usuario = String(body?.usuario || "").trim().toLowerCase()
    const senha = String(body?.senha || "")

    if (!usuario || !senha) {
      return NextResponse.json({ ok: false, error: "Informe usuário e senha." }, { status: 400 })
    }

    const response = await supabaseFetch(
      `triagem_usuarios?select=usuario,nome,unidade,can_register,role,senha_hash&usuario=eq.${encodeURIComponent(usuario)}&limit=1`
    )
    if (!response) {
      return NextResponse.json({ ok: false, error: "Banco de dados não configurado." }, { status: 503 })
    }
    if (!response.ok) {
      return NextResponse.json({ ok: false, error: "Não foi possível autenticar agora." }, { status: 502 })
    }

    const [user] = await response.json()
    if (!user?.senha_hash || !(await verifyPassword(senha, String(user.senha_hash)))) {
      return NextResponse.json({ ok: false, error: "Usuário ou senha inválidos." }, { status: 401 })
    }

    return createSessionResponse({
      usuario: String(user.usuario),
      nome: String(user.nome || user.usuario),
      unidade: user.unidade === "matriz" ? "matriz" : "filial",
      canRegister: Boolean(user.can_register),
      role: user.role === "admin" ? "admin" : "operator",
    })
  } catch (error) {
    console.error("POST /api/login error:", error)
    return NextResponse.json({ ok: false, error: "Não foi possível autenticar." }, { status: 500 })
  }
}
