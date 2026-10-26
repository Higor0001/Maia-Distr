import { NextResponse } from "next/server"
import { hashPassword, requireSession } from "@/lib/auth"
import { supabaseFetch } from "@/lib/db"
import { z } from "zod"
import fs from "fs/promises"
import path from "path"

const userSchema = z.object({
  usuario: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,60}$/),
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  senha: z.string().min(6).max(256),
  unidade: z.enum(["filial", "matriz"]),
  role: z.enum(["admin", "operator"]),
  canRegister: z.boolean().default(false),
})

const updateSchema = z.object({
  usuario: z.string().trim().toLowerCase(),
  nome: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(180).optional(),
  senha: z.string().min(6).max(256).optional(),
  unidade: z.enum(["filial", "matriz"]).optional(),
  role: z.enum(["admin", "operator"]).optional(),
  canRegister: z.boolean().optional(),
})

function requireAdmin(request: Request) {
  const auth = requireSession(request)
  if ("response" in auth) return auth
  if (auth.session.role !== "admin") {
    return { response: NextResponse.json({ ok: false, error: "Acesso restrito a administradores." }, { status: 403 }) }
  }
  return auth
}

interface LocalUser {
  usuario: string
  nome: string
  email: string
  unidade: "filial" | "matriz"
  role: "admin" | "operator"
  can_register: boolean
  canRegister?: boolean
  senha?: string | null
  senha_hash?: string | null
  created_at: string
  updated_at: string
}

async function getLocalUsers(): Promise<LocalUser[]> {
  try {
    const filePath = path.join(process.cwd(), "data", "usuarios.json")
    const content = await fs.readFile(filePath, "utf-8")
    const list = JSON.parse(content)
    if (Array.isArray(list)) {
      return list.map((u: any) => ({
        usuario: String(u.usuario || "").toLowerCase(),
        nome: String(u.nome || u.usuario),
        email: String(u.email || ""),
        unidade: u.unidade === "matriz" ? "matriz" : "filial",
        role: (u.role === "admin" || u.usuario === "admin" || u.usuario === "higor") ? "admin" : (u.role || "operator"),
        can_register: Boolean(u.canRegister ?? u.can_register ?? false),
        canRegister: Boolean(u.canRegister ?? u.can_register ?? false),
        senha: u.senha || null,
        senha_hash: u.senha_hash || null,
        created_at: u.created_at || new Date().toISOString(),
        updated_at: u.updated_at || new Date().toISOString(),
      }))
    }
  } catch {}
  return []
}

async function saveLocalUsers(users: any[]) {
  try {
    const filePath = path.join(process.cwd(), "data", "usuarios.json")
    await fs.writeFile(filePath, JSON.stringify(users, null, 2), "utf-8")
  } catch (err) {
    console.error("Erro ao salvar data/usuarios.json:", err)
  }
}

export async function GET(request: Request) {
  const auth = requireAdmin(request)
  if ("response" in auth) return auth.response

  try {
    const response = await supabaseFetch("triagem_usuarios?select=usuario,nome,email,unidade,turno,role,can_register,created_at,updated_at&order=nome.asc")
    if (response && response.ok) {
      const rows = await response.json()
      if (Array.isArray(rows) && rows.length > 0) {
        return NextResponse.json({ ok: true, users: rows })
      }
    }
  } catch {
    // Fallback para arquivo local
  }

  const localUsers = await getLocalUsers()
  return NextResponse.json({ ok: true, users: localUsers })
}

