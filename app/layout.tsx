import type React from "react"
import "./globals.css"
import type { Metadata, Viewport } from "next"
import { SwCleanup } from "@/components/sw-cleanup"

export const metadata: Metadata = {
  title: "Maia Distribuidora — Sistema Operacional",
  description:
    "Plataforma de Simples Conferência, Pesagem, Separação de Pedidos e Controle de Perdas da Maia Distribuidora",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#1a2a6c",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-br">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body>
        <SwCleanup />
        {children}
      </body>
    </html>
  )
}
