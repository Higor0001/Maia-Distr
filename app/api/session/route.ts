import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET(request: Request) {
  const user = getSession(request)
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })
  return NextResponse.json({ ok: true, user })
}
