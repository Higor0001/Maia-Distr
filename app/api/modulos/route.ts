import { NextResponse } from "next/server"
import { getSystemSettings } from "@/lib/settings"

export const dynamic = "force-dynamic"
export const revalidate = 0

// Endpoint público para leitura das flags dos módulos em tempo real
export async function GET() {
  try {
    const settings = await getSystemSettings()
    return NextResponse.json(
      {
        ok: true,
        modulos: settings.modulos || {
          moduloEstoqueAtivo: false,
          moduloPerdasAtivo: true,
          moduloConferenciaAtivo: true,
          moduloSeparacaoAtivo: false,
          moduloExcelAtivo: false,
          moduloCloudR2Ativo: false,
          moduloSyncAgentAtivo: false,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    )
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        modulos: {
          moduloEstoqueAtivo: false,
          moduloPerdasAtivo: true,
          moduloConferenciaAtivo: true,
          moduloSeparacaoAtivo: false,
          moduloExcelAtivo: false,
          moduloCloudR2Ativo: false,
          moduloSyncAgentAtivo: false,
        },
        error: err.message,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    )
  }
}
