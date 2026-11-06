import { NextResponse } from "next/server"
import { getSystemSettings } from "@/lib/settings"

export const dynamic = "force-dynamic"
export const revalidate = 0

const UNLOCKED_MODULOS = {
  moduloEstoqueAtivo: true,
  moduloPerdasAtivo: true,
  moduloConferenciaAtivo: true,
  moduloSeparacaoAtivo: true,
  moduloExcelAtivo: true,
  moduloCloudR2Ativo: true,
  moduloSyncAgentAtivo: true,
}

// Endpoint público para leitura das flags dos módulos em tempo real (todos desbloqueados)
export async function GET() {
  try {
    const settings = await getSystemSettings()
    return NextResponse.json(
      {
        ok: true,
        modulos: {
          ...UNLOCKED_MODULOS,
          ...(settings.modulos || {}),
          moduloEstoqueAtivo: true,
          moduloPerdasAtivo: true,
          moduloConferenciaAtivo: true,
          moduloSeparacaoAtivo: true,
          moduloExcelAtivo: true,
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
        ok: true,
        modulos: UNLOCKED_MODULOS,
        error: err.message,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    )
  }
}
