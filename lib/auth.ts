import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto"
import { promisify } from "util"
import { NextResponse } from "next/server"

const scrypt = promisify(scryptCallback)
const COOKIE_NAME = "triagem_session"
const SESSION_DURATION_SECONDS = 60 * 60 * 8

export interface SessionUser {
  usuario: string
  nome: string
  unidade: "filial" | "matriz"
  canRegister: boolean
  role: "admin" | "operator"
}

interface SessionPayload extends SessionUser {
  exp: number
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET?.trim()
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET deve possuir pelo menos 32 caracteres.")
  }
  return secret
}

function encode(value: string) {
  return Buffer.from(value).toString("base64url")
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8")
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url")
}

function getCookie(request: Request, name: string) {
  const cookies = request.headers.get("cookie") || ""
  return cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}

export function getSession(request: Request): SessionUser | null {
  try {
    const token = getCookie(request, COOKIE_NAME)
    if (!token) return null
    const [encodedPayload, signature] = token.split(".")
    if (!encodedPayload || !signature) return null

    const expectedSignature = sign(encodedPayload)
    if (
      signature.length !== expectedSignature.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
    ) {
      return null
    }

    const payload = JSON.parse(decode(encodedPayload)) as SessionPayload
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null
    if (!payload.usuario || !payload.nome) return null

    return {
      usuario: payload.usuario,
      nome: payload.nome,
      unidade: payload.unidade === "matriz" ? "matriz" : "filial",
      canRegister: Boolean(payload.canRegister),
      role: payload.role === "admin" ? "admin" : "operator",
    }
  } catch {
    return null
  }
}

export function requireSession(request: Request) {
  const session = getSession(request)
  if (session) return { session }

  return {
    response: NextResponse.json(
      { ok: false, error: "Sua sessão expirou. Entre novamente para continuar." },
      { status: 401 }
    ),
  }
}

export function createSessionResponse(user: SessionUser) {
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  }
  const encodedPayload = encode(JSON.stringify(payload))
  const token = `${encodedPayload}.${sign(encodedPayload)}`
  const response = NextResponse.json({ ok: true, user })

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  })
  return response
}

export function clearSessionResponse() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, "", { httpOnly: true, maxAge: 0, path: "/" })
  return response
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url")
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer
  return `scrypt$${salt}$${derivedKey.toString("base64url")}`
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, encodedKey] = storedHash.split("$")
  if (algorithm !== "scrypt" || !salt || !encodedKey) return false

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer
  const expectedKey = Buffer.from(encodedKey, "base64url")
  return expectedKey.length === derivedKey.length && timingSafeEqual(expectedKey, derivedKey)
}
