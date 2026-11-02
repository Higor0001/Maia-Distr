"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"

interface Product {
  reduzido: string
  descricao: string
  tipoUnidade?: string
  taraKg?: number
}

interface EquipmentTara {
  id: string
  nome: string
  taraKg: number
  ativo: boolean
}

interface ConferenciaRecord {
  id: string
  produtoReduzido?: string
  produtoNome: string
  responsavel: string
  pesoBruto: number
  tipoCarrinhoId?: string
  tipoCarrinhoNome?: string
  taraCarrinhoKg: number
  tipoCaixaId?: string
  tipoCaixaNome?: string
  quantidadeCaixas?: number
  taraCaixaKg: number
  pesoLiquido: number
  observacao?: string
  fotoUrl?: string
  createdAt: string
}

interface ConferenciaItemTemp {
  id: string
  produtoReduzido?: string
  produtoNome: string
  pesoBruto: number
  tipoCarrinhoId?: string
  tipoCarrinhoNome?: string
  taraCarrinhoKg: number
  tipoCaixaId?: string
  tipoCaixaNome?: string
  quantidadeCaixas: number
  taraCaixaKg: number
  pesoLiquido: number
}

export default function SimplesConferenciaPage() {
  const [loggedUser, setLoggedUser] = useState<{
    usuario: string
    nome?: string
    unidade?: string
    role?: string
  } | null>(null)
  const [connectionStatus, setConnectionStatus] = useState("online")

  const [modulos, setModulos] = useState({
    moduloEstoqueAtivo: false,
    moduloPerdasAtivo: true,
    moduloConferenciaAtivo: true,
    moduloSeparacaoAtivo: false,
    moduloExcelAtivo: false,
  })

  // Catálogos e Cadastros
  const [catalog, setCatalog] = useState<Product[]>([])
  const [carrinhos, setCarrinhos] = useState<EquipmentTara[]>([])
  const [caixas, setCaixas] = useState<EquipmentTara[]>([])
  const [conferencias, setConferencias] = useState<ConferenciaRecord[]>([])

  // Lista de Itens adicionados para gravação (como no Perdas)
  const [currentItems, setCurrentItems] = useState<ConferenciaItemTemp[]>([])

  // Formulário de Entrada da Balança
  const [currentScreen, setCurrentScreen] = useState<"balanca" | "relatorio" | "taras">("balanca")
  const [productInput, setProductInput] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [pesoBrutoInput, setPesoBrutoInput] = useState("")
  const [selectedCarrinhoId, setSelectedCarrinhoId] = useState<string>("")
  const [selectedCaixaId, setSelectedCaixaId] = useState<string>("")
  const [quantidadeCaixasInput, setQuantidadeCaixasInput] = useState<string>("1")
  const [observacao, setObservacao] = useState("")
  const [photoPreview, setPhotoPreview] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  // Filtros de Relatório
  const [filtroTexto, setFiltroTexto] = useState("")
  const [filtroData, setFiltroData] = useState("")

  // Gerenciamento de Taras (Admin)
  const [novoCarrinhoNome, setNovoCarrinhoNome] = useState("")
  const [novoCarrinhoTara, setNovoCarrinhoTara] = useState("")
  const [novaCaixaNome, setNovaCaixaNome] = useState("")
  const [novaCaixaTara, setNovaCaixaTara] = useState("")

  // Câmera / Arquivo
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraActive, setCameraActive] = useState(false)

  // 1. Status de Conexão, Sessão e Módulos
  useEffect(() => {
    const handleOnline = () => setConnectionStatus("online")
    const handleOffline = () => setConnectionStatus("offline")
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    fetch("/api/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data?.user) {
          setLoggedUser(data.user)
        }
      })
      .catch(() => {})

    fetch("/api/modulos")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.modulos) {
          setModulos((prev) => ({ ...prev, ...data.modulos }))
        }
      })
      .catch(() => {})

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // 2. Carregar Dados do Banco
  const carregarDados = async () => {
    try {
      const resItens = await fetch("/api/estoque-itens")
      if (resItens.ok) {
        const itensData = await resItens.json()
        const itemsList = Array.isArray(itensData?.items)
          ? itensData.items
          : Array.isArray(itensData?.itens)
          ? itensData.itens
          : Array.isArray(itensData)
          ? itensData
          : []
        setCatalog(itemsList)
      }

      const resCarrinhos = await fetch("/api/carrinhos-tara")
      if (resCarrinhos.ok) {
        const cData = await resCarrinhos.json()
        setCarrinhos(Array.isArray(cData?.carrinhos) ? cData.carrinhos : [])
      }

      const resCaixas = await fetch("/api/caixas-tara")
      if (resCaixas.ok) {
        const cxData = await resCaixas.json()
        setCaixas(Array.isArray(cxData?.caixas) ? cxData.caixas : [])
      }

      const resConf = await fetch("/api/simples-conferencia?limit=200")
      if (resConf.ok) {
        const confData = await resConf.json()
        setConferencias(Array.isArray(confData?.list) ? confData.list : [])
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Pesquisa de Produtos
  const handleProductInput = (value: string) => {
    setProductInput(value)
    setSelectedProduct(null)
    if (value.trim()) {
      const term = value.toLowerCase()
      const list = Array.isArray(catalog) ? catalog : []
      const filtered = list.filter(
        (p) =>
          p.descricao.toLowerCase().includes(term) ||
          p.reduzido.toString().includes(term)
      )
      setFilteredProducts(filtered.slice(0, 10))
    } else {
      setFilteredProducts([])
    }
  }

  const selectProductItem = (p: Product) => {
    setSelectedProduct(p)
    setProductInput(p.descricao)
    setFilteredProducts([])
  }

  // Cálculo de Tara e Peso Líquido com QUANTIDADE DE CAIXAS
  const selectedCarrinho = useMemo(
    () => (Array.isArray(carrinhos) ? carrinhos : []).find((c) => c.id === selectedCarrinhoId),
    [carrinhos, selectedCarrinhoId]
  )
  const selectedCaixa = useMemo(
    () => (Array.isArray(caixas) ? caixas : []).find((c) => c.id === selectedCaixaId),
    [caixas, selectedCaixaId]
  )

  const taraCarrinho = selectedCarrinho ? selectedCarrinho.taraKg : 0
  const taraCaixaUnitaria = selectedCaixa ? selectedCaixa.taraKg : 0
  const qtdCaixasNum = selectedCaixaId ? Math.max(1, parseInt(quantidadeCaixasInput, 10) || 1) : 0
  const taraCaixasTotal = Number((taraCaixaUnitaria * qtdCaixasNum).toFixed(3))
  const taraTotal = Number((taraCarrinho + taraCaixasTotal).toFixed(3))

  const pesoBrutoNum = parseFloat(pesoBrutoInput.replace(",", ".")) || 0
  const pesoLiquidoNum = Math.max(0, Number((pesoBrutoNum - taraTotal).toFixed(3)))

  // Totais da lista de itens acumulados
  const totalListaBruto = useMemo(
    () => currentItems.reduce((acc, it) => acc + (it.pesoBruto || 0), 0),
    [currentItems]
  )
  const totalListaLiquido = useMemo(
    () => currentItems.reduce((acc, it) => acc + (it.pesoLiquido || 0), 0),
    [currentItems]
  )

  // Câmera nativa
  const startCamera = async () => {
    try {
      setCameraActive(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error("Erro câmera:", err)
      alert("Não foi possível acessar a câmera. Use o upload de arquivo.")
      setCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8)
      setPhotoPreview(dataUrl)
    }
    stopCamera()
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" })
      window.location.href = "/"
    } catch {
      window.location.reload()
    }
  }

  // ➕ ADICIONAR ITEM À LISTA (Igual ao módulo de perdas)
  const handleAddItem = () => {
    if (!productInput.trim()) {
      setStatusMessage({ text: "Selecione ou digite o nome do produto.", type: "error" })
      return
    }
    if (pesoBrutoNum <= 0) {
      setStatusMessage({ text: "Informe um peso bruto válido maior que zero.", type: "error" })
      return
    }

    const newItem: ConferenciaItemTemp = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      produtoReduzido: selectedProduct?.reduzido || "",
      produtoNome: productInput.trim(),
      pesoBruto: pesoBrutoNum,
      tipoCarrinhoId: selectedCarrinho?.id || "",
      tipoCarrinhoNome: selectedCarrinho?.nome || "",
      taraCarrinhoKg: taraCarrinho,
      tipoCaixaId: selectedCaixa?.id || "",
      tipoCaixaNome: selectedCaixa?.nome || "",
      quantidadeCaixas: qtdCaixasNum,
      taraCaixaKg: taraCaixasTotal,
      pesoLiquido: pesoLiquidoNum,
    }

    setCurrentItems((prev) => [...prev, newItem])
    setStatusMessage({
      text: `✅ Item adicionado à lista: ${newItem.produtoNome} (${newItem.pesoLiquido.toFixed(2)} kg líquido)`,
      type: "success",
    })

    // Limpa produto e peso para permitir lançar o próximo item rapidamente mantendo carrinho se desejado
    setProductInput("")
    setSelectedProduct(null)
    setPesoBrutoInput("")
  }

  const handleRemoveItem = (id: string) => {
    setCurrentItems((prev) => prev.filter((it) => it.id !== id))
  }

  // SALVAR CONFERÊNCIA (Lote de Itens ou Item Individual)
  const handleSalvarConferencia = async () => {
    // Caso 1: Gravação em lote a partir da lista
    if (currentItems.length > 0) {
      setIsSaving(true)
      try {
        const res = await fetch("/api/simples-conferencia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: currentItems,
            responsavel: loggedUser?.nome || loggedUser?.usuario || "Operador Balança",
            observacao: observacao.trim(),
            fotoUrl: photoPreview || "",
          }),
        })

        const data = await res.json()
        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Erro ao gravar lista de conferência.")
        }

        setStatusMessage({
          text: `🎉 ${data.count || currentItems.length} item(ns) de conferência gravado(s) com sucesso! Total Líquido: ${totalListaLiquido.toFixed(2)} kg`,
          type: "success",
        })

        if (Array.isArray(data.items)) {
          setConferencias((prev) => [...data.items, ...(Array.isArray(prev) ? prev : [])])
        }

        setCurrentItems([])
        setProductInput("")
        setSelectedProduct(null)
        setPesoBrutoInput("")
        setObservacao("")
        setPhotoPreview("")
      } catch (err: any) {
        setStatusMessage({ text: err.message || "Falha ao gravar conferência.", type: "error" })
      } finally {
        setIsSaving(false)
      }
      return
    }

    // Caso 2: Gravação direta de item individual (sem ter clicado antes em Adicionar à Lista)
    if (!productInput.trim()) {
      setStatusMessage({ text: "Adicione itens à lista ou selecione um produto para gravar.", type: "error" })
      return
    }
    if (pesoBrutoNum <= 0) {
      setStatusMessage({ text: "Informe um peso bruto válido maior que zero.", type: "error" })
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        produtoReduzido: selectedProduct?.reduzido || "",
        produtoNome: productInput.trim(),
        responsavel: loggedUser?.nome || loggedUser?.usuario || "Operador Balança",
        pesoBruto: pesoBrutoNum,
        tipoCarrinhoId: selectedCarrinho?.id || "",
        tipoCarrinhoNome: selectedCarrinho?.nome || "",
        taraCarrinhoKg: taraCarrinho,
        tipoCaixaId: selectedCaixa?.id || "",
        tipoCaixaNome: selectedCaixa?.nome || "",
        quantidadeCaixas: qtdCaixasNum,
        taraCaixaKg: taraCaixasTotal,
        pesoLiquido: pesoLiquidoNum,
        observacao: observacao.trim(),
        fotoUrl: photoPreview || "",
      }

      const res = await fetch("/api/simples-conferencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Erro ao registrar simples conferência.")
      }

      const infoCaixa = qtdCaixasNum > 0 ? ` (${qtdCaixasNum} cx)` : ""
      setStatusMessage({
        text: `Conferência registrada com sucesso: ${pesoBrutoNum.toFixed(2)} kg → ${pesoLiquidoNum.toFixed(2)} kg${infoCaixa}`,
        type: "success",
      })

      setConferencias((prev) => [data.item, ...(Array.isArray(prev) ? prev : [])])

      setProductInput("")
      setSelectedProduct(null)
      setPesoBrutoInput("")
      setObservacao("")
      setPhotoPreview("")
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Falha ao registrar pesagem.", type: "error" })
    } finally {
      setIsSaving(false)
    }
  }

  // Adicionar Carrinho (Admin)
  const handleCriarCarrinho = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoCarrinhoNome || !novoCarrinhoTara) return
    try {
      const res = await fetch("/api/carrinhos-tara", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novoCarrinhoNome,
          taraKg: parseFloat(novoCarrinhoTara.replace(",", ".")),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setCarrinhos(Array.isArray(data.carrinhos) ? data.carrinhos : [])
        setNovoCarrinhoNome("")
        setNovoCarrinhoTara("")
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Adicionar Caixa (Admin)
  const handleCriarCaixa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaCaixaNome || !novaCaixaTara) return
    try {
      const res = await fetch("/api/caixas-tara", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novaCaixaNome,
          taraKg: parseFloat(novaCaixaTara.replace(",", ".")),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setCaixas(Array.isArray(data.caixas) ? data.caixas : [])
        setNovaCaixaNome("")
        setNovaCaixaTara("")
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Relatório filtrado
  const relatorioFiltrado = useMemo(() => {
    const list = Array.isArray(conferencias) ? conferencias : []
    return list.filter((c) => {
      const matchTexto =
        !filtroTexto ||
        c?.produtoNome?.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        c?.responsavel?.toLowerCase().includes(filtroTexto.toLowerCase())
      const matchData = !filtroData || c?.createdAt?.startsWith(filtroData)
      return matchTexto && matchData
    })
  }, [conferencias, filtroTexto, filtroData])

  // Exportar CSV
  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Produto",
      "Responsável",
      "Peso Bruto (kg)",
      "Carrinho",
      "Tara Carrinho (kg)",
      "Caixa",
      "Qtd Caixas",
      "Tara Caixas Total (kg)",
      "Peso Líquido (kg)",
      "Data e Hora",
    ]
    const rows = relatorioFiltrado.map((c) => [
      c.id,
      `"${(c.produtoNome || "").replace(/"/g, '""')}"`,
      `"${(c.responsavel || "").replace(/"/g, '""')}"`,
      (c.pesoBruto || 0).toFixed(3),
      `"${c.tipoCarrinhoNome || "Nenhum"}"`,
      (c.taraCarrinhoKg || 0).toFixed(3),
      `"${c.tipoCaixaNome || "Nenhuma"}"`,
      c.quantidadeCaixas || 1,
      (c.taraCaixaKg || 0).toFixed(3),
      (c.pesoLiquido || 0).toFixed(3),
      new Date(c.createdAt).toLocaleString("pt-BR"),
    ])
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `simples_conferencia_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="marca-foto-container">
      <div className="container">
        {/* CABEÇALHO IDÊNTICO AO CONTROLE DE PERDAS */}
        <header>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "12px",
              marginBottom: "6px",
            }}
          >
            <img
              src="/images/maia-logo.jpg"
              alt="Maia Hortifrutigranjeiros"
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid #5c4632",
                boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
              }}
            />
            <h1 style={{ margin: 0, color: "#1a2a6c" }}>Simples Conferência — Hortigranjeiros</h1>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "10px",
              marginTop: "6px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "14px", color: "#666" }}>
              {connectionStatus === "online" ? "🟢 Online" : "🔴 Offline"}
            </span>

            {loggedUser && (
              <span style={{ fontSize: "13px", color: "#1a2a6c", fontWeight: 700 }}>
                👤 {loggedUser.nome || loggedUser.usuario} ({loggedUser.unidade?.toUpperCase() || "FILIAL"})
              </span>
            )}

            {loggedUser?.role === "admin" && (
              <Link
                href="/admin"
                style={{
                  color: "#ffffff",
                  background: "#1a2a6c",
                  fontWeight: 700,
                  fontSize: "12px",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  boxShadow: "0 2px 6px rgba(26,42,108,0.2)",
                }}
              >
                ⚙️ Painel Admin
              </Link>
            )}

            <Link
              href="/"
              style={{
                color: "#ffffff",
                background: "#b21f1f",
                fontWeight: 700,
                fontSize: "12px",
                padding: "5px 12px",
                borderRadius: "6px",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: "0 2px 6px rgba(178,31,31,0.2)",
              }}
            >
              ⚠️ Controle de Perdas
            </Link>

            {(modulos.moduloEstoqueAtivo || loggedUser?.role === "admin") && (
              <Link
                href="/gerenciador-estoque"
                style={{
                  color: "#ffffff",
                  background: "#4b5563",
                  fontWeight: 700,
                  fontSize: "12px",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  boxShadow: "0 2px 6px rgba(75,85,99,0.2)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                📦 Gerenciador de Estoque
              </Link>
            )}

            {(modulos.moduloSeparacaoAtivo || loggedUser?.role === "admin") && (
              <Link
                href="/separacao"
                style={{
                  color: "#ffffff",
                  background: "#d97706",
                  fontWeight: 700,
                  fontSize: "12px",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  boxShadow: "0 2px 6px rgba(217,119,6,0.2)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                📋 Separação de Pedidos
              </Link>
            )}

            {(modulos.moduloExcelAtivo || loggedUser?.role === "admin") && (
              <Link
                href="/precos"
                style={{
                  color: "#ffffff",
                  background: "#2563eb",
                  fontWeight: 700,
                  fontSize: "12px",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  boxShadow: "0 2px 6px rgba(37,99,235,0.2)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                📊 Atualização de Preços
              </Link>
            )}

            <Link
              href="/termos"
              style={{
                color: "#1a2a6c",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                fontWeight: 700,
                fontSize: "12px",
                padding: "5px 10px",
                borderRadius: "6px",
                textDecoration: "none",
              }}
            >
              📄 Termos
            </Link>

            {loggedUser && (
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  marginTop: 0,
                  width: "auto",
                }}
              >
                🚪 Sair
              </button>
            )}
          </div>
        </header>

        {/* NAVEGAÇÃO SUPERIOR DE ABAS (PADRÃO VISUAL DE PERDAS) */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <button
            type="button"
            onClick={() => setCurrentScreen("balanca")}
            style={{
              flex: 1,
              background:
                currentScreen === "balanca"
                  ? "linear-gradient(to right, #1a2a6c, #b21f1f)"
                  : "#e9ecef",
              color: currentScreen === "balanca" ? "white" : "#1a2a6c",
              fontWeight: "bold",
              padding: "12px",
              borderRadius: "10px",
              border: currentScreen === "balanca" ? "none" : "1px solid #cbd5e1",
              cursor: "pointer",
              marginTop: 0,
            }}
          >
            ⚖️ Balança Operacional
          </button>

          <button
            type="button"
            onClick={() => setCurrentScreen("relatorio")}
            style={{
              flex: 1,
              background:
                currentScreen === "relatorio"
                  ? "linear-gradient(to right, #1a2a6c, #b21f1f)"
                  : "#e9ecef",
              color: currentScreen === "relatorio" ? "white" : "#1a2a6c",
              fontWeight: "bold",
              padding: "12px",
              borderRadius: "10px",
              border: currentScreen === "relatorio" ? "none" : "1px solid #cbd5e1",
              cursor: "pointer",
              marginTop: 0,
            }}
          >
            📜 Relatório de Conferências ({conferencias.length})
          </button>

          {loggedUser?.role === "admin" && (
            <button
              type="button"
              onClick={() => setCurrentScreen("taras")}
              style={{
                flex: 1,
                background:
                  currentScreen === "taras"
                    ? "linear-gradient(to right, #1a2a6c, #b21f1f)"
                    : "#e9ecef",
                color: currentScreen === "taras" ? "white" : "#1a2a6c",
                fontWeight: "bold",
                padding: "12px",
                borderRadius: "10px",
                border: currentScreen === "taras" ? "none" : "1px solid #cbd5e1",
                cursor: "pointer",
                marginTop: 0,
              }}
            >
              ⚙️ Cadastrar Taras
            </button>
          )}
        </div>

        {/* MENSAGEM DE STATUS */}
        {statusMessage && (
          <div className={`status ${statusMessage.type}`} style={{ display: "block" }}>
            {statusMessage.text}
          </div>
        )}

        {/* ========================================================= */}
        {/* TELA 1: BALANÇA OPERACIONAL (Cálculo Bruto -> Líquido)    */}
        {/* ========================================================= */}
        {currentScreen === "balanca" && (
          <>
            {/* Bloco 1: Selecionar Produto */}
            <div
              style={{
                marginBottom: "20px",
                padding: "15px",
                background: "rgba(26, 42, 108, 0.05)",
                borderRadius: "10px",
              }}
            >
              <label style={{ color: "#1a2a6c", marginTop: 0 }}>🧾 Selecionar Produto (Hortigranjeiros):</label>
              <div style={{ position: "relative", marginTop: "10px" }}>
                <input
                  type="text"
                  placeholder="Digite o nome ou código do produto (ex: Tomate, Laranja, Batata)..."
                  value={productInput}
                  onChange={(e) => handleProductInput(e.target.value)}
                  style={{ marginBottom: "0" }}
                />

                {filteredProducts.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: "0",
                      right: "0",
                      background: "white",
                      border: "1px solid #ccc",
                      borderRadius: "8px",
                      maxHeight: "200px",
                      overflowY: "auto",
                      zIndex: 1000,
                      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    }}
                  >
                    {filteredProducts.map((product) => (
                      <div
                        key={product.reduzido}
                        onClick={() => selectProductItem(product)}
                        style={{
                          padding: "10px",
                          cursor: "pointer",
                          borderBottom: "1px solid #eee",
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "14px",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f0f0")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                      >
                        <span style={{ fontWeight: 600 }}>{product.descricao}</span>
                        <span style={{ color: "#666", fontSize: "12px" }}>Cód: {product.reduzido}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bloco 2: Peso Bruto na Balança */}
            <div
              style={{
                marginBottom: "20px",
                padding: "15px",
                background: "rgba(26, 42, 108, 0.05)",
                borderRadius: "10px",
              }}
            >
              <label style={{ color: "#1a2a6c", marginTop: 0 }}>⚖️ Peso Bruto Registrado na Balança (kg):</label>
              <div style={{ display: "flex", gap: "10px", marginTop: "10px", alignItems: "center" }}>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 38.00 ou 15.5"
                  value={pesoBrutoInput}
                  onChange={(e) => setPesoBrutoInput(e.target.value)}
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#1a2a6c",
                    flex: 1,
                    marginBottom: 0,
                  }}
                />
              </div>

              {/* Atalhos Rápidos de Peso */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
                {["10", "15", "20", "25", "30", "38", "50", "100"].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setPesoBrutoInput(quick)}
                    style={{
                      width: "auto",
                      background: "#e9ecef",
                      color: "#1a2a6c",
                      border: "1px solid #ccc",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      marginTop: 0,
                    }}
                  >
                    {quick} kg
                  </button>
                ))}
              </div>
            </div>

            {/* Bloco 3: Seleção de Carrinho Utilizado */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ margin: 0, color: "#1a2a6c" }}>🛒 Carrinho Utilizado (Desconto de Tara):</label>
                {selectedCarrinho && (
                  <span style={{ fontSize: "12px", fontWeight: "bold", color: "#1a2a6c" }}>
                    Desconto: -{selectedCarrinho.taraKg.toFixed(2)} kg
                  </span>
                )}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "10px",
                  marginTop: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedCarrinhoId("")}
                  style={{
                    background: selectedCarrinhoId === "" ? "#1a2a6c" : "#e9ecef",
                    color: selectedCarrinhoId === "" ? "white" : "#333",
                    border: selectedCarrinhoId === "" ? "2px solid #1a2a6c" : "2px solid transparent",
                    padding: "12px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    marginTop: 0,
                  }}
                >
                  Nenhum (0 kg)
                </button>
                {carrinhos.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCarrinhoId(c.id)}
                    style={{
                      background: selectedCarrinhoId === c.id ? "#1a2a6c" : "#e9ecef",
                      color: selectedCarrinhoId === c.id ? "white" : "#333",
                      border: selectedCarrinhoId === c.id ? "2px solid #1a2a6c" : "2px solid transparent",
                      padding: "12px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      marginTop: 0,
                    }}
                  >
                    {c.nome} ({c.taraKg.toFixed(1)} kg)
                  </button>
                ))}
              </div>
            </div>

            {/* Bloco 4: Seleção de Caixa Utilizada + QUANTIDADE DE CAIXAS */}
            <div
              style={{
                marginBottom: "20px",
                padding: "15px",
                background: "rgba(26, 42, 108, 0.05)",
                borderRadius: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ margin: 0, color: "#1a2a6c" }}>📦 Tipo de Caixa Utilizada:</label>
                {selectedCaixa && (
                  <span style={{ fontSize: "12px", fontWeight: "bold", color: "#b21f1f" }}>
                    Tara unitária: -{selectedCaixa.taraKg.toFixed(2)} kg
                  </span>
                )}
              </div>

              {/* Botões dos Tipos de Caixa */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "10px",
                  marginTop: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCaixaId("")
                    setQuantidadeCaixasInput("1")
                  }}
                  style={{
                    background: selectedCaixaId === "" ? "#1a2a6c" : "#e9ecef",
                    color: selectedCaixaId === "" ? "white" : "#333",
                    border: selectedCaixaId === "" ? "2px solid #1a2a6c" : "2px solid transparent",
                    padding: "12px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    marginTop: 0,
                  }}
                >
                  Nenhuma (0 kg)
                </button>
                {caixas.map((cx) => (
                  <button
                    key={cx.id}
                    type="button"
                    onClick={() => setSelectedCaixaId(cx.id)}
                    style={{
                      background: selectedCaixaId === cx.id ? "#1a2a6c" : "#e9ecef",
                      color: selectedCaixaId === cx.id ? "white" : "#333",
                      border: selectedCaixaId === cx.id ? "2px solid #1a2a6c" : "2px solid transparent",
                      padding: "12px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      marginTop: 0,
                    }}
                  >
                    {cx.nome} ({cx.taraKg.toFixed(1)} kg)
                  </button>
                ))}
              </div>

              {/* Campo para QUANTIDADE DE CAIXAS (quando houver caixa selecionada) */}
              {selectedCaixaId !== "" && (
                <div
                  style={{
                    marginTop: "15px",
                    padding: "12px",
                    background: "white",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                      flexWrap: "wrap",
                      gap: "6px",
                    }}
                  >
                    <label style={{ margin: 0, fontSize: "13px", fontWeight: "bold", color: "#1a2a6c" }}>
                      🔢 Quantidade de Caixas Descontadas:
                    </label>
                    <span style={{ fontSize: "13px", fontWeight: "bold", color: "#b21f1f" }}>
                      {qtdCaixasNum} cx × {taraCaixaUnitaria.toFixed(2)} kg = -{taraCaixasTotal.toFixed(2)} kg
                    </span>
                  </div>

                  {/* Stepper numérico */}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantidadeCaixasInput(
                          String(Math.max(1, (parseInt(quantidadeCaixasInput, 10) || 1) - 1))
                        )
                      }
                      style={{
                        width: "48px",
                        height: "44px",
                        background: "#e2e8f0",
                        color: "#1a2a6c",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        fontSize: "22px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        marginTop: 0,
                      }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={quantidadeCaixasInput}
                      onChange={(e) => setQuantidadeCaixasInput(e.target.value)}
                      style={{
                        flex: 1,
                        textAlign: "center",
                        fontSize: "20px",
                        fontWeight: "bold",
                        color: "#1a2a6c",
                        marginBottom: 0,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setQuantidadeCaixasInput(
                          String((parseInt(quantidadeCaixasInput, 10) || 0) + 1)
                        )
                      }
                      style={{
                        width: "48px",
                        height: "44px",
                        background: "#e2e8f0",
                        color: "#1a2a6c",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        fontSize: "22px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        marginTop: 0,
                      }}
                    >
                      +
                    </button>
                  </div>

                  {/* Atalhos rápidos de quantidade de caixas */}
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
                    {["1", "2", "3", "4", "5", "6", "8", "10", "12", "15", "20", "25", "30", "40", "50"].map(
                      (q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setQuantidadeCaixasInput(q)}
                          style={{
                            width: "auto",
                            background: quantidadeCaixasInput === q ? "#1a2a6c" : "#f1f5f9",
                            color: quantidadeCaixasInput === q ? "white" : "#1a2a6c",
                            border: "1px solid #cbd5e1",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            marginTop: 0,
                          }}
                        >
                          {q} cx
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* PAINEL INDICATIVO VISUAL: PESO BRUTO -> PESO LÍQUIDO (Fórmula e Seta) */}
            <div
              style={{
                marginBottom: "20px",
                padding: "20px",
                background: "linear-gradient(135deg, rgba(26, 42, 108, 0.95), rgba(43, 72, 160, 0.95))",
                borderRadius: "14px",
                color: "white",
                boxShadow: "0 6px 16px rgba(26, 42, 108, 0.25)",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  color: "#fdbb2d",
                  marginBottom: "8px",
                }}
              >
                Resultado da Pesagem Atual
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", color: "#cbd5e1" }}>Peso Bruto:</div>
                  <div style={{ fontSize: "28px", fontWeight: "black", fontFamily: "monospace" }}>
                    {pesoBrutoNum > 0 ? pesoBrutoNum.toFixed(2) : "0,00"} kg
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: "#fdbb2d",
                  }}
                >
                  →
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "12px", color: "#fdbb2d" }}>Peso Líquido:</div>
                  <div
                    style={{
                      fontSize: "34px",
                      fontWeight: "black",
                      fontFamily: "monospace",
                      color: "#fdbb2d",
                    }}
                  >
                    {pesoLiquidoNum > 0 ? pesoLiquidoNum.toFixed(2) : "0,00"} kg
                  </div>
                </div>
              </div>

              {/* Detalhamento das Taras */}
              <div
                style={{
                  marginTop: "12px",
                  paddingTop: "10px",
                  borderTop: "1px solid rgba(255,255,255,0.2)",
                  fontSize: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>🛒 Tara Carrinho:</span>
                  <span style={{ fontWeight: "bold", color: "#cbd5e1" }}>
                    {selectedCarrinho
                      ? `${selectedCarrinho.nome} (-${taraCarrinho.toFixed(2)} kg)`
                      : "Nenhum (0,00 kg)"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>📦 Tara Caixas ({qtdCaixasNum} cx):</span>
                  <span style={{ fontWeight: "bold", color: "#fdbb2d" }}>
                    {selectedCaixa
                      ? `${qtdCaixasNum}x ${selectedCaixa.nome} (-${taraCaixasTotal.toFixed(2)} kg)`
                      : "Nenhuma (0,00 kg)"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderTop: "1px dashed rgba(255,255,255,0.2)",
                    paddingTop: "4px",
                    marginTop: "4px",
                  }}
                >
                  <span style={{ fontWeight: "bold" }}>Total Desconto de Taras:</span>
                  <span style={{ fontWeight: "bold", color: "#fdbb2d", fontSize: "13px" }}>
                    -{taraTotal.toFixed(2)} kg
                  </span>
                </div>
              </div>
            </div>

            {/* BOTÃO ➕ ADICIONAR ITEM À LISTA (PADRÃO PERDAS) */}
            <div style={{ marginBottom: "20px" }}>
              <button
                type="button"
                onClick={handleAddItem}
                disabled={!productInput.trim() || pesoBrutoNum <= 0}
                style={{
                  background:
                    productInput.trim() && pesoBrutoNum > 0
                      ? "#28a745"
                      : "#6c757d",
                  color: "white",
                  padding: "14px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  borderRadius: "10px",
                  border: "none",
                  cursor: productInput.trim() && pesoBrutoNum > 0 ? "pointer" : "not-allowed",
                  boxShadow: "0 4px 10px rgba(40,167,69,0.25)",
                  marginTop: 0,
                  width: "100%",
                }}
              >
                ➕ Adicionar Item à Lista
              </button>
            </div>

            {/* LISTA DE ITENS ADICIONADOS (PADRÃO CONTROLE DE PERDAS) */}
            {currentItems.length > 0 && (
              <div
                style={{
                  marginBottom: "20px",
                  padding: "16px",
                  background: "rgba(26, 42, 108, 0.05)",
                  borderRadius: "12px",
                  border: "1px solid rgba(26, 42, 108, 0.15)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <h3 style={{ color: "#1a2a6c", margin: 0, fontSize: "16px", fontWeight: "bold" }}>
                    📋 Itens na Fila de Conferência ({currentItems.length}):
                  </h3>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <span
                      style={{
                        background: "#1a2a6c",
                        color: "white",
                        padding: "4px 10px",
                        borderRadius: "15px",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      Total Líquido: {totalListaLiquido.toFixed(2)} kg
                    </span>
                    <span
                      style={{
                        background: "#6c757d",
                        color: "white",
                        padding: "4px 10px",
                        borderRadius: "15px",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      Total Bruto: {totalListaBruto.toFixed(2)} kg
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {currentItems.map((it, idx) => (
                    <div
                      key={it.id}
                      style={{
                        background: "white",
                        padding: "12px",
                        borderRadius: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        border: "1px solid #cbd5e1",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
                        gap: "10px",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <strong style={{ color: "#1a2a6c", fontSize: "14px" }}>
                            #{idx + 1} {it.produtoNome}
                          </strong>
                          {it.produtoReduzido && (
                            <span style={{ fontSize: "11px", color: "#64748b" }}>(Cód: {it.produtoReduzido})</span>
                          )}
                        </div>
                        <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px" }}>
                          <span>Bruto: {it.pesoBruto.toFixed(2)} kg</span>
                          {it.tipoCarrinhoNome && (
                            <span> • {it.tipoCarrinhoNome} (-{it.taraCarrinhoKg.toFixed(2)}kg)</span>
                          )}
                          {it.tipoCaixaNome && (
                            <span> • {it.quantidadeCaixas}x {it.tipoCaixaNome} (-{it.taraCaixaKg.toFixed(2)}kg)</span>
                          )}
                          <span style={{ marginLeft: "8px", fontWeight: "bold", color: "#155724" }}>
                            ➡️ Líquido: {it.pesoLiquido.toFixed(2)} kg
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.id)}
                        style={{
                          background: "#dc3545",
                          color: "white",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "bold",
                          width: "auto",
                          marginTop: 0,
                          cursor: "pointer",
                          border: "none",
                        }}
                      >
                        🗑️ Remover
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: "10px", textAlign: "right" }}>
                  <button
                    type="button"
                    onClick={() => setCurrentItems([])}
                    style={{
                      background: "transparent",
                      color: "#dc3545",
                      border: "none",
                      fontSize: "12px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      textDecoration: "underline",
                      width: "auto",
                      padding: 0,
                      marginTop: 0,
                    }}
                  >
                    Limpar toda a lista
                  </button>
                </div>
              </div>
            )}

            {/* Evidência Fotográfica Opcional */}
            <div
              style={{
                marginBottom: "20px",
                padding: "15px",
                background: "rgba(26, 42, 108, 0.05)",
                borderRadius: "10px",
              }}
            >
              <label style={{ color: "#1a2a6c", marginTop: 0 }}>📷 Evidência Fotográfica (Opcional):</label>

              {!photoPreview ? (
                <>
                  <button
                    type="button"
                    onClick={startCamera}
                    style={{
                      background: "linear-gradient(to right, #1a2a6c, #b21f1f)",
                      marginTop: "10px",
                    }}
                  >
                    📷 Abrir Câmera
                  </button>

                  <div style={{ textAlign: "center", margin: "10px 0", color: "#666" }}>
                    <strong>OU</strong>
                  </div>

                  <label className="file-upload">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      hidden
                    />
                    📁 Selecionar da Galeria
                  </label>
                </>
              ) : (
                <>
                  <img
                    src={photoPreview}
                    alt="Evidência"
                    style={{
                      width: "100%",
                      borderRadius: "10px",
                      marginTop: "10px",
                      border: "2px solid #1a2a6c",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setPhotoPreview("")}
                    style={{ background: "#dc3545", marginTop: "10px" }}
                  >
                    ❌ Remover Foto
                  </button>
                </>
              )}

              {cameraActive && (
                <div style={{ marginTop: "15px", display: "flex", flexDirection: "column" }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{
                      width: "100%",
                      border: "2px solid #1a2a6c",
                      borderRadius: "8px",
                      marginBottom: "10px",
                    }}
                  />
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={capturePhoto}
                      style={{ flex: 1, background: "#28a745", marginTop: "0" }}
                    >
                      📸 Capturar Foto
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      style={{ flex: 1, background: "#dc3545", marginTop: "0" }}
                    >
                      ❌ Cancelar Câmera
                    </button>
                  </div>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} style={{ display: "none" }} />

            {/* Observações */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ color: "#1a2a6c" }}>📝 Observações:</label>
              <input
                type="text"
                placeholder="Ex: Produto conferido no descarregamento, lote A..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>

            {/* BOTÃO PRINCIPAL DE SALVAR CONFERÊNCIA */}
            <button
              type="button"
              disabled={isSaving || (currentItems.length === 0 && (!productInput.trim() || pesoBrutoNum <= 0))}
              onClick={handleSalvarConferencia}
              style={{
                background:
                  currentItems.length > 0 || (productInput.trim() && pesoBrutoNum > 0)
                    ? "linear-gradient(to right, #1a2a6c, #b21f1f)"
                    : "#6c757d",
                padding: "16px",
                fontSize: "16px",
                fontWeight: "bold",
                borderRadius: "10px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
              }}
            >
              {isSaving
                ? "⏳ Gravando Conferência..."
                : currentItems.length > 0
                ? `💾 Confirmar e Gravar Todos os Itens (${currentItems.length}) — ${totalListaLiquido.toFixed(2)} kg`
                : "💾 Confirmar e Salvar Conferência"}
            </button>
          </>
        )}

        {/* ========================================================= */}
        {/* TELA 2: RELATÓRIO DE SIMPLES CONFERÊNCIA                  */}
        {/* ========================================================= */}
        {currentScreen === "relatorio" && (
          <div style={{ marginTop: "10px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                marginBottom: "15px",
              }}
            >
              <h2 style={{ margin: 0, color: "#1a2a6c", fontSize: "18px" }}>
                Histórico de Simples Conferência
              </h2>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  style={{
                    background: "#198754",
                    color: "white",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    fontSize: "12px",
                    width: "auto",
                    marginTop: 0,
                  }}
                >
                  📊 Exportar CSV
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    background: "#1a2a6c",
                    color: "white",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    fontSize: "12px",
                    width: "auto",
                    marginTop: 0,
                  }}
                >
                  🖨️ Imprimir
                </button>
              </div>
            </div>

            {/* Barra de Filtros */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "15px",
                flexWrap: "wrap",
              }}
            >
              <input
                type="text"
                placeholder="Filtrar por produto ou responsável..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                style={{ flex: 2, minWidth: "200px", marginTop: 0 }}
              />
              <input
                type="date"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
                style={{ flex: 1, minWidth: "140px", marginTop: 0 }}
              />
            </div>

            {/* Tabela de Dados */}
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  background: "white",
                  borderRadius: "8px",
                  overflow: "hidden",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr style={{ background: "#1a2a6c", color: "white", textAlign: "left" }}>
                    <th style={{ padding: "12px" }}>Data e Hora</th>
                    <th style={{ padding: "12px" }}>Produto</th>
                    <th style={{ padding: "12px", textAlign: "center" }}>Bruto → Líquido</th>
                    <th style={{ padding: "12px" }}>Carrinho</th>
                    <th style={{ padding: "12px" }}>Caixa Utilizada</th>
                    <th style={{ padding: "12px" }}>Responsável</th>
                    <th style={{ padding: "12px" }}>Obs</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorioFiltrado.map((item, idx) => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid #eee",
                        background: idx % 2 === 0 ? "white" : "#fcfcfc",
                      }}
                    >
                      <td style={{ padding: "10px", color: "#666" }}>
                        {new Date(item.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td style={{ padding: "10px", fontWeight: "bold", color: "#1a2a6c" }}>
                        {item.produtoNome}
                      </td>
                      <td style={{ padding: "10px", textAlign: "center", whiteSpace: "nowrap" }}>
                        <span style={{ color: "#666" }}>{(item.pesoBruto || 0).toFixed(2)} kg</span>
                        <span style={{ margin: "0 6px", fontWeight: "bold", color: "#b21f1f" }}>
                          →
                        </span>
                        <span
                          style={{
                            fontWeight: "bold",
                            color: "#155724",
                            background: "#d4edda",
                            padding: "3px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          {(item.pesoLiquido || 0).toFixed(2)} kg
                        </span>
                      </td>
                      <td style={{ padding: "10px", color: "#555" }}>
                        {item.tipoCarrinhoNome || "—"}{" "}
                        {item.taraCarrinhoKg > 0 && `(-${item.taraCarrinhoKg.toFixed(1)}kg)`}
                      </td>
                      <td style={{ padding: "10px", color: "#555" }}>
                        {item.tipoCaixaNome ? (
                          <span>
                            {item.tipoCaixaNome}{" "}
                            <strong style={{ color: "#b21f1f" }}>
                              ({item.quantidadeCaixas || 1} cx / -{(item.taraCaixaKg || 0).toFixed(1)}kg)
                            </strong>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ padding: "10px", fontWeight: 600 }}>{item.responsavel}</td>
                      <td style={{ padding: "10px", color: "#777" }}>{item.observacao || "—"}</td>
                    </tr>
                  ))}
                  {relatorioFiltrado.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: "20px", textAlign: "center", color: "#999" }}>
                        Nenhum registro de conferência encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TELA 3: CADASTRO DE TARAS (ADMIN)                         */}
        {/* ========================================================= */}
        {currentScreen === "taras" && loggedUser?.role === "admin" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
              marginTop: "10px",
            }}
          >
            {/* Carrinhos */}
            <div
              style={{
                padding: "15px",
                background: "rgba(26, 42, 108, 0.05)",
                borderRadius: "10px",
              }}
            >
              <h3 style={{ margin: "0 0 10px 0", color: "#1a2a6c" }}>🛒 Modelos de Carrinho</h3>
              <form onSubmit={handleCriarCarrinho} style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="Nome (ex: Carrinho 4)"
                  value={novoCarrinhoNome}
                  onChange={(e) => setNovoCarrinhoNome(e.target.value)}
                  style={{ flex: 2, marginTop: 0 }}
                />
                <input
                  type="text"
                  placeholder="Tara kg"
                  value={novoCarrinhoTara}
                  onChange={(e) => setNovoCarrinhoTara(e.target.value)}
                  style={{ flex: 1, marginTop: 0 }}
                />
                <button
                  type="submit"
                  style={{
                    background: "#1a2a6c",
                    color: "white",
                    padding: "10px",
                    width: "auto",
                    marginTop: 0,
                  }}
                >
                  +
                </button>
              </form>

              <div style={{ marginTop: "10px" }}>
                {carrinhos.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px",
                      background: "white",
                      borderRadius: "6px",
                      marginBottom: "6px",
                      fontSize: "13px",
                    }}
                  >
                    <span>{c.nome}</span>
                    <strong style={{ color: "#1a2a6c" }}>{c.taraKg.toFixed(2)} kg</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Caixas */}
            <div
              style={{
                padding: "15px",
                background: "rgba(26, 42, 108, 0.05)",
                borderRadius: "10px",
              }}
            >
              <h3 style={{ margin: "0 0 10px 0", color: "#1a2a6c" }}>📦 Modelos de Caixa</h3>
              <form onSubmit={handleCriarCaixa} style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="Nome (ex: Caixa 3)"
                  value={novaCaixaNome}
                  onChange={(e) => setNovaCaixaNome(e.target.value)}
                  style={{ flex: 2, marginTop: 0 }}
                />
                <input
                  type="text"
                  placeholder="Tara kg"
                  value={novaCaixaTara}
                  onChange={(e) => setNovaCaixaTara(e.target.value)}
                  style={{ flex: 1, marginTop: 0 }}
                />
                <button
                  type="submit"
                  style={{
                    background: "#1a2a6c",
                    color: "white",
                    padding: "10px",
                    width: "auto",
                    marginTop: 0,
                  }}
                >
                  +
                </button>
              </form>

              <div style={{ marginTop: "10px" }}>
                {caixas.map((cx) => (
                  <div
                    key={cx.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px",
                      background: "white",
                      borderRadius: "6px",
                      marginBottom: "6px",
                      fontSize: "13px",
                    }}
                  >
                    <span>{cx.nome}</span>
                    <strong style={{ color: "#b21f1f" }}>{cx.taraKg.toFixed(2)} kg</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* NAVEGAÇÃO INFERIOR DINÂMICA (PADRÃO VISUAL DO SISTEMA)    */}
        {/* ========================================================= */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "25px" }}>
          {currentScreen !== "balanca" && (
            <button
              type="button"
              onClick={() => setCurrentScreen("balanca")}
              style={{ flex: 1, minWidth: "140px", background: "#1a2a6c", marginTop: 0 }}
            >
              ⚖️ Balança
            </button>
          )}

          {currentScreen !== "relatorio" && (
            <button
              type="button"
              onClick={() => setCurrentScreen("relatorio")}
              style={{ flex: 1, minWidth: "140px", background: "#17a2b8", marginTop: 0 }}
            >
              📜 Relatório ({conferencias.length})
            </button>
          )}

          {currentScreen !== "taras" && loggedUser?.role === "admin" && (
            <button
              type="button"
              onClick={() => setCurrentScreen("taras")}
              style={{ flex: 1, minWidth: "140px", background: "#6c757d", marginTop: 0 }}
            >
              ⚙️ Cadastrar Taras
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              window.location.href = "/"
            }}
            style={{ flex: 1, minWidth: "140px", background: "#b21f1f", marginTop: 0 }}
          >
            ⚠️ Controle de Perdas
          </button>

          {(modulos.moduloEstoqueAtivo || loggedUser?.role === "admin") && (
            <button
              type="button"
              onClick={() => {
                window.location.href = "/gerenciador-estoque"
              }}
              style={{ flex: 1, minWidth: "140px", background: "#4b5563", marginTop: 0 }}
            >
              📦 Estoque
            </button>
          )}

          {(modulos.moduloSeparacaoAtivo || loggedUser?.role === "admin") && (
            <button
              type="button"
              onClick={() => {
                window.location.href = "/separacao"
              }}
              style={{ flex: 1, minWidth: "140px", background: "#d97706", marginTop: 0 }}
            >
              📋 Separação
            </button>
          )}

          {(modulos.moduloExcelAtivo || loggedUser?.role === "admin") && (
            <button
              type="button"
              onClick={() => {
                window.location.href = "/precos"
              }}
              style={{ flex: 1, minWidth: "140px", background: "#2563eb", marginTop: 0 }}
            >
              📊 Preços
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
