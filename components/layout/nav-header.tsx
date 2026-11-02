"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Scale, AlertTriangle, Layers, ShieldCheck, LogOut, Menu, X, FileText, Settings } from "lucide-react"

interface NavHeaderProps {
  user?: {
    usuario: string
    nome?: string
    unidade?: string
    role?: string
  } | null
  onLogout?: () => void
}

export function NavHeader({ user, onLogout }: NavHeaderProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [modulos, setModulos] = useState({
    moduloEstoqueAtivo: false,
    moduloSeparacaoAtivo: false,
    moduloExcelAtivo: false,
  })

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings?.modulos) {
          setModulos(data.settings.modulos)
        }
      })
      .catch(() => {})
  }, [])

  const navLinks = [
    {
      href: "/simples-conferencia",
      label: "Simples Conferência",
      icon: Scale,
      active: pathname === "/simples-conferencia",
      badge: "Operacional",
      badgeColor: "bg-emerald-500",
    },
    {
      href: "/perdas",
      label: "Perdas",
      icon: AlertTriangle,
      active: pathname === "/perdas" || pathname === "/",
      badge: null,
      badgeColor: "",
    },
    ...(modulos.moduloSeparacaoAtivo || user?.role === "admin"
      ? [
          {
            href: "/separacao",
            label: "Separação de Pedidos",
            icon: Layers,
            active: pathname.startsWith("/separacao"),
            badge: !modulos.moduloSeparacaoAtivo ? "Admin / Prévia" : null,
            badgeColor: "bg-amber-500",
          },
        ]
      : []),
    ...(user?.role === "admin"
      ? [
          {
            href: "/admin",
            label: "Administração",
            icon: ShieldCheck,
            active: pathname.startsWith("/admin"),
            badge: null,
            badgeColor: "",
          },
        ]
      : []),
  ]

  const handleLogout = async () => {
    if (onLogout) {
      onLogout()
      return
    }
    try {
      await fetch("/api/logout", { method: "POST" })
      window.location.href = "/"
    } catch {
      window.location.reload()
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-gradient-to-r from-[#1a2a6c] via-[#203a8f] to-[#2745a3] text-white shadow-lg backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between h-16">
        {/* Brand / Logo */}
        <Link href="/simples-conferencia" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fdbb2d] to-[#b21f1f] p-0.5 shadow-md group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#1a2a6c] rounded-[10px] flex items-center justify-center font-black text-amber-400 text-lg">
              M
            </div>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-extrabold tracking-wide uppercase flex items-center gap-1.5 text-white">
              Maia Distribuidora
              <span className="text-[10px] bg-amber-400 text-slate-900 font-bold px-1.5 py-0.5 rounded uppercase">
                Operacional
              </span>
            </div>
            <div className="text-[11px] text-blue-200">Hortigranjeiros & Conferência</div>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  link.active
                    ? "bg-white text-[#1a2a6c] shadow-md font-black"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${link.active ? "text-[#1a2a6c]" : "text-amber-400"}`} />
                <span>{link.label}</span>
                {link.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full text-white font-semibold ${link.badgeColor}`}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Info & Actions */}
        <div className="flex items-center gap-2">
          {user && (
            <div className="hidden sm:flex items-center gap-2 bg-white/10 border border-white/15 px-2.5 py-1.5 rounded-xl">
              <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-300 font-bold text-xs flex items-center justify-center border border-amber-400/40">
                {user.nome ? user.nome.charAt(0).toUpperCase() : user.usuario.charAt(0).toUpperCase()}
              </div>
              <div className="text-left leading-none">
                <div className="text-xs font-bold text-white max-w-[120px] truncate">
                  {user.nome || user.usuario}
                </div>
                <div className="text-[10px] text-amber-300 font-semibold uppercase mt-0.5">
                  {user.role || "Operador"}
                </div>
              </div>
            </div>
          )}

          {user && (
            <button
              onClick={handleLogout}
              title="Encerrar sessão"
              className="p-2 rounded-xl text-blue-200 hover:text-rose-300 hover:bg-rose-500/20 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-white hover:bg-white/10"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#172554] px-4 py-3 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold ${
                  link.active
                    ? "bg-white text-[#1a2a6c]"
                    : "text-blue-100 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-amber-400" />
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full text-white ${link.badgeColor}`}>
                    {link.badge}
                  </span>
                )}
              </Link>
            )
          })}
          <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs text-blue-200">
            <span>Versão 2.0 • PWA Ready</span>
            <Link href="/termos" className="underline hover:text-white">
              Termos de Uso
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
