"use client"

import React, { FormEvent, useEffect, useState, useMemo } from "react"
import Link from "next/link"
import {
  Users,
  Settings,
  Mail,
  Send,
  Server,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Plus,
  Edit,
  Trash2,
  Key,
  RefreshCw,
  ArrowLeft,
  LogOut,
  Eye,
  EyeOff,
  Database,
  Network,
  Download,
  Building2,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react"

interface User {
  usuario: string
  nome: string
  email: string
  unidade: "filial" | "matriz"
  role: "admin" | "operator"
  can_register: boolean
  created_at?: string
}

interface SmtpForm {
  enabled: boolean
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  fromName: string
  fromEmail: string
  recipientsEstoqueFilial: string
  recipientsEstoqueMatriz: string
  recipientsPerdas: string
  autoSendEstoque: boolean
  autoSendPerdas: boolean
}

interface TelegramForm {
  botToken: string
  chatIdFilial: string
  chatIdMatriz: string
  autoSend: boolean
}

interface SmbForm {
  enabled: boolean
  sharePath: string
  username: string
  domain: string
  saveEstoquePdf: boolean
  savePerdasPdf: boolean
}

interface StatsData {
  usersCount: number
  itemsCount: number
  countsCount: number
  perdasCount: number
}

interface ServicesData {
  database: { type: string; online: boolean; cloudConnected: boolean }
  smtp: { configured: boolean; enabled: boolean; host: string; port: number; fromEmail?: string }
  telegram: { configured: boolean; botTokenSet: boolean; hasFilialChat: boolean; hasMatrizChat: boolean }
  smb: { enabled: boolean; configured: boolean; sharePath: string }
}

type TabType = "overview" | "users" | "smtp" | "telegram" | "smb" | "backup"

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview")
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [isAccessDenied, setIsAccessDenied] = useState(false)

  // Login form se não autenticado
  const [loginForm, setLoginForm] = useState({ usuario: "", senha: "" })
  const [loginError, setLoginError] = useState("")
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Estatísticas & Status
  const [stats, setStats] = useState<StatsData>({ usersCount: 0, itemsCount: 0, countsCount: 0, perdasCount: 0 })
  const [services, setServices] = useState<ServicesData | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  // Usuários
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [searchUser, setSearchUser] = useState("")
  const [filterRole, setFilterRole] = useState<"all" | "admin" | "operator">("all")
  const [filterUnidade, setFilterUnidade] = useState<"all" | "filial" | "matriz">("all")

  // Modal Usuário
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [isEditingUser, setIsEditingUser] = useState(false)
  const [userForm, setUserForm] = useState({
    usuario: "",
    nome: "",
    email: "",
    senha: "",
    unidade: "filial" as "filial" | "matriz",
    role: "operator" as "admin" | "operator",
    canRegister: false,
  })
  const [userActionMsg, setUserActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [savingUser, setSavingUser] = useState(false)

  // Modal Reset de Senha
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [targetResetUser, setTargetResetUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [resettingPassword, setResettingPassword] = useState(false)

  // Modal Confirmação de Exclusão
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [targetDeleteUser, setTargetDeleteUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState(false)

  // SMTP Form & Test
  const [smtpForm, setSmtpForm] = useState<SmtpForm>({
    enabled: false,
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    user: "",
    pass: "",
    fromName: "Triagem Filial - Hortigranjeiros",
    fromEmail: "",
    recipientsEstoqueFilial: "",
    recipientsEstoqueMatriz: "",
    recipientsPerdas: "",
    autoSendEstoque: false,
    autoSendPerdas: false,
  })
  const [showSmtpPassword, setShowSmtpPassword] = useState(false)
  const [savingSmtp, setSavingSmtp] = useState(false)
  const [testEmailRecipient, setTestEmailRecipient] = useState("")
  const [testingSmtp, setTestingSmtp] = useState(false)
  const [smtpFeedback, setSmtpFeedback] = useState<{ type: "success" | "error"; text: string; details?: string } | null>(null)

  // Telegram Form & Test
  const [telegramForm, setTelegramForm] = useState<TelegramForm>({
    botToken: "",
    chatIdFilial: "",
    chatIdMatriz: "",
    autoSend: true,
  })
  const [savingTelegram, setSavingTelegram] = useState(false)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [telegramFeedback, setTelegramFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // SMB Form
  const [smbForm, setSmbForm] = useState<SmbForm>({
    enabled: false,
    sharePath: "\\\\servidor\\hortifruti\\relatorios",
    username: "",
    domain: "",
    saveEstoquePdf: false,
    savePerdasPdf: false,
  })
  const [savingSmb, setSavingSmb] = useState(false)
  const [smbFeedback, setSmbFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // 1. Checagem de Sessão
  const checkSession = async () => {
    setAuthChecking(true)
    try {
      const res = await fetch("/api/session")
      const data = await res.json()
      if (data?.ok && data.user) {
        setCurrentUser(data.user)
        if (data.user.role === "admin") {
          setIsAccessDenied(false)
          setTestEmailRecipient(data.user.email || "gerencia@maiadistribuidora.com")
          await Promise.all([loadStats(), loadUsers(), loadSettings()])
        } else {
          setIsAccessDenied(true)
        }
      } else {
        setCurrentUser(null)
      }
    } catch {
      setCurrentUser(null)
    } finally {
      setAuthChecking(false)
    }
  }

  useEffect(() => {
    void checkSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Login inline se necessário
  const handleInlineLogin = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)
    setLoginError("")
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setLoginError(data?.error || "Usuário ou senha incorretos.")
      } else {
        await checkSession()
      }
    } catch {
      setLoginError("Erro ao comunicar com o servidor.")
    } finally {
      setIsLoggingIn(false)
    }
  }

  // Logout
  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" })
    window.location.href = "/"
  }

  // Carregar dados
  const loadStats = async () => {
    setLoadingStats(true)
    try {
      const res = await fetch("/api/admin/stats")
      const data = await res.json()
      if (data?.ok) {
        setStats(data.stats)
        setServices(data.services)
      }
    } catch (err) {
      console.error("Erro ao carregar estatísticas:", err)
    } finally {
      setLoadingStats(false)
    }
  }

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const res = await fetch("/api/users")
      const data = await res.json()
      if (data?.ok) {
        setUsers(data.users || [])
      }
    } catch (err) {
      console.error("Erro ao carregar usuários:", err)
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings")
      const data = await res.json()
      if (data?.ok && data.settings) {
        const { smtp, telegram, smb } = data.settings
        if (smtp) {
          setSmtpForm({
            enabled: Boolean(smtp.enabled),
            host: smtp.host || "smtp.gmail.com",
            port: Number(smtp.port) || 587,
            secure: Boolean(smtp.secure),
            user: smtp.user || "",
            pass: smtp.pass || "",
            fromName: smtp.fromName || "Triagem Filial - Hortigranjeiros",
            fromEmail: smtp.fromEmail || "",
            recipientsEstoqueFilial: Array.isArray(smtp.recipientsEstoqueFilial) ? smtp.recipientsEstoqueFilial.join(", ") : "",
            recipientsEstoqueMatriz: Array.isArray(smtp.recipientsEstoqueMatriz) ? smtp.recipientsEstoqueMatriz.join(", ") : "",
            recipientsPerdas: Array.isArray(smtp.recipientsPerdas) ? smtp.recipientsPerdas.join(", ") : "",
            autoSendEstoque: Boolean(smtp.autoSendEstoque),
            autoSendPerdas: Boolean(smtp.autoSendPerdas),
          })
        }
        if (telegram) {
          setTelegramForm({
            botToken: telegram.botToken || "",
            chatIdFilial: telegram.chatIdFilial || "",
            chatIdMatriz: telegram.chatIdMatriz || "",
            autoSend: telegram.autoSend !== false,
          })
        }
        if (smb) {
          setSmbForm({
            enabled: Boolean(smb.enabled),
            sharePath: smb.sharePath || "\\\\servidor\\hortifruti\\relatorios",
            username: smb.username || "",
            domain: smb.domain || "",
            saveEstoquePdf: Boolean(smb.saveEstoquePdf),
            savePerdasPdf: Boolean(smb.savePerdasPdf),
          })
        }
      }
    } catch (err) {
      console.error("Erro ao carregar configurações:", err)
    }
  }

  // Filtragem de usuários
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.nome.toLowerCase().includes(searchUser.toLowerCase()) ||
        u.usuario.toLowerCase().includes(searchUser.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchUser.toLowerCase()))
      const matchesRole = filterRole === "all" || u.role === filterRole
      const matchesUnidade = filterUnidade === "all" || u.unidade === filterUnidade
      return matchesSearch && matchesRole && matchesUnidade
    })
  }, [users, searchUser, filterRole, filterUnidade])

  // Ações de Usuário
  const openNewUserModal = () => {
    setIsEditingUser(false)
    setUserForm({
      usuario: "",
      nome: "",
      email: "",
      senha: "",
      unidade: "filial",
      role: "operator",
      canRegister: false,
    })
    setUserActionMsg(null)
    setUserModalOpen(true)
  }

  const openEditUserModal = (u: User) => {
    setIsEditingUser(true)
    setUserForm({
      usuario: u.usuario,
      nome: u.nome,
      email: u.email || "",
      senha: "",
      unidade: u.unidade,
      role: u.role,
      canRegister: u.can_register,
    })
    setUserActionMsg(null)
    setUserModalOpen(true)
  }

  const handleSaveUser = async (e: FormEvent) => {
    e.preventDefault()
    setSavingUser(true)
    setUserActionMsg(null)

    try {
      const endpoint = "/api/users"
      const method = isEditingUser ? "PATCH" : "POST"
      const payload: any = {
        usuario: userForm.usuario,
        nome: userForm.nome,
        email: userForm.email,
        unidade: userForm.unidade,
        role: userForm.role,
        canRegister: userForm.canRegister,
      }
      if (userForm.senha.trim()) {
        payload.senha = userForm.senha.trim()
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setUserActionMsg({ type: "error", text: data?.error || "Não foi possível salvar o usuário." })
      } else {
        setUserActionMsg({
          type: "success",
          text: isEditingUser ? "Usuário atualizado com sucesso!" : "Novo usuário cadastrado com sucesso!",
        })
        await loadUsers()
        await loadStats()
        setTimeout(() => setUserModalOpen(false), 900)
      }
    } catch {
      setUserActionMsg({ type: "error", text: "Erro ao comunicar com o servidor." })
    } finally {
      setSavingUser(false)
    }
  }

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault()
    if (!targetResetUser || !newPassword.trim()) return
    setResettingPassword(true)

    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario: targetResetUser.usuario,
          senha: newPassword.trim(),
        }),
      })
      const data = await res.json()
      if (data?.ok) {
        alert(`Senha do usuário @${targetResetUser.usuario} redefinida com sucesso!`)
        setPasswordModalOpen(false)
        setNewPassword("")
      } else {
        alert(data?.error || "Erro ao redefinir senha.")
      }
    } catch {
      alert("Erro ao conectar ao servidor.")
    } finally {
      setResettingPassword(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!targetDeleteUser) return
    setDeletingUser(true)

    try {
      const res = await fetch(`/api/users?usuario=${encodeURIComponent(targetDeleteUser.usuario)}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (data?.ok) {
        await loadUsers()
        await loadStats()
        setDeleteModalOpen(false)
        setTargetDeleteUser(null)
      } else {
        alert(data?.error || "Erro ao excluir usuário.")
      }
    } catch {
      alert("Erro ao excluir usuário.")
    } finally {
      setDeletingUser(false)
    }
  }

  const generateRandomPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%&*"
    let pass = ""
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewPassword(pass)
  }

  // Presets de Provedor SMTP
  const applySmtpPreset = (preset: "gmail" | "outlook" | "mailersend" | "sendgrid") => {
    if (preset === "gmail") {
      setSmtpForm((prev) => ({
        ...prev,
        enabled: true,
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        fromName: prev.fromName || "Triagem Filial - Hortigranjeiros",
      }))
    } else if (preset === "outlook") {
      setSmtpForm((prev) => ({
        ...prev,
        enabled: true,
        host: "smtp.office365.com",
        port: 587,
        secure: false,
        fromName: prev.fromName || "Triagem Filial - Hortigranjeiros",
      }))
    } else if (preset === "mailersend") {
      setSmtpForm((prev) => ({
        ...prev,
        enabled: true,
        host: "smtp.mailersend.net",
        port: 587,
        secure: false,
      }))
    } else if (preset === "sendgrid") {
      setSmtpForm((prev) => ({
        ...prev,
        enabled: true,
        host: "smtp.sendgrid.net",
        port: 587,
        secure: false,
        user: "apikey",
      }))
    }
  }

  // Salvar Configurações SMTP
  const handleSaveSmtp = async (e: FormEvent) => {
    e.preventDefault()
    setSavingSmtp(true)
    setSmtpFeedback(null)

    try {
      const splitEmails = (val: string) =>
        val
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && s.includes("@"))

      const payload = {
        smtp: {
          enabled: smtpForm.enabled,
          host: smtpForm.host.trim(),
          port: Number(smtpForm.port) || 587,
          secure: Boolean(smtpForm.secure),
          user: smtpForm.user.trim(),
          pass: smtpForm.pass.trim(),
          fromName: smtpForm.fromName.trim(),
          fromEmail: smtpForm.fromEmail.trim(),
          recipientsEstoqueFilial: splitEmails(smtpForm.recipientsEstoqueFilial),
          recipientsEstoqueMatriz: splitEmails(smtpForm.recipientsEstoqueMatriz),
          recipientsPerdas: splitEmails(smtpForm.recipientsPerdas),
          autoSendEstoque: smtpForm.autoSendEstoque,
          autoSendPerdas: smtpForm.autoSendPerdas,
        },
      }

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setSmtpFeedback({ type: "error", text: data?.error || "Erro ao salvar configurações de SMTP." })
      } else {
        setSmtpFeedback({ type: "success", text: "Configurações de SMTP salvas e ativas com sucesso!" })
        await loadStats()
      }
    } catch {
      setSmtpFeedback({ type: "error", text: "Erro ao comunicar com o servidor." })
    } finally {
      setSavingSmtp(false)
    }
  }

  // Testar SMTP
  const handleTestSmtp = async () => {
    const to = testEmailRecipient.trim()
    if (!to || !to.includes("@")) {
      setSmtpFeedback({ type: "error", text: "Digite um e-mail válido no campo de teste." })
      return
    }

    setTestingSmtp(true)
    setSmtpFeedback(null)

    try {
      const payload = {
        toEmail: to,
        host: smtpForm.host,
        port: smtpForm.port,
        secure: smtpForm.secure,
        user: smtpForm.user,
        pass: smtpForm.pass,
        fromName: smtpForm.fromName,
        fromEmail: smtpForm.fromEmail,
      }

      const res = await fetch("/api/admin/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setSmtpFeedback({
          type: "error",
          text: data?.error || "Falha no envio do teste de SMTP.",
          details: data?.code ? `Código de erro: ${data.code}` : undefined,
        })
      } else {
        setSmtpFeedback({
          type: "success",
          text: `E-mail de teste enviado com sucesso para ${to}! Verifique sua caixa de entrada ou spam.`,
          details: data?.details?.response,
        })
      }
    } catch {
      setSmtpFeedback({ type: "error", text: "Erro ao executar teste de envio SMTP." })
    } finally {
      setTestingSmtp(false)
    }
  }

  // Salvar Telegram
  const handleSaveTelegram = async (e: FormEvent) => {
    e.preventDefault()
    setSavingTelegram(true)
    setTelegramFeedback(null)

    try {
      const payload = {
        telegram: {
          botToken: telegramForm.botToken.trim(),
          chatIdFilial: telegramForm.chatIdFilial.trim(),
          chatIdMatriz: telegramForm.chatIdMatriz.trim(),
          autoSend: telegramForm.autoSend,
        },
      }

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setTelegramFeedback({ type: "error", text: data?.error || "Erro ao salvar Telegram." })
      } else {
        setTelegramFeedback({ type: "success", text: "Configurações do Telegram salvas com sucesso!" })
        await loadStats()
      }
    } catch {
      setTelegramFeedback({ type: "error", text: "Erro ao comunicar com o servidor." })
    } finally {
      setSavingTelegram(false)
    }
  }

  // Testar Telegram
  const handleTestTelegram = async () => {
    setTestingTelegram(true)
    setTelegramFeedback(null)
    try {
      const res = await fetch("/api/admin/test-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: telegramForm.botToken,
          chatId: telegramForm.chatIdFilial || telegramForm.chatIdMatriz,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setTelegramFeedback({ type: "error", text: data?.error || "Falha no envio de teste do Telegram." })
      } else {
        setTelegramFeedback({ type: "success", text: "Mensagem de teste entregue no Telegram com sucesso!" })
      }
    } catch {
      setTelegramFeedback({ type: "error", text: "Erro de conexão com o Telegram." })
    } finally {
      setTestingTelegram(false)
    }
  }

  // Salvar SMB
  const handleSaveSmb = async (e: FormEvent) => {
    e.preventDefault()
    setSavingSmb(true)
    setSmbFeedback(null)

    try {
      const payload = {
        smb: {
          enabled: smbForm.enabled,
          sharePath: smbForm.sharePath.trim(),
          username: smbForm.username.trim(),
          domain: smbForm.domain.trim(),
          saveEstoquePdf: smbForm.saveEstoquePdf,
          savePerdasPdf: smbForm.savePerdasPdf,
        },
      }

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setSmbFeedback({ type: "error", text: data?.error || "Erro ao salvar configurações de rede SMB." })
      } else {
        setSmbFeedback({ type: "success", text: "Configurações de compartilhamento SMB salvas com sucesso!" })
        await loadStats()
      }
    } catch {
      setSmbFeedback({ type: "error", text: "Erro ao comunicar com o servidor." })
    } finally {
      setSavingSmb(false)
    }
  }

  // Exportar dados em JSON
  const handleExportData = async (type: "users" | "catalog" | "perdas") => {
    try {
      let endpoint = ""
      let filename = ""
      if (type === "users") {
        endpoint = "/api/users"
        filename = `backup_usuarios_${Date.now()}.json`
      } else if (type === "catalog") {
        endpoint = "/api/estoque-itens"
        filename = `backup_catalogo_hortifruti_${Date.now()}.json`
      } else {
        endpoint = "/api/perdas"
        filename = `backup_ocorrencias_perdas_${Date.now()}.json`
      }

      const res = await fetch(endpoint)
      const data = await res.json()
      const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2))
      const downloadAnchor = document.createElement("a")
      downloadAnchor.setAttribute("href", jsonStr)
      downloadAnchor.setAttribute("download", filename)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
    } catch {
      alert("Erro ao realizar exportação.")
    }
  }

  // ==========================================
  // Telas de Loading, Login Inline e Acesso Negado
  // (Seguindo o design da tela de login do sistema)
  // ==========================================
  if (authChecking) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center p-4"
        style={{
          backgroundImage: "linear-gradient(rgba(10, 18, 12, 0.45), rgba(10, 18, 12, 0.58)), url('/images/login-bg.jpg')",
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundAttachment: "fixed",
        }}
      >
        <div
          className="rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(26, 42, 108, 0.12)",
            boxShadow: "0 22px 48px rgba(0, 0, 0, 0.42)",
          }}
        >
          <img
            src="/images/maia-logo.jpg"
            alt="Maia Hortifrutigranjeiros"
            className="w-14 h-14 rounded-full mx-auto mb-3 object-cover shadow-md"
            style={{ border: "2px solid #5c4632" }}
          />
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: "#1a2a6c" }} />
          <h2 className="font-bold text-lg" style={{ color: "#1a2a6c" }}>Carregando Painel Admin</h2>
          <p className="text-slate-500 text-xs mt-1">Validando credenciais administrativas...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center p-4"
        style={{
          backgroundImage: "linear-gradient(rgba(10, 18, 12, 0.45), rgba(10, 18, 12, 0.58)), url('/images/login-bg.jpg')",
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundAttachment: "fixed",
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        }}
      >
        <div
          className="rounded-2xl p-7 sm:p-8 max-w-md w-full shadow-2xl flex flex-col gap-3"
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(26, 42, 108, 0.12)",
            boxShadow: "0 22px 48px rgba(0, 0, 0, 0.42)",
          }}
        >
          <div className="text-center mb-1">
            <img
              src="/images/maia-logo.jpg"
              alt="Maia Hortifrutigranjeiros"
              className="w-16 h-16 rounded-full mx-auto mb-2 object-cover shadow-md"
              style={{ border: "2px solid #5c4632" }}
            />
            <div
              className="font-bold text-xl uppercase tracking-wider"
              style={{ color: "#1a2a6c" }}
            >
              Área Administrativa
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Maia Hortifrutigranjeiros — Acesso restrito
            </p>
          </div>

          <form onSubmit={handleInlineLogin} className="flex flex-col gap-3 mt-1">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#1a2a6c" }}>
                Usuário / Matrícula
              </label>
              <input
                required
                type="text"
                value={loginForm.usuario}
                onChange={(e) => setLoginForm({ ...loginForm, usuario: e.target.value })}
                placeholder="Ex: admin ou higor"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none transition-all"
                style={{
                  background: "#f9fbff",
                  border: "1px solid #ccd3e5",
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#1a2a6c" }}>
                Senha de Acesso
              </label>
              <input
                required
                type="password"
                value={loginForm.senha}
                onChange={(e) => setLoginForm({ ...loginForm, senha: e.target.value })}
                placeholder="••••••••"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none transition-all"
                style={{
                  background: "#f9fbff",
                  border: "1px solid #ccd3e5",
                }}
              />
            </div>

            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-1 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #1a2a6c, #2b48a0)",
              }}
            >
              {isLoggingIn ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              <span>{isLoggingIn ? "Autenticando..." : "Entrar como Administrador"}</span>
            </button>
          </form>

          <div className="mt-3 text-center pt-3 border-t border-slate-200">
            <Link
              href="/"
              className="text-xs font-bold inline-flex items-center gap-1.5 transition-colors hover:underline"
              style={{ color: "#1a2a6c" }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Sistema de Hortifruti</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (isAccessDenied) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center p-4"
        style={{
          backgroundImage: "linear-gradient(rgba(10, 18, 12, 0.45), rgba(10, 18, 12, 0.58)), url('/images/login-bg.jpg')",
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundAttachment: "fixed",
        }}
      >
        <div
          className="rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(220, 53, 69, 0.25)",
            boxShadow: "0 22px 48px rgba(0, 0, 0, 0.42)",
          }}
        >
          <div className="inline-flex p-3 bg-rose-50 text-rose-600 rounded-full mb-3 border border-rose-200">
            <XCircle className="w-10 h-10" />
          </div>
          <h2 className="font-bold text-xl text-rose-700">Acesso Restrito</h2>
          <p className="text-slate-600 text-sm mt-2 leading-relaxed">
            Seu usuário atual (<strong>@{currentUser.usuario}</strong>) possui perfil de <em>Operador</em>. Apenas administradores do sistema têm permissão para acessar as configurações gerais.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/"
              className="py-2.5 px-4 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md transition-all inline-block"
              style={{ background: "linear-gradient(135deg, #1a2a6c, #2b48a0)" }}
            >
              Voltar ao Início
            </Link>
            <button
              onClick={handleLogout}
              className="py-2 text-rose-600 hover:text-rose-800 text-xs font-semibold"
            >
              Desconectar e entrar com outra conta
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // Layout Principal da Área Administrativa
  // (Integrado ao design oficial do sistema Maia)
  // ==========================================
  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundImage: "linear-gradient(rgba(10, 18, 12, 0.35), rgba(10, 18, 12, 0.48)), url('/images/login-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        padding: "20px 12px",
        boxSizing: "border-box",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      <div
        className="w-full max-w-6xl mx-auto rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-5"
        style={{
          background: "rgba(255, 255, 255, 0.96)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(26, 42, 108, 0.12)",
          boxShadow: "0 20px 45px rgba(0, 0, 0, 0.35)",
        }}
      >
        {/* Banner de Topo com Logo Maia */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "14px",
            flexWrap: "wrap",
            padding: "16px 20px",
            borderRadius: "16px",
            backgroundImage:
              "linear-gradient(135deg, rgba(15, 23, 42, 0.90) 0%, rgba(26, 42, 108, 0.82) 100%), url('/images/estoque-bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            boxShadow: "0 10px 24px rgba(0, 0, 0, 0.18)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <img
              src="/images/maia-logo.jpg"
              alt="Maia Hortifrutigranjeiros"
              style={{
                width: "58px",
                height: "58px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid #f5f0e1",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            />
            <div>
              <div
                style={{
                  fontSize: "19px",
                  fontWeight: 800,
                  color: "#ffffff",
                  letterSpacing: "0.02em",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <span>⚙️ Painel Administrativo — Maia Hortifrutigranjeiros</span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    background: "rgba(253, 187, 45, 0.2)",
                    color: "#fdbb2d",
                    border: "1px solid rgba(253, 187, 45, 0.4)",
                  }}
                >
                  Admin Center
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#e2e8f0", marginTop: "2px" }}>
                Gestão Geral: Usuários, Módulo SMTP de E-mails, Telegram, Rede SMB e Backups
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                padding: "6px 12px",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  background: "#fdbb2d",
                  color: "#1a2a6c",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                {currentUser?.nome ? currentUser.nome.charAt(0) : "A"}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#ffffff", lineHeight: 1.2 }}>
                  {currentUser?.nome || currentUser?.usuario}
                </div>
                <div style={{ fontSize: "10px", color: "#fdbb2d", textTransform: "uppercase", fontWeight: 600 }}>
                  Admin ({currentUser?.unidade})
                </div>
              </div>
            </div>

            <Link
              href="/gerenciador-estoque"
              style={{
                background: "rgba(255, 255, 255, 0.95)",
                color: "#1a2a6c",
                border: "1px solid #cbd5e1",
                padding: "8px 12px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Estoque</span>
            </Link>

            <Link
              href="/"
              style={{
                background: "rgba(255, 255, 255, 0.95)",
                color: "#1a2a6c",
                border: "1px solid #cbd5e1",
                padding: "8px 12px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Triagem & Perdas</span>
            </Link>

            <Link
              href="/termos"
              style={{
                background: "rgba(255, 255, 255, 0.95)",
                color: "#475569",
                border: "1px solid #cbd5e1",
                padding: "8px 12px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
              }}
            >
              📄 Termos
            </Link>

            <button
              onClick={handleLogout}
              style={{
                background: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "10px",
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(220, 53, 69, 0.3)",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                marginTop: 0,
                width: "auto",
              }}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Abas de Navegação (Design integrado de abas) */}
        <div className="bg-slate-100/90 border border-slate-200/90 rounded-2xl p-1.5 flex items-center gap-1.5 overflow-x-auto shadow-inner">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              activeTab === "overview"
                ? "text-white shadow-md"
                : "text-slate-600 hover:text-[#1a2a6c] hover:bg-white/80"
            }`}
            style={{
              background: activeTab === "overview" ? "linear-gradient(135deg, #1a2a6c, #2b48a0)" : "transparent",
            }}
          >
            <Sparkles className="w-4 h-4" />
            <span>Visão Geral</span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              activeTab === "users"
                ? "text-white shadow-md"
                : "text-slate-600 hover:text-[#1a2a6c] hover:bg-white/80"
            }`}
            style={{
              background: activeTab === "users" ? "linear-gradient(135deg, #1a2a6c, #2b48a0)" : "transparent",
            }}
          >
            <Users className="w-4 h-4" />
            <span>Usuários & Permissões</span>
            <span
              className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "users" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("smtp")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              activeTab === "smtp"
                ? "text-white shadow-md"
                : "text-slate-600 hover:text-[#1a2a6c] hover:bg-white/80"
            }`}
            style={{
              background: activeTab === "smtp" ? "linear-gradient(135deg, #1a2a6c, #2b48a0)" : "transparent",
            }}
          >
            <Mail className="w-4 h-4" />
            <span>Módulo SMTP (E-mail)</span>
            {services?.smtp.enabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("telegram")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              activeTab === "telegram"
                ? "text-white shadow-md"
                : "text-slate-600 hover:text-[#1a2a6c] hover:bg-white/80"
            }`}
            style={{
              background: activeTab === "telegram" ? "linear-gradient(135deg, #1a2a6c, #2b48a0)" : "transparent",
            }}
          >
            <Send className="w-4 h-4" />
            <span>Telegram Bot</span>
          </button>

          <button
            onClick={() => setActiveTab("smb")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              activeTab === "smb"
                ? "text-white shadow-md"
                : "text-slate-600 hover:text-[#1a2a6c] hover:bg-white/80"
            }`}
            style={{
              background: activeTab === "smb" ? "linear-gradient(135deg, #1a2a6c, #2b48a0)" : "transparent",
            }}
          >
            <Network className="w-4 h-4" />
            <span>Rede & SMB (SMBT)</span>
          </button>

          <button
            onClick={() => setActiveTab("backup")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              activeTab === "backup"
                ? "text-white shadow-md"
                : "text-slate-600 hover:text-[#1a2a6c] hover:bg-white/80"
            }`}
            style={{
              background: activeTab === "backup" ? "linear-gradient(135deg, #1a2a6c, #2b48a0)" : "transparent",
            }}
          >
            <Download className="w-4 h-4" />
            <span>Backup & Exportação</span>
          </button>
        </div>

        {/* ===================================== */}
        {/* TAB 1: VISÃO GERAL */}
        {/* ===================================== */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Cards de Métricas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Usuários</div>
                <div className="text-3xl font-black mt-2" style={{ color: "#1a2a6c" }}>
                  {loadingStats ? "..." : stats.usersCount}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Operadores e administradores</p>
                <Users className="w-12 h-12 text-[#1a2a6c]/10 absolute -right-2 -bottom-2 pointer-events-none" />
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Catálogo Ativo</div>
                <div className="text-3xl font-black text-emerald-700 mt-2">
                  {loadingStats ? "..." : stats.itemsCount}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Produtos hortigranjeiros</p>
                <Layers className="w-12 h-12 text-emerald-500/10 absolute -right-2 -bottom-2 pointer-events-none" />
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Contagens</div>
                <div className="text-3xl font-black text-blue-700 mt-2">
                  {loadingStats ? "..." : stats.countsCount}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Inventários registrados</p>
                <Database className="w-12 h-12 text-blue-500/10 absolute -right-2 -bottom-2 pointer-events-none" />
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Ocorrências Perdas</div>
                <div className="text-3xl font-black text-amber-700 mt-2">
                  {loadingStats ? "..." : stats.perdasCount}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Puxada, armazém e quebras</p>
                <AlertTriangle className="w-12 h-12 text-amber-500/10 absolute -right-2 -bottom-2 pointer-events-none" />
              </div>
            </div>

            {/* Status das Integrações */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "#1a2a6c" }}>
                    <Server className="w-4 h-4 text-[#1a2a6c]" />
                    <span>Status das Integrações e Serviços</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Visão do backend em tempo real</p>
                </div>
                <button
                  type="button"
                  onClick={loadStats}
                  style={{
                    width: "auto",
                    marginTop: 0,
                    background: "#f1f5f9",
                    color: "#1a2a6c",
                    border: "1px solid #cbd5e1",
                    cursor: "pointer",
                  }}
                  className="px-3 py-1.5 hover:bg-slate-200 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? "animate-spin" : ""}`} />
                  <span>Atualizar</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Banco de Dados */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">Banco de Dados</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Ativo
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-800 truncate">{services?.database.type}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {services?.database.cloudConnected ? "Supabase PostgreSQL Conectado" : "Modo Local com sincronização"}
                  </div>
                </div>

                {/* SMTP */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">Servidor SMTP</span>
                    {services?.smtp.enabled ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Habilitado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md">
                        Desativado
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-slate-800 truncate">{services?.smtp.host}</div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("smtp")}
                    style={{
                      width: "auto",
                      marginTop: "6px",
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      color: "#1a2a6c",
                      textAlign: "left",
                    }}
                    className="text-xs font-bold hover:underline block"
                  >
                    Configurar SMTP & Testar →
                  </button>
                </div>

                {/* Telegram */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">Telegram Bot</span>
                    {services?.telegram.botTokenSet ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Configurado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        Pendente
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    {services?.telegram.botTokenSet ? "Token Definido" : "Token Não Informado"}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("telegram")}
                    style={{
                      width: "auto",
                      marginTop: "6px",
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      color: "#1a2a6c",
                      textAlign: "left",
                    }}
                    className="text-xs font-bold hover:underline block"
                  >
                    Gerenciar Bot →
                  </button>
                </div>

                {/* SMB */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">Rede / SMB (SMBT)</span>
                    {services?.smb.enabled ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md">
                        Inativo
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-slate-800 truncate" title={services?.smb.sharePath}>
                    {services?.smb.sharePath || "Não definido"}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("smb")}
                    style={{
                      width: "auto",
                      marginTop: "6px",
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      color: "#1a2a6c",
                      textAlign: "left",
                    }}
                    className="text-xs font-bold hover:underline block"
                  >
                    Ajustar Compartilhamento →
                  </button>
                </div>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={openNewUserModal}
                className="cursor-pointer bg-gradient-to-br from-indigo-50/60 to-white border border-indigo-100 hover:border-[#1a2a6c]/50 rounded-2xl p-5 transition-all shadow-sm hover:shadow-md group"
              >
                <div className="p-2.5 bg-[#1a2a6c]/10 text-[#1a2a6c] rounded-xl w-fit group-hover:scale-110 transition-transform">
                  <Plus className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm mt-3" style={{ color: "#1a2a6c" }}>Cadastrar Novo Usuário</h4>
                <p className="text-xs text-slate-500 mt-1">Crie operadores ou administradores para a filial ou matriz.</p>
              </div>

              <div
                onClick={() => setActiveTab("smtp")}
                className="cursor-pointer bg-gradient-to-br from-emerald-50/60 to-white border border-emerald-100 hover:border-emerald-600/50 rounded-2xl p-5 transition-all shadow-sm hover:shadow-md group"
              >
                <div className="p-2.5 bg-emerald-600/10 text-emerald-700 rounded-xl w-fit group-hover:scale-110 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm mt-3 text-emerald-800">Configurar Envio SMTP</h4>
                <p className="text-xs text-slate-500 mt-1">Defina servidor de e-mail e dispare um teste para validar a entrega.</p>
              </div>

              <div
                onClick={() => handleExportData("catalog")}
                className="cursor-pointer bg-gradient-to-br from-blue-50/60 to-white border border-blue-100 hover:border-blue-600/50 rounded-2xl p-5 transition-all shadow-sm hover:shadow-md group"
              >
                <div className="p-2.5 bg-blue-600/10 text-blue-700 rounded-xl w-fit group-hover:scale-110 transition-transform">
                  <Download className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm mt-3 text-blue-800">Exportar Catálogo Hortifruti</h4>
                <p className="text-xs text-slate-500 mt-1">Baixe uma cópia JSON de todos os itens cadastrados no sistema.</p>
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 2: USUÁRIOS & PERMISSÕES */}
        {/* ===================================== */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    placeholder="Buscar por nome, usuário ou e-mail..."
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-[#1a2a6c] focus:ring-2 focus:ring-[#1a2a6c]/20"
                  />
                </div>

                <select
                  value={filterRole}
                  onChange={(e: any) => setFilterRole(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1a2a6c]"
                >
                  <option value="all">Todos os Cargos</option>
                  <option value="admin">Apenas Administradores</option>
                  <option value="operator">Apenas Operadores</option>
                </select>

                <select
                  value={filterUnidade}
                  onChange={(e: any) => setFilterUnidade(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1a2a6c]"
                >
                  <option value="all">Todas as Unidades</option>
                  <option value="filial">Filial</option>
                  <option value="matriz">Matriz</option>
                </select>
              </div>

              <button
                onClick={openNewUserModal}
                className="py-2.5 px-4 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all whitespace-nowrap"
                style={{ background: "linear-gradient(135deg, #1a2a6c, #2b48a0)" }}
              >
                <Plus className="w-4 h-4" />
                <span>Novo Usuário</span>
              </button>
            </div>

            {/* Tabela de Usuários */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                      <th className="py-3 px-4">Usuário</th>
                      <th className="py-3 px-4">Nome & Contato</th>
                      <th className="py-3 px-4">Unidade</th>
                      <th className="py-3 px-4">Perfil</th>
                      <th className="py-3 px-4">Catálogo</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1a2a6c]" />
                          <span>Carregando usuários do sistema...</span>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          Nenhum usuário encontrado com os filtros atuais.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isSelf = currentUser?.usuario?.toLowerCase() === u.usuario.toLowerCase()
                        return (
                          <tr key={u.usuario} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold" style={{ color: "#1a2a6c" }}>
                              @{u.usuario}
                              {isSelf && (
                                <span className="ml-2 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                                  Você
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-800">{u.nome}</div>
                              <div className="text-slate-500 text-[11px]">{u.email || "Sem e-mail"}</div>
                            </td>
                            <td className="py-3 px-4 uppercase text-[11px] font-bold text-slate-700">
                              {u.unidade === "matriz" ? "🏢 Matriz" : "🏬 Filial"}
                            </td>
                            <td className="py-3 px-4">
                              {u.role === "admin" ? (
                                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[10px]">
                                  ADMINISTRADOR
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[10px] border border-slate-200">
                                  Operador
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {u.can_register ? (
                                <span className="text-emerald-700 font-semibold">Pode editar</span>
                              ) : (
                                <span className="text-slate-400">Apenas contagem</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEditUserModal(u)}
                                  title="Editar dados"
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-200"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setTargetResetUser(u)
                                    setNewPassword("")
                                    setPasswordModalOpen(true)
                                  }}
                                  title="Redefinir senha"
                                  className="p-1.5 bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-700 rounded-lg transition-colors border border-slate-200"
                                >
                                  <Key className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  disabled={isSelf}
                                  onClick={() => {
                                    setTargetDeleteUser(u)
                                    setDeleteModalOpen(true)
                                  }}
                                  title={isSelf ? "Você não pode excluir seu próprio usuário" : "Excluir usuário"}
                                  className={`p-1.5 rounded-lg transition-colors border ${
                                    isSelf
                                      ? "opacity-30 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200"
                                      : "bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 3: MÓDULO SMTP (E-MAIL) */}
        {/* ===================================== */}
        {activeTab === "smtp" && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-50 text-[#1a2a6c] rounded-xl border border-indigo-100">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold" style={{ color: "#1a2a6c" }}>
                        Módulo de Configuração SMTP (E-mail)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Configure o servidor para envio de relatórios diários de estoque e notificações de perdas
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-700">Ativar Módulo SMTP:</span>
                  <input
                    type="checkbox"
                    id="smtpEnabled"
                    checked={smtpForm.enabled}
                    onChange={(e) => setSmtpForm({ ...smtpForm, enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-[#1a2a6c] border-slate-300 focus:ring-[#1a2a6c] cursor-pointer"
                  />
                  <label htmlFor="smtpEnabled" className="text-xs font-bold text-emerald-700 cursor-pointer">
                    {smtpForm.enabled ? "SIM (ATIVO)" : "NÃO (DESATIVADO)"}
                  </label>
                </div>
              </div>

              {/* Seletor Rápido de Provedor */}
              <div className="my-5 p-4 bg-slate-50/80 border border-slate-200 rounded-xl">
                <span className="text-xs font-bold text-slate-600 block mb-2">
                  Preenchimento Rápido com Provedor Conhecido:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applySmtpPreset("gmail")}
                    className={`px-3 py-1.5 border text-xs font-bold rounded-lg transition-all ${
                      smtpForm.host.toLowerCase().includes("gmail")
                        ? "bg-red-50 border-red-300 text-red-700 ring-1 ring-red-400"
                        : "bg-white hover:bg-slate-100 border-slate-300 text-slate-700"
                    }`}
                  >
                    ✉️ Gmail (smtp.gmail.com:587)
                  </button>
                  <button
                    type="button"
                    onClick={() => applySmtpPreset("outlook")}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 rounded-lg transition-all"
                  >
                    💼 Office 365 / Outlook (587)
                  </button>
                  <button
                    type="button"
                    onClick={() => applySmtpPreset("mailersend")}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 rounded-lg transition-all"
                  >
                    🚀 MailerSend
                  </button>
                  <button
                    type="button"
                    onClick={() => applySmtpPreset("sendgrid")}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 rounded-lg transition-all"
                  >
                    ⚡ SendGrid
                  </button>
                </div>
              </div>

              {/* Guia de Configuração do Gmail */}
              {smtpForm.host.toLowerCase().includes("gmail") && (
                <div className="my-5 p-4 bg-red-50/70 border border-red-200 rounded-xl text-xs space-y-2.5 text-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-red-700 text-sm">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Guia de Conexão com o Gmail</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-mono text-[10px] font-bold border border-red-200">
                      smtp.gmail.com : 587
                    </span>
                  </div>
                  <p className="leading-relaxed">
                    O Google exige uma <strong>Senha de Aplicativo (16 caracteres)</strong> gerada na sua Conta Google. Sua senha normal de login não funciona no SMTP.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                    <div className="p-3 bg-white rounded-lg border border-red-200 shadow-sm">
                      <span className="font-bold text-red-700 block mb-1">1. Verificação em 2 etapas</span>
                      <span className="text-[11px] text-slate-600">Ative na sua Conta Google em Segurança caso ainda não esteja ativa.</span>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-red-200 shadow-sm">
                      <span className="font-bold text-red-700 block mb-1">2. Gerar Senha de App</span>
                      <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1a2a6c] hover:underline font-bold inline-flex items-center gap-1 text-[11px]"
                      >
                        <span>myaccount.google.com/apppasswords</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-red-200 shadow-sm">
                      <span className="font-bold text-red-700 block mb-1">3. Cole a Senha Gerada</span>
                      <span className="text-[11px] text-slate-600">Copie as 16 letras geradas e cole no campo de senha abaixo (espaços são removidos automaticamente).</span>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveSmtp} className="space-y-6">
                {/* Dados do Servidor */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#1a2a6c" }}>
                    1. Dados de Conexão com o Servidor
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Host / Servidor SMTP *
                      </label>
                      <input
                        required
                        type="text"
                        value={smtpForm.host}
                        onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                        placeholder="Ex: smtp.gmail.com ou mail.suaempresa.com.br"
                        className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 text-xs focus:bg-white focus:outline-none focus:border-[#1a2a6c] focus:ring-2 focus:ring-[#1a2a6c]/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Porta *
                      </label>
                      <input
                        required
                        type="number"
                        value={smtpForm.port}
                        onChange={(e) => setSmtpForm({ ...smtpForm, port: Number(e.target.value) })}
                        placeholder="587 ou 465"
                        className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 text-xs focus:bg-white focus:outline-none focus:border-[#1a2a6c] focus:ring-2 focus:ring-[#1a2a6c]/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Criptografia
                      </label>
                      <select
                        value={smtpForm.secure ? "ssl" : "tls"}
                        onChange={(e) => setSmtpForm({ ...smtpForm, secure: e.target.value === "ssl" })}
                        className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 text-xs focus:bg-white focus:outline-none focus:border-[#1a2a6c]"
                      >
                        <option value="tls">STARTTLS (Recomendado para porta 587)</option>
                        <option value="ssl">SSL / TLS Direto (Porta 465)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Usuário / E-mail do Provedor
                      </label>
                      <input
                        type="text"
                        value={smtpForm.user}
                        onChange={(e) => {
                          const val = e.target.value
                          setSmtpForm((prev) => ({
                            ...prev,
                            user: val,
                            fromEmail: prev.fromEmail ? prev.fromEmail : (val.includes("@") ? val : prev.fromEmail),
                          }))
                        }}
                        placeholder="seu-email@gmail.com"
                        className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 text-xs focus:bg-white focus:outline-none focus:border-[#1a2a6c] focus:ring-2 focus:ring-[#1a2a6c]/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Senha de Aplicativo (16 letras)
                      </label>
                      <div className="relative">
                        <input
                          type={showSmtpPassword ? "text" : "password"}
                          value={smtpForm.pass}
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(/\s+/g, "")
                            setSmtpForm({ ...smtpForm, pass: cleaned })
                          }}
                          placeholder={smtpForm.pass ? "•••••••• (gravada)" : "ex: abcd efgh ijkl mnop"}
                          className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl pl-3.5 pr-10 py-2 text-xs focus:bg-white focus:outline-none focus:border-[#1a2a6c] focus:ring-2 focus:ring-[#1a2a6c]/20 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        >
                          {showSmtpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Remetente e Destinatários */}
                <div className="pt-2 border-t border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#1a2a6c" }}>
                    2. Identificação de Remetente & Regras de Destino
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nome de Exibição do Remetente
                      </label>
                      <input
                        type="text"
                        value={smtpForm.fromName}
                        onChange={(e) => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
                        placeholder="Ex: Triagem Filial - Maia Distribuidora"
                        className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 text-xs focus:bg-white focus:outline-none focus:border-[#1a2a6c] focus:ring-2 focus:ring-[#1a2a6c]/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        E-mail Remetente (From address)
                      </label>
                      <input
                        type="email"
                        value={smtpForm.fromEmail}
                        onChange={(e) => setSmtpForm({ ...smtpForm, fromEmail: e.target.value })}
                        placeholder="Ex: relatorios@maiadistribuidora.com"
                        className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 text-xs focus:bg-white focus:outline-none focus:border-[#1a2a6c] focus:ring-2 focus:ring-[#1a2a6c]/20"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Destinatários do Relatório de Estoque (Filial)
                      </label>
                      <input
                        type="text"
                        value={smtpForm.recipientsEstoqueFilial}
                        onChange={(e) => setSmtpForm({ ...smtpForm, recipientsEstoqueFilial: e.target.value })}
                        placeholder="Separe múltiplos e-mails por vírgula (ex: gerente@loja.com, estoque@loja.com)"
                        className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 text-xs focus:bg-white focus:outline-none focus:border-[#1a2a6c] focus:ring-2 focus:ring-[#1a2a6c]/20"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Destinatários do Relatório de Estoque (Matriz)
                      </label>
                      <input
                        type="text"
                        value={smtpForm.recipientsEstoqueMatriz}
                        onChange={(e) => setSmtpForm({ ...smtpForm, recipientsEstoqueMatriz: e.target.value })}
                        placeholder="Separe múltiplos e-mails por vírgula (ex: matriz@empresa.com, diretoria@empresa.com)"
                        className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 text-xs focus:bg-white focus:outline-none focus:border-[#1a2a6c] focus:ring-2 focus:ring-[#1a2a6c]/20"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Destinatários de Alertas de Perdas & Avarias
                      </label>
                      <input
                        type="text"
                        value={smtpForm.recipientsPerdas}
                        onChange={(e) => setSmtpForm({ ...smtpForm, recipientsPerdas: e.target.value })}
                        placeholder="Separe múltiplos e-mails por vírgula (ex: auditoria@empresa.com)"
                        className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 text-xs focus:bg-white focus:outline-none focus:border-[#1a2a6c] focus:ring-2 focus:ring-[#1a2a6c]/20"
                      />
                    </div>
                  </div>
                </div>

                {smtpFeedback && (
                  <div
                    className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 ${
                      smtpFeedback.type === "success"
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                        : "bg-rose-50 border-rose-300 text-rose-800"
                    }`}
                  >
                    {smtpFeedback.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    )}
                    <div>
                      <div className="font-bold">{smtpFeedback.text}</div>
                      {smtpFeedback.details && (
                        <div className="text-[11px] opacity-80 mt-1 font-mono">{smtpFeedback.details}</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="submit"
                    disabled={savingSmtp}
                    className="py-2.5 px-6 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #1a2a6c, #2b48a0)" }}
                  >
                    {savingSmtp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Settings className="w-3.5 h-3.5" />}
                    <span>{savingSmtp ? "Salvando..." : "Salvar Configurações de SMTP"}</span>
                  </button>
                </div>
              </form>

              {/* Ferramenta de Teste Imediato */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>3. Diagnóstico e Teste de Envio Imediato</span>
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  Envie um e-mail de teste estilizado com os parâmetros preenchidos acima para validar o servidor antes de colocá-lo em produção.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 max-w-xl">
                  <input
                    type="email"
                    value={testEmailRecipient}
                    onChange={(e) => setTestEmailRecipient(e.target.value)}
                    placeholder="Digite seu e-mail para receber o teste..."
                    className="flex-1 bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 text-xs focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                  />
                  <button
                    type="button"
                    disabled={testingSmtp}
                    onClick={handleTestSmtp}
                    className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
                  >
                    {testingSmtp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{testingSmtp ? "Enviando Teste..." : "Disparar E-mail de Teste"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 4: TELEGRAM BOT */}
        {/* ===================================== */}
        {activeTab === "telegram" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: "#1a2a6c" }}>
                  Configuração do Telegram Bot
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Despacho automático de PDFs e relatórios de estoque diretamente nos grupos de comunicação
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveTelegram} className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Telegram Bot Token (da API do @BotFather)
                </label>
                <input
                  type="text"
                  value={telegramForm.botToken}
                  onChange={(e) => setTelegramForm({ ...telegramForm, botToken: e.target.value })}
                  placeholder="Ex: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Chat ID (Filial)
                  </label>
                  <input
                    type="text"
                    value={telegramForm.chatIdFilial}
                    onChange={(e) => setTelegramForm({ ...telegramForm, chatIdFilial: e.target.value })}
                    placeholder="Ex: -100123456789"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Chat ID (Matriz)
                  </label>
                  <input
                    type="text"
                    value={telegramForm.chatIdMatriz}
                    onChange={(e) => setTelegramForm({ ...telegramForm, chatIdMatriz: e.target.value })}
                    placeholder="Ex: -100987654321"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
              </div>

              {telegramFeedback && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                    telegramFeedback.type === "success"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                      : "bg-rose-50 border-rose-300 text-rose-800"
                  }`}
                >
                  {telegramFeedback.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                  <span>{telegramFeedback.text}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-3">
                <button
                  type="submit"
                  disabled={savingTelegram}
                  className="py-2.5 px-5 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #1a2a6c, #2b48a0)" }}
                >
                  {savingTelegram ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Settings className="w-3.5 h-3.5" />}
                  <span>Salvar Configuração Telegram</span>
                </button>

                <button
                  type="button"
                  disabled={testingTelegram}
                  onClick={handleTestTelegram}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {testingTelegram ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Enviar Mensagem de Teste</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 5: REDE & SMB (SMBT) */}
        {/* ===================================== */}
        {activeTab === "smb" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                <Network className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: "#1a2a6c" }}>
                  Compartilhamento de Rede / SMB (SMBT)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Exportação e arquivamento de cópias de segurança em pasta de rede Windows / SAMBA
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSmb} className="space-y-4 max-w-2xl">
              <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="smbEnabled"
                  checked={smbForm.enabled}
                  onChange={(e) => setSmbForm({ ...smbForm, enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="smbEnabled" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Ativar arquivamento em compartilhamento de rede local (SMB / Windows Share)
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Caminho UNC da Pasta Compartilhada
                </label>
                <input
                  type="text"
                  value={smbForm.sharePath}
                  onChange={(e) => setSmbForm({ ...smbForm, sharePath: e.target.value })}
                  placeholder="Ex: \\192.168.1.10\hortifruti\relatorios ou \\SERVIDOR\Compartilhado"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Usuário de Rede (opcional)
                  </label>
                  <input
                    type="text"
                    value={smbForm.username}
                    onChange={(e) => setSmbForm({ ...smbForm, username: e.target.value })}
                    placeholder="Ex: operador_hortifruti"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 text-xs focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Domínio / Workgroup (opcional)
                  </label>
                  <input
                    type="text"
                    value={smbForm.domain}
                    onChange={(e) => setSmbForm({ ...smbForm, domain: e.target.value })}
                    placeholder="Ex: WORKGROUP ou MAIA"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 text-xs focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                  />
                </div>
              </div>

              {smbFeedback && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                    smbFeedback.type === "success"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                      : "bg-rose-50 border-rose-300 text-rose-800"
                  }`}
                >
                  {smbFeedback.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                  <span>{smbFeedback.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={savingSmb}
                className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {savingSmb ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Settings className="w-3.5 h-3.5" />}
                <span>Salvar Configuração SMB</span>
              </button>
            </form>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 6: BACKUP & EXPORTAÇÃO */}
        {/* ===================================== */}
        {activeTab === "backup" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200">
              <div className="p-2 bg-indigo-50 text-[#1a2a6c] rounded-xl border border-indigo-100">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: "#1a2a6c" }}>
                  Backup e Exportação de Dados
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Extração pontual de dados do sistema para segurança e auditoria
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                <div>
                  <h4 className="font-bold text-sm mb-1" style={{ color: "#1a2a6c" }}>Catálogo de Produtos</h4>
                  <p className="text-xs text-slate-500 mb-4">Exporta todos os produtos, descrições, taras e fatores de pallet.</p>
                </div>
                <button
                  onClick={() => handleExportData("catalog")}
                  className="w-full py-2 bg-white hover:bg-slate-100 text-[#1a2a6c] text-xs font-bold rounded-lg border border-slate-300 shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar JSON</span>
                </button>
              </div>

              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                <div>
                  <h4 className="font-bold text-sm mb-1" style={{ color: "#1a2a6c" }}>Histórico de Ocorrências</h4>
                  <p className="text-xs text-slate-500 mb-4">Exporta perdas, motivos de puxada, passagem, armazém e pesagens.</p>
                </div>
                <button
                  onClick={() => handleExportData("perdas")}
                  className="w-full py-2 bg-white hover:bg-slate-100 text-[#1a2a6c] text-xs font-bold rounded-lg border border-slate-300 shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar JSON</span>
                </button>
              </div>

              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                <div>
                  <h4 className="font-bold text-sm mb-1" style={{ color: "#1a2a6c" }}>Lista de Usuários</h4>
                  <p className="text-xs text-slate-500 mb-4">Exporta registros cadastrados e suas permissões de acesso.</p>
                </div>
                <button
                  onClick={() => handleExportData("users")}
                  className="w-full py-2 bg-white hover:bg-slate-100 text-[#1a2a6c] text-xs font-bold rounded-lg border border-slate-300 shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar JSON</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===================================== */}
      {/* MODAIS (NOVO USUÁRIO, RESET, EXCLUSÃO) */}
      {/* ===================================== */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "#1a2a6c" }}>
                <Users className="w-4 h-4 text-[#1a2a6c]" />
                <span>{isEditingUser ? `Editar Usuário @${userForm.usuario}` : "Novo Usuário"}</span>
              </h3>
              <button
                onClick={() => setUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Usuário / Login *
                </label>
                <input
                  required
                  disabled={isEditingUser}
                  type="text"
                  value={userForm.usuario}
                  onChange={(e) => setUserForm({ ...userForm, usuario: e.target.value.toLowerCase().trim() })}
                  placeholder="Ex: joao.silva ou 10425"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 focus:bg-white focus:outline-none focus:border-[#1a2a6c] focus:ring-2 focus:ring-[#1a2a6c]/20 disabled:opacity-50 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  required
                  type="text"
                  value={userForm.nome}
                  onChange={(e) => setUserForm({ ...userForm, nome: e.target.value })}
                  placeholder="Ex: João da Silva"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 focus:bg-white focus:outline-none focus:border-[#1a2a6c] focus:ring-2 focus:ring-[#1a2a6c]/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  E-mail *
                </label>
                <input
                  required
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="Ex: joao@maiadistribuidora.com"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 focus:bg-white focus:outline-none focus:border-[#1a2a6c] focus:ring-2 focus:ring-[#1a2a6c]/20"
                />
              </div>

              {!isEditingUser && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Senha Inicial (mínimo 6 caracteres) *
                  </label>
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={userForm.senha}
                    onChange={(e) => setUserForm({ ...userForm, senha: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 focus:bg-white focus:outline-none focus:border-[#1a2a6c] focus:ring-2 focus:ring-[#1a2a6c]/20 font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unidade</label>
                  <select
                    value={userForm.unidade}
                    onChange={(e: any) => setUserForm({ ...userForm, unidade: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 focus:bg-white focus:outline-none focus:border-[#1a2a6c]"
                  >
                    <option value="filial">Filial</option>
                    <option value="matriz">Matriz</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Perfil de Acesso</label>
                  <select
                    value={userForm.role}
                    onChange={(e: any) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 focus:bg-white focus:outline-none focus:border-[#1a2a6c]"
                  >
                    <option value="operator">Operador</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="canRegModal"
                  checked={userForm.canRegister}
                  onChange={(e) => setUserForm({ ...userForm, canRegister: e.target.checked })}
                  className="w-4 h-4 rounded text-[#1a2a6c] border-slate-300 focus:ring-[#1a2a6c]"
                />
                <label htmlFor="canRegModal" className="text-slate-700 font-medium cursor-pointer">
                  Permitir cadastrar e editar catálogo de produtos
                </label>
              </div>

              {userActionMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    userActionMsg.type === "success"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                      : "bg-rose-50 border-rose-300 text-rose-800"
                  }`}
                >
                  {userActionMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                  <span>{userActionMsg.text}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="py-2 px-5 rounded-xl text-white font-bold transition-all shadow-md flex items-center gap-1.5"
                  style={{ background: "linear-gradient(135deg, #1a2a6c, #2b48a0)" }}
                >
                  {savingUser ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{savingUser ? "Salvando..." : isEditingUser ? "Salvar Alterações" : "Criar Usuário"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET DE SENHA */}
      {passwordModalOpen && targetResetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "#1a2a6c" }}>
                <Key className="w-4 h-4 text-amber-500" />
                <span>Redefinir Senha</span>
              </h3>
              <button onClick={() => setPasswordModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold text-sm">✕</button>
            </div>

            <p className="text-xs text-slate-600">
              Definir nova senha para o usuário <strong>@{targetResetUser.usuario}</strong> ({targetResetUser.nome}):
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Nova Senha</label>
                <input
                  required
                  minLength={6}
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova senha (mínimo 6 caracteres)"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 font-mono focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <button
                type="button"
                onClick={generateRandomPassword}
                className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition-colors border border-slate-200"
              >
                ⚡ Gerar Senha Segura Aleatória
              </button>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="py-1.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-md"
                >
                  {resettingPassword ? "Salvando..." : "Salvar Nova Senha"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO */}
      {deleteModalOpen && targetDeleteUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-800">Excluir Usuário</h3>
                <p className="text-xs text-slate-500">Esta ação não pode ser desfeita</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza de que deseja remover o usuário <strong>@{targetDeleteUser.usuario}</strong> ({targetDeleteUser.nome}) do sistema?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingUser}
                onClick={handleDeleteUser}
                className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md"
              >
                {deletingUser ? "Excluindo..." : "Sim, Excluir Usuário"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
