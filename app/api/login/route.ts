import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { supabaseFetch } from "@/lib/db"

export interface TriagemUser {
  usuario: string
  nome: string
  email?: string
  senha?: string
  unidade: "filial" | "matriz"
  turno?: string
  canRegister?: boolean
}

const DATA_DIR = path.join(process.cwd(), "data")
const USERS_FILE = path.join(DATA_DIR, "usuarios.json")

const DEFAULT_USERS: TriagemUser[] = [
  {
    usuario: "admin",
    nome: "ALEXANDRE HIGOR COSTA QUEIROZ",
    email: "admin@maiadistribuidora.com",
    senha: process.env.ADMIN_PASSWORD || "123456",
    unidade: "filial",
    turno: "Matutino",
    canRegister: true,
  },
  {
    usuario: "higor",
    nome: "ALEXANDRE HIGOR COSTA QUEIROZ",
    email: "higor@maiadistribuidora.com",
    senha: process.env.ADMIN_PASSWORD || "123456",
    unidade: "filial",
    turno: "Matutino",
    canRegister: true,
  },
]

export function loadUsersFromDbFile(): TriagemUser[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2), "utf-8")
      return DEFAULT_USERS
    }
    const raw = fs.readFileSync(USERS_FILE, "utf-8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_USERS
  } catch {
    return DEFAULT_USERS
  }
}

export function saveUsersToDbFile(users: TriagemUser[]) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8")
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const usuarioInput = String(body?.usuario || "").trim()
    const senhaInput = String(body?.senha || "").trim()
    const scope = body?.scope === "matriz" ? "matriz" : "filial"

    if (!usuarioInput || !senhaInput) {
      return NextResponse.json(
        { ok: false, error: "Preencha usuario e senha para continuar." },
        { status: 400 }
      )
    }

    // 1. Tentar autenticar no Supabase se configurado
    const supaRes = await supabaseFetch(
      `triagem_usuarios?usuario=ilike.${encodeURIComponent(usuarioInput)}&limit=1`
    )
    if (supaRes && supaRes.ok) {
      const rows = await supaRes.json()
      if (Array.isArray(rows) && rows.length > 0) {
        const dbUser = rows[0]
        if (String(dbUser.senha) === senhaInput) {
          return NextResponse.json({
            ok: true,
            user: {
              usuario: dbUser.usuario,
              nome: dbUser.nome || dbUser.usuario,
              email: dbUser.email || "",
              unidade: dbUser.unidade || scope,
              canRegister: Boolean(dbUser.can_register ?? true),
            },
          })
        } else {
          return NextResponse.json(
            { ok: false, error: "Usuario ou senha invalidos." },
            { status: 401 }
          )
        }
      }
    }

    // 2. Autenticar no banco local (data/usuarios.json)
    const users = loadUsersFromDbFile()
    const matched = users.find(
      (u) =>
        u.usuario.toLowerCase() === usuarioInput.toLowerCase() ||
        u.nome.toLowerCase() === usuarioInput.toLowerCase()
    )

    if (matched) {
      if (matched.senha && matched.senha !== senhaInput) {
        return NextResponse.json(
          { ok: false, error: "Usuario ou senha invalidos." },
          { status: 401 }
        )
      }
      return NextResponse.json({
        ok: true,
        user: {
          usuario: matched.usuario,
          nome: matched.nome || matched.usuario,
          email: matched.email || "",
          unidade: scope,
          canRegister: matched.canRegister ?? true,
        },
      })
    }

    // 3. Caso a senha mestre ADMIN_PASSWORD seja usada, permite acesso imediato
    const masterPwd = process.env.ADMIN_PASSWORD || "123456"
    if (senhaInput === masterPwd) {
      return NextResponse.json({
        ok: true,
        user: {
          usuario: usuarioInput,
          nome: usuarioInput.toUpperCase(),
          unidade: scope,
          canRegister: true,
        },
      })
    }

    return NextResponse.json(
      { ok: false, error: "Usuario ou senha invalidos." },
      { status: 401 }
    )
  } catch (error) {
    console.error("POST /api/login error:", error)
    return NextResponse.json(
      { ok: false, error: "Nao foi possivel autenticar. Tente novamente." },
      { status: 500 }
    )
  }
}
