import { NextResponse } from "next/server"
import { loadUsersFromDbFile, saveUsersToDbFile, type TriagemUser } from "../login/route"
import { supabaseFetch } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const usuario = String(body?.usuario || "").trim()
    const email = body?.email ? String(body.email).trim() : ""
    const senha = body?.senha ? String(body.senha).trim() : ""
    const nome = body?.nome ? String(body.nome).trim() : ""

    if (!usuario) {
      return NextResponse.json(
        { ok: false, error: "Informe a matricula ou usuario para continuar." },
        { status: 400 }
      )
    }

    const users = loadUsersFromDbFile()
    const existing = users.find(
      (u) => u.usuario.toLowerCase() === usuario.toLowerCase()
    )

    // Etapa 1: Apenas consulta da matrícula/usuário
    if (!email && !senha) {
      return NextResponse.json({
        ok: true,
        user: {
          usuario,
          nome: existing?.nome || usuario.toUpperCase(),
        },
      })
    }

    // Etapa 2: Concluir cadastro de primeiro acesso
    if (!email || !senha) {
      return NextResponse.json(
        { ok: false, error: "Email e senha sao obrigatorios." },
        { status: 400 }
      )
    }

    const newUser: TriagemUser = {
      usuario,
      nome: nome || existing?.nome || usuario.toUpperCase(),
      email,
      senha,
      unidade: existing?.unidade || "filial",
      canRegister: true,
    }

    await supabaseFetch("triagem_usuarios?on_conflict=usuario", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([
        {
          usuario: newUser.usuario,
          nome: newUser.nome,
          email: newUser.email,
          senha: newUser.senha,
          unidade: newUser.unidade,
          can_register: true,
          updated_at: new Date().toISOString(),
        },
      ]),
    })

    const idx = users.findIndex(
      (u) => u.usuario.toLowerCase() === usuario.toLowerCase()
    )
    if (idx >= 0) {
      users[idx] = newUser
    } else {
      users.push(newUser)
    }
    saveUsersToDbFile(users)

    return NextResponse.json({ ok: true, user: newUser })
  } catch (error) {
    console.error("POST /api/first-access error:", error)
    return NextResponse.json(
      { ok: false, error: "Erro ao concluir cadastro." },
      { status: 500 }
    )
  }
}