export async function POST(request: Request) {
  const auth = requireAdmin(request)
  if ("response" in auth) return auth.response
  const parsed = userSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Confira os dados do novo usuário (mínimo 6 caracteres para senha)." }, { status: 400 })
  }

  const user = parsed.data
  const senhaHash = await hashPassword(user.senha)

  // 1. Tenta salvar no Supabase
  let savedUser: any = null
  try {
    const response = await supabaseFetch("triagem_usuarios?on_conflict=usuario", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([{
        usuario: user.usuario,
        nome: user.nome,
        email: user.email,
        unidade: user.unidade,
        role: user.role,
        can_register: user.canRegister,
        senha_hash: senhaHash,
        senha: null,
        updated_at: new Date().toISOString(),
      }]),
    })
    if (response?.ok) {
      const rows = await response.json()
      savedUser = rows[0]
    }
  } catch {
    // Supabase indisponível no momento
  }

  // 2. Mantém data/usuarios.json sincronizado
  try {
    const localUsers = await getLocalUsers()
    const index = localUsers.findIndex((u) => u.usuario === user.usuario)
    const nowIso = new Date().toISOString()
    const localRecord = {
      usuario: user.usuario,
      nome: user.nome,
      email: user.email,
      unidade: user.unidade,
      role: user.role,
      can_register: user.canRegister,
      canRegister: user.canRegister,
      senha: user.senha,
      senha_hash: senhaHash,
      created_at: nowIso,
      updated_at: nowIso,
    }
    if (index >= 0) {
      localUsers[index] = { ...localUsers[index], ...localRecord }
    } else {
      localUsers.push(localRecord)
    }
    await saveLocalUsers(localUsers)
  } catch {}

  return NextResponse.json({
    ok: true,
    user: savedUser || {
      usuario: user.usuario,
      nome: user.nome,
      email: user.email,
      unidade: user.unidade,
      role: user.role,
      can_register: user.canRegister,
    },
  }, { status: 201 })
}

export async function PATCH(request: Request) {
  const auth = requireAdmin(request)
  if ("response" in auth) return auth.response

  const parsed = updateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Dados inválidos para atualização." }, { status: 400 })
  }

  const update = parsed.data
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }
  if (update.nome) updateData.nome = update.nome
  if (update.email) updateData.email = update.email
  if (update.unidade) updateData.unidade = update.unidade
  if (update.role) updateData.role = update.role
  if (update.canRegister !== undefined) updateData.can_register = update.canRegister
  if (update.senha) {
    updateData.senha_hash = await hashPassword(update.senha)
    updateData.senha = null
  }

  // Tenta atualizar no Supabase
  try {
    await supabaseFetch(`triagem_usuarios?usuario=eq.${encodeURIComponent(update.usuario)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(updateData),
    })
  } catch {}

  // Atualiza arquivo local
  try {
    const localUsers = await getLocalUsers()
    const index = localUsers.findIndex((u) => u.usuario === update.usuario)
    if (index >= 0) {
      localUsers[index] = {
        ...localUsers[index],
        ...updateData,
        canRegister: update.canRegister !== undefined ? update.canRegister : localUsers[index].can_register,
      }
      if (update.senha) {
        localUsers[index].senha = update.senha
        localUsers[index].senha_hash = updateData.senha_hash
      }
      await saveLocalUsers(localUsers)
    }
  } catch {}

  return NextResponse.json({ ok: true, message: "Usuário atualizado com sucesso." })
}

export async function DELETE(request: Request) {
  const auth = requireAdmin(request)
  if ("response" in auth) return auth.response

  const { searchParams } = new URL(request.url)
  const targetUser = searchParams.get("usuario")?.trim().toLowerCase()

  if (!targetUser) {
    return NextResponse.json({ ok: false, error: "Informe o usuário a ser removido." }, { status: 400 })
  }

  if (targetUser === auth.session.usuario.toLowerCase()) {
    return NextResponse.json({ ok: false, error: "Você não pode excluir o seu próprio usuário administrador." }, { status: 400 })
  }

  // Exclui do Supabase
  try {
    await supabaseFetch(`triagem_usuarios?usuario=eq.${encodeURIComponent(targetUser)}`, {
      method: "DELETE",
    })
  } catch {}

  // Exclui do local
  try {
    const localUsers = await getLocalUsers()
    const filtered = localUsers.filter((u) => u.usuario !== targetUser)
    await saveLocalUsers(filtered)
  } catch {}

  return NextResponse.json({ ok: true, message: `Usuário ${targetUser} removido com sucesso.` })
}
