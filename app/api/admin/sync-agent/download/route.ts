import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const zipPath = path.join(process.cwd(), "public", "downloads", "setup-maia-sync-agent.zip")
    const fileBuffer = await fs.readFile(zipPath)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="setup-maia-sync-agent.zip"',
        "Cache-Control": "no-store",
      },
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: "Arquivo de instalador não encontrado." }, { status: 404 })
  }
}
