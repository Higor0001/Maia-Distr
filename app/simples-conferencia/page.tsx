"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { NavHeader } from "@/components/layout/nav-header"
import {
  Scale,
  ArrowRight,
  ShoppingCart,
  Box,
  Camera,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Printer,
  Search,
  Plus,
  RefreshCw,
  Clock,
  UserCheck,
  AlertCircle,
  Eye,
  Sliders,
} from "lucide-react"

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
  taraCaixaKg: number
  pesoLiquido: number
  observacao?: string
  fotoUrl?: string
  createdAt: string
}

export default function SimplesConferenciaPage() {
  const [user, setUser] = useState<{
    usuario: string
    nome?: string
    unidade?: string
    role?: string
  } | null>(null)

  // Catálogos e Cadastros
  const [catalog, setCatalog] = useState<Product[]>([])
  const [carrinhos, setCarrinhos] = useState<EquipmentTara[]>([])
  const [caixas, setCaixas] = useState<EquipmentTara[]>([])
  const [conferencias, setConferencias] = useState<ConferenciaRecord[]>([])

  // Formulário de Conferência
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productSearch, setProductSearch] = useState("")
  const [showCatalogDropdown, setShowCatalogDropdown] = useState(false)
  const [pesoBrutoInput, setPesoBrutoInput] = useState("")
  const [selectedCarrinhoId, setSelectedCarrinhoId] = useState<string>("")
  const [selectedCaixaId, setSelectedCaixaId] = useState<string>("")
  const [observacao, setObservacao] = useState("")
  const [photoPreview, setPhotoPreview] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("")
  const [saveErrorMsg, setSaveErrorMsg] = useState("")

  // Filtros de Relatório
  const [activeTab, setActiveTab] = useState<"balanca" | "relatorio" | "taras">("balanca")
  const [filtroTexto, setFiltroTexto] = useState("")
  const [filtroData, setFiltroData] = useState("")

  // Gerenciamento de Taras (Admin)
  const [novoCarrinhoNome, setNovoCarrinhoNome] = useState("")
  const [novoCarrinhoTara, setNovoCarrinhoTara] = useState("")
  const [novaCaixaNome, setNovaCaixaNome] = useState("")
  const [novaCaixaTara, setNovaCaixaTara] = useState("")

  // Câmera
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 1. Carregar Sessão
  useEffect(() => {
    fetch("/api/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data?.user) {
          setUser(data.user)
        }
      })
      .catch(() => {})
  }, [])

  // 2. Carregar Dados Iniciais
  const carregarDados = async () => {
    try {
      // Produtos
      const resItens = await fetch("/api/estoque-itens")
      if (resItens.ok) {
        const itensData = await resItens.json()
        setCatalog(itensData.itens || itensData || [])
      }

      // Carrinhos
      const resCarrinhos = await fetch("/api/carrinhos-tara")
      if (resCarrinhos.ok) {
        const cData = await resCarrinhos.json()
        setCarrinhos(cData.carrinhos || [])
      }

      // Caixas
      const resCaixas = await fetch("/api/caixas-tara")
      if (resCaixas.ok) {
        const cxData = await resCaixas.json()
        setCaixas(cxData.caixas || [])
      }

      // Histórico
      const resConf = await fetch("/api/simples-conferencia?limit=200")
      if (resConf.ok) {
        const confData = await resConf.json()
        setConferencias(confData.list || [])
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Cálculo de Tara e Peso Líquido
  const selectedCarrinho = useMemo(
    () => carrinhos.find((c) => c.id === selectedCarrinhoId),
    [carrinhos, selectedCarrinhoId]
  )
  const selectedCaixa = useMemo(
    () => caixas.find((c) => c.id === selectedCaixaId),
    [caixas, selectedCaixaId]
  )

  const taraCarrinho = selectedCarrinho ? selectedCarrinho.taraKg : 0
  const taraCaixa = selectedCaixa ? selectedCaixa.taraKg : 0
  const taraTotal = Number((taraCarrinho + taraCaixa).toFixed(3))

  const pesoBrutoNum = parseFloat(pesoBrutoInput.replace(",", ".")) || 0
  const pesoLiquidoNum = Math.max(0, Number((pesoBrutoNum - taraTotal).toFixed(3)))

  // Filtro de produtos
  const filteredProducts = useMemo(() => {
    if (!productSearch) return catalog.slice(0, 15)
    const term = productSearch.toLowerCase()
    return catalog
      .filter(
        (p) =>
          p.descricao.toLowerCase().includes(term) ||
          p.reduzido.toString().includes(term)
      )
      .slice(0, 20)
  }, [catalog, productSearch])

  // Foto / Câmera
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Salvar Conferência
  const handleSalvarConferencia = async () => {
    setSaveErrorMsg("")
    setSaveSuccessMsg("")

    if (!selectedProduct && !productSearch.trim()) {
      setSaveErrorMsg("Selecione ou informe a descrição do produto.")
      return
    }
    if (pesoBrutoNum <= 0) {
      setSaveErrorMsg("Informe um peso bruto válido maior que zero.")
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        produtoReduzido: selectedProduct?.reduzido || "",
        produtoNome: selectedProduct?.descricao || productSearch.trim(),
        responsavel: user?.nome || user?.usuario || "Operador Balança",
        pesoBruto: pesoBrutoNum,
        tipoCarrinhoId: selectedCarrinho?.id || "",
        tipoCarrinhoNome: selectedCarrinho?.nome || "",
        taraCarrinhoKg: taraCarrinho,
        tipoCaixaId: selectedCaixa?.id || "",
        tipoCaixaNome: selectedCaixa?.nome || "",
        taraCaixaKg: taraCaixa,
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

      setSaveSuccessMsg(
        `Conferência registrada: ${pesoBrutoNum.toFixed(2)} kg → ${pesoLiquidoNum.toFixed(2)} kg`
      )
      setConferencias((prev) => [data.item, ...prev])

      // Limpar formulário para próxima pesagem rápida
      setPesoBrutoInput("")
      setObservacao("")
      setPhotoPreview("")
      // Mantém carrinho/caixa selecionados se operador estiver pesando lote contínuo
    } catch (err: any) {
      setSaveErrorMsg(err.message || "Falha ao registrar pesagem.")
    } finally {
      setIsSaving(false)
    }
  }

  // Cadastro de Novo Carrinho
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
        setCarrinhos(data.carrinhos)
        setNovoCarrinhoNome("")
        setNovoCarrinhoTara("")
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Cadastro de Nova Caixa
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
        setCaixas(data.caixas)
        setNovaCaixaNome("")
        setNovaCaixaTara("")
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Relatório filtrado
  const relatorioFiltrado = useMemo(() => {
    return conferencias.filter((c) => {
      const matchTexto =
        !filtroTexto ||
        c.produtoNome.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        c.responsavel.toLowerCase().includes(filtroTexto.toLowerCase())
      const matchData = !filtroData || c.createdAt.startsWith(filtroData)
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
      "Tara Caixa (kg)",
      "Peso Líquido (kg)",
      "Data e Hora",
    ]
    const rows = relatorioFiltrado.map((c) => [
      c.id,
      `"${c.produtoNome.replace(/"/g, '""')}"`,
      `"${c.responsavel.replace(/"/g, '""')}"`,
      c.pesoBruto.toFixed(3),
      `"${c.tipoCarrinhoNome || "Nenhum"}"`,
      c.taraCarrinhoKg.toFixed(3),
      `"${c.tipoCaixaNome || "Nenhuma"}"`,
      c.taraCaixaKg.toFixed(3),
      c.pesoLiquido.toFixed(3),
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <NavHeader user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
        {/* Top Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <Scale className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Simples Conferência & Pesagem
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Cálculo automático de tara (carrinho + caixa) sem movimentar estoque nem registrar perdas.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start sm:self-center">
            <button
              onClick={() => setActiveTab("balanca")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "balanca"
                  ? "bg-[#1a2a6c] text-white shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Scale className="w-4 h-4" />
              Balança Operacional
            </button>
            <button
              onClick={() => setActiveTab("relatorio")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "relatorio"
                  ? "bg-[#1a2a6c] text-white shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-4 h-4" />
              Relatório ({conferencias.length})
            </button>
            {user?.role === "admin" && (
              <button
                onClick={() => setActiveTab("taras")}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === "taras"
                    ? "bg-[#1a2a6c] text-white shadow"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sliders className="w-4 h-4" />
                Cadastrar Taras
              </button>
            )}
          </div>
        </div>

        {/* FEEDBACK MESSAGES */}
        {saveSuccessMsg && (
          <div className="bg-emerald-50 border-2 border-emerald-500/50 p-4 rounded-2xl flex items-center gap-3 text-emerald-900 animate-fadeIn">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div className="font-bold text-sm sm:text-base">{saveSuccessMsg}</div>
          </div>
        )}
        {saveErrorMsg && (
          <div className="bg-rose-50 border-2 border-rose-500/50 p-4 rounded-2xl flex items-center gap-3 text-rose-900 animate-fadeIn">
            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
            <div className="font-bold text-sm sm:text-base">{saveErrorMsg}</div>
          </div>
        )}

        {/* ABA 1: BALANÇA OPERACIONAL (Tablet Friendly) */}
        {activeTab === "balanca" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Lado Esquerdo: Formulário de Pesagem */}
            <div className="lg:col-span-7 bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
              {/* Passo 1: Selecionar Produto */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-black">
                    1
                  </span>
                  Selecionar Produto
                </label>
                <div className="relative">
                  <div className="flex items-center gap-2 border-2 border-slate-300 rounded-xl px-3 py-2.5 focus-within:border-[#1a2a6c] bg-white transition-colors">
                    <Search className="w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={selectedProduct ? selectedProduct.descricao : productSearch}
                      onChange={(e) => {
                        setSelectedProduct(null)
                        setProductSearch(e.target.value)
                        setShowCatalogDropdown(true)
                      }}
                      onFocus={() => setShowCatalogDropdown(true)}
                      placeholder="Digite o código ou nome do produto..."
                      className="w-full text-base font-semibold text-slate-900 outline-none"
                    />
                    {selectedProduct && (
                      <button
                        onClick={() => {
                          setSelectedProduct(null)
                          setProductSearch("")
                        }}
                        className="text-xs font-bold text-slate-400 hover:text-slate-700 bg-slate-100 px-2 py-1 rounded-md"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {/* Dropdown de Produtos */}
                  {showCatalogDropdown && !selectedProduct && (
                    <div className="absolute z-30 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-slate-300 rounded-xl shadow-xl divide-y divide-slate-100">
                      {filteredProducts.map((p) => (
                        <button
                          key={p.reduzido}
                          type="button"
                          onClick={() => {
                            setSelectedProduct(p)
                            setShowCatalogDropdown(false)
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between text-sm"
                        >
                          <span className="font-bold text-slate-900">{p.descricao}</span>
                          <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono">
                            Cód {p.reduzido}
                          </span>
                        </button>
                      ))}
                      {filteredProducts.length === 0 && (
                        <div className="p-4 text-center text-sm text-slate-400">
                          Nenhum produto cadastrado com esse nome. O texto digitado será utilizado.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Passo 2: Peso Bruto (Visor de Balança) */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-black">
                    2
                  </span>
                  Peso Bruto na Balança (kg)
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={pesoBrutoInput}
                      onChange={(e) => setPesoBrutoInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-3xl sm:text-4xl font-black text-slate-900 px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-[#1a2a6c] outline-none font-mono tracking-tight bg-slate-50/50"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">
                      KG
                    </span>
                  </div>
                </div>

                {/* Atalhos de Peso Rápido (Tablet Touch) */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {["10", "15", "20", "25", "30", "38", "50"].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => setPesoBrutoInput(quick)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                    >
                      {quick} kg
                    </button>
                  ))}
                </div>
              </div>

              {/* Passo 3: Selecionar Carrinho Utilizado */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ShoppingCart className="w-4 h-4 text-slate-600" />
                    Carrinho Utilizado (Desconto de Tara)
                  </label>
                  {selectedCarrinho && (
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      - {selectedCarrinho.taraKg.toFixed(2)} kg
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCarrinhoId("")}
                    className={`p-3 rounded-xl border-2 text-left font-bold text-xs transition-all flex flex-col justify-between h-18 ${
                      selectedCarrinhoId === ""
                        ? "border-[#1a2a6c] bg-blue-50 text-[#1a2a6c]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span>Nenhum</span>
                    <span className="text-[10px] text-slate-400">0,00 kg</span>
                  </button>
                  {carrinhos.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCarrinhoId(c.id)}
                      className={`p-3 rounded-xl border-2 text-left font-bold text-xs transition-all flex flex-col justify-between h-18 ${
                        selectedCarrinhoId === c.id
                          ? "border-[#1a2a6c] bg-blue-50 text-[#1a2a6c]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <span className="truncate">{c.nome}</span>
                      <span className="text-[11px] font-mono text-slate-900 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200 self-start">
                        {c.taraKg.toFixed(2)} kg
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Passo 4: Selecionar Caixa Utilizada */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Box className="w-4 h-4 text-slate-600" />
                    Caixa Utilizada (Desconto de Tara)
                  </label>
                  {selectedCaixa && (
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      - {selectedCaixa.taraKg.toFixed(2)} kg
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCaixaId("")}
                    className={`p-3 rounded-xl border-2 text-left font-bold text-xs transition-all flex flex-col justify-between h-18 ${
                      selectedCaixaId === ""
                        ? "border-[#1a2a6c] bg-amber-50 text-amber-900"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span>Nenhuma</span>
                    <span className="text-[10px] text-slate-400">0,00 kg</span>
                  </button>
                  {caixas.map((cx) => (
                    <button
                      key={cx.id}
                      type="button"
                      onClick={() => setSelectedCaixaId(cx.id)}
                      className={`p-3 rounded-xl border-2 text-left font-bold text-xs transition-all flex flex-col justify-between h-18 ${
                        selectedCaixaId === cx.id
                          ? "border-[#1a2a6c] bg-amber-50 text-amber-900"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <span className="truncate">{cx.nome}</span>
                      <span className="text-[11px] font-mono text-slate-900 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200 self-start">
                        {cx.taraKg.toFixed(2)} kg
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Observações e Evidência */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Observações & Foto (Opcional)
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {photoPreview ? "Trocar Foto" : "Anexar Evidência"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoCapture}
                  />
                </div>
                <input
                  type="text"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Ex: Lote 4B, produto com umidade alta, conferido no recebimento..."
                  className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-[#1a2a6c]"
                />
                {photoPreview && (
                  <div className="relative inline-block mt-2">
                    <img
                      src={photoPreview}
                      alt="Evidência"
                      className="w-24 h-24 object-cover rounded-xl border-2 border-emerald-500 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoPreview("")}
                      className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-black shadow"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Lado Direito: VISOR DE CÁLCULO E CONFIRMAÇÃO */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* O Grande Painel Indicativo: Bruto → Líquido */}
              <div className="bg-gradient-to-br from-[#1a2a6c] to-[#2745a3] text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col justify-between border-4 border-amber-400/30">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-widest text-amber-300 mb-2 flex items-center gap-2">
                    <Scale className="w-4 h-4" />
                    Cálculo Automático de Tara
                  </div>
                  <h3 className="text-lg font-bold text-white mb-6">
                    {selectedProduct ? selectedProduct.descricao : productSearch || "Selecione o Produto"}
                  </h3>

                  {/* VISUAL INDICATIVO BRUTO -> LÍQUIDO */}
                  <div className="bg-white/10 p-5 rounded-2xl border border-white/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] uppercase font-bold text-blue-200">Peso Bruto</div>
                        <div className="text-3xl font-black font-mono text-white">
                          {pesoBrutoNum > 0 ? pesoBrutoNum.toFixed(2) : "0,00"}{" "}
                          <span className="text-sm font-normal text-blue-200">kg</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-amber-400 text-slate-950 rounded-full shadow-lg">
                        <ArrowRight className="w-6 h-6 stroke-[3]" />
                      </div>

                      <div className="text-right">
                        <div className="text-[11px] uppercase font-bold text-amber-300">
                          Peso Líquido
                        </div>
                        <div className="text-3xl sm:text-4xl font-black font-mono text-amber-300">
                          {pesoLiquidoNum > 0 ? pesoLiquidoNum.toFixed(2) : "0,00"}{" "}
                          <span className="text-sm font-normal text-amber-200">kg</span>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown de Taras */}
                    <div className="pt-3 border-t border-white/15 text-xs text-blue-100 space-y-1">
                      <div className="flex justify-between">
                        <span>Carrinho ({selectedCarrinho?.nome || "Nenhum"}):</span>
                        <span className="font-mono font-bold">
                          {taraCarrinho > 0 ? `-${taraCarrinho.toFixed(2)} kg` : "0,00 kg"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Caixa ({selectedCaixa?.nome || "Nenhuma"}):</span>
                        <span className="font-mono font-bold">
                          {taraCaixa > 0 ? `-${taraCaixa.toFixed(2)} kg` : "0,00 kg"}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-amber-300 pt-1 border-t border-white/10">
                        <span>Desconto Total da Tara:</span>
                        <span className="font-mono">-{taraTotal.toFixed(2)} kg</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTÃO CONFIRMAR E SALVAR */}
                <div className="mt-8 space-y-3">
                  <button
                    type="button"
                    disabled={isSaving || pesoBrutoNum <= 0}
                    onClick={handleSalvarConferencia}
                    className={`w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg uppercase tracking-wider shadow-2xl transition-all flex items-center justify-center gap-3 ${
                      pesoBrutoNum > 0 && !isSaving
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white hover:scale-[1.02] cursor-pointer"
                        : "bg-slate-700 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-6 h-6 animate-spin" />
                        Registrando Pesagem...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-6 h-6" />
                        Confirmar e Salvar Conferência
                      </>
                    )}
                  </button>

                  <div className="text-center text-xs text-blue-200 flex items-center justify-center gap-2">
                    <UserCheck className="w-3.5 h-3.5" />
                    Responsável: {user?.nome || user?.usuario || "Operador Balança"}
                  </div>
                </div>
              </div>

              {/* Informação Operacional */}
              <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-800">Regra de Integridade:</div>
                <div>• Registros de Simples Conferência não afetam saldos de estoque.</div>
                <div>• Os valores de tara salvos ficam imutáveis no histórico original.</div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: RELATÓRIO DE SIMPLES CONFERÊNCIA */}
        {activeTab === "relatorio" && (
          <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Relatório Organizacional de Conferências
                </h2>
                <p className="text-xs text-slate-500">
                  Histórico completo com tara do carrinho, tara da caixa e indicador Bruto → Líquido.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Exportar CSV
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  Imprimir
                </button>
              </div>
            </div>

            {/* Barra de Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="sm:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  placeholder="Filtrar por produto ou funcionário..."
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg outline-none focus:border-[#1a2a6c]"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={filtroData}
                  onChange={(e) => setFiltroData(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg outline-none focus:border-[#1a2a6c]"
                />
              </div>
            </div>

            {/* Tabela de Resultados */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Data e Hora</th>
                    <th className="p-3">Produto</th>
                    <th className="p-3 text-center">Peso Bruto → Líquido</th>
                    <th className="p-3">Carrinho (Tara)</th>
                    <th className="p-3">Caixa (Tara)</th>
                    <th className="p-3">Responsável</th>
                    <th className="p-3">Obs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {relatorioFiltrado.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-slate-500 whitespace-nowrap">
                        {new Date(c.createdAt).toLocaleDateString("pt-BR")}{" "}
                        <span className="text-[10px] text-slate-400">
                          {new Date(c.createdAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-900">{c.produtoNome}</td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="font-mono text-slate-600">{c.pesoBruto.toFixed(2)} kg</span>
                        <span className="mx-1.5 text-amber-600 font-bold">→</span>
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {c.pesoLiquido.toFixed(2)} kg
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">
                        {c.tipoCarrinhoNome || "—"}{" "}
                        {c.taraCarrinhoKg > 0 && (
                          <span className="text-[10px] text-slate-400">
                            (-{c.taraCarrinhoKg.toFixed(2)} kg)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600">
                        {c.tipoCaixaNome || "—"}{" "}
                        {c.taraCaixaKg > 0 && (
                          <span className="text-[10px] text-slate-400">
                            (-{c.taraCaixaKg.toFixed(2)} kg)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-700 font-semibold">{c.responsavel}</td>
                      <td className="p-3 text-slate-500 truncate max-w-[150px]">
                        {c.observacao || "—"}
                      </td>
                    </tr>
                  ))}
                  {relatorioFiltrado.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Nenhuma conferência encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 3: CADASTRO DE TARAS (ADMIN) */}
        {activeTab === "taras" && user?.role === "admin" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Carrinhos */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  Modelos de Carrinho & Taras
                </h3>
              </div>

              <form onSubmit={handleCriarCarrinho} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome (ex: Carrinho 4)"
                  value={novoCarrinhoNome}
                  onChange={(e) => setNovoCarrinhoNome(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-[#1a2a6c]"
                />
                <input
                  type="text"
                  placeholder="Tara (kg)"
                  value={novoCarrinhoTara}
                  onChange={(e) => setNovoCarrinhoTara(e.target.value)}
                  className="w-24 px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-[#1a2a6c]"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-[#1a2a6c] text-white rounded-lg text-xs font-bold hover:bg-[#203a8f] flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </form>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {carrinhos.map((c) => (
                  <div key={c.id} className="p-3 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{c.nome}</span>
                    <span className="font-mono bg-blue-50 text-blue-800 px-2.5 py-1 rounded-md font-bold">
                      {c.taraKg.toFixed(2)} kg
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Caixas */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Box className="w-5 h-5 text-amber-600" />
                  Modelos de Caixa & Taras
                </h3>
              </div>

              <form onSubmit={handleCriarCaixa} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome (ex: Caixa 3)"
                  value={novaCaixaNome}
                  onChange={(e) => setNovaCaixaNome(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-[#1a2a6c]"
                />
                <input
                  type="text"
                  placeholder="Tara (kg)"
                  value={novaCaixaTara}
                  onChange={(e) => setNovaCaixaTara(e.target.value)}
                  className="w-24 px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-[#1a2a6c]"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-[#1a2a6c] text-white rounded-lg text-xs font-bold hover:bg-[#203a8f] flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </form>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {caixas.map((cx) => (
                  <div key={cx.id} className="p-3 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{cx.nome}</span>
                    <span className="font-mono bg-amber-50 text-amber-800 px-2.5 py-1 rounded-md font-bold">
                      {cx.taraKg.toFixed(2)} kg
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
