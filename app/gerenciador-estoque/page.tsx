"use client"

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import Link from "next/link"

export type TipoUnidade = "cx" | "kg" | "sc" | "bdj" | "dz" | "un"
export type MaturacaoStatus = "firme" | "maduro" | "critico"

interface StockItem {
  reduzido: string
  descricao: string
  palletTotal: number
  lastro: number
  unidade?: boolean
  tipoUnidade?: TipoUnidade
  taraKg?: number
}

type AreaTab = "principal" | "picking" | "avarias"

const UNIDADE_LABELS: Record<TipoUnidade, string> = {
  cx: "Caixa (cx)",
  kg: "Quilo (kg)",
  sc: "Saco (sc)",
  bdj: "Bandeja (bdj)",
  dz: "Dúzia (dz)",
  un: "Unidade (un)",
}

const MATURACAO_LABELS: Record<MaturacaoStatus, { label: string; badge: string }> = {
  firme: { label: "🟢 Firme / Verde", badge: "FIRME" },
  maduro: { label: "🟡 Ponto de Venda", badge: "PONTO VENDA" },
  critico: { label: "🔴 Giro Imediato", badge: "GIRO IMEDIATO" },
}

// Utilitários de expressão matemática (+, -, *, /) ex: "10+5", "4*12", "50-3", "20/2"
const sanitizeExpression = (val: string) =>
  val
    .replace(/[xX×]/g, "*")
    .replace(/[÷:]/g, "/")
    .replace(/,/g, ".")
    .replace(/[^\d.+\-*/()]/g, "")
    .replace(/([+\-*/.]){2,}/g, "$1")

const evaluateExpression = (val: string): number => {
  const cleaned = sanitizeExpression(val)
  if (!cleaned) return 0
  // Remove operadores pendentes no final enquanto o usuário digita (ex: "10*5+")
  const trimmed = cleaned.replace(/[+\-*/.(]+$/g, "")
  if (!trimmed) return 0

  try {
    // Validação estrita: apenas números, ponto decimal, parênteses e operadores + - * /
    if (!/^[\d.+\-*/()]+$/.test(trimmed)) return 0
    // eslint-disable-next-line no-new-func
    const rawResult = Function(`"use strict"; return (${trimmed});`)()
    const num = Number(rawResult)
    if (!Number.isFinite(num)) return 0
    return Math.max(0, Number(num.toFixed(2)))
  } catch {
    const fallback = Number.parseFloat(trimmed)
    return Number.isFinite(fallback) ? Math.max(0, Number(fallback.toFixed(2))) : 0
  }
}

const hasMathOperator = (val: string | undefined): boolean =>
  Boolean(val && /[+\-*/]/.test(val.replace(/^-/, "")))

const normalizeNumericString = (val: string): string => {
  if (!val || !val.trim()) return ""
  const num = evaluateExpression(val)
  return num ? String(num) : "0"
}

const stepValue = (current: string | undefined, delta: number): string => {
  const val = evaluateExpression(current || "0")
  return Number.isFinite(val) ? String(Math.max(0, Number((val + delta).toFixed(2)))) : ""
}

// Gerador nativo de PDF A4 compatível com a interface usada pelo Gerenciador de Estoque
class SimpleA4Pdf {
  private pages: string[][] = [[]]
  private currentFontWeight: "normal" | "bold" = "normal"
  private currentFontSize = 10

  public internal = {
    pageSize: {
      getWidth: () => 210,
      getHeight: () => 297,
    },
  }

  setFont(_family: string, weight: "normal" | "bold" = "normal") {
    this.currentFontWeight = weight
  }

  setFontSize(size: number) {
    this.currentFontSize = size
  }

  addPage() {
    this.pages.push([])
  }

  splitTextToSize(text: string, maxWidthMm: number): string[] {
    const clean = String(text || "")
    const maxChars = Math.max(10, Math.floor(maxWidthMm / (this.currentFontSize * 0.22)))
    if (clean.length <= maxChars) return [clean]
    const words = clean.split(/\s+/)
    const lines: string[] = []
    let currentLine = ""
    for (const word of words) {
      if (!currentLine) {
        currentLine = word
      } else if ((currentLine + " " + word).length <= maxChars) {
        currentLine += " " + word
      } else {
        lines.push(currentLine)
        currentLine = word
      }
    }
    if (currentLine) lines.push(currentLine)
    return lines.length ? lines : [clean]
  }

  private escapePdfText(str: string): string {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
  }

  text(content: string | string[], xMm: number, yMm: number) {
    const lines = Array.isArray(content) ? content : [String(content)]
    const ptX = (xMm * 72) / 25.4
    const pageHeightPt = 841.89
    const fontKey = this.currentFontWeight === "bold" ? "/F2" : "/F1"
    const currentPage = this.pages[this.pages.length - 1]

    lines.forEach((line, idx) => {
      const ptY = pageHeightPt - ((yMm + idx * 4.5) * 72) / 25.4
      const escaped = this.escapePdfText(line)
      currentPage.push(
        `BT ${fontKey} ${this.currentFontSize} Tf ${ptX.toFixed(2)} ${ptY.toFixed(2)} Td (${escaped}) Tj ET`
      )
    })
  }

  private buildPdfBytes(): Uint8Array {
    const objects: string[] = []
    const addObj = (body: string) => {
      objects.push(body)
      return objects.length
    }

    const fontRegularId = addObj(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
    )
    const fontBoldId = addObj(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
    )

    const pageIds: number[] = []
    const pagesRootPlaceholderId = addObj("")

    for (const pageCommands of this.pages) {
      const streamData = pageCommands.join("\n")
      const contentId = addObj(
        `<< /Length ${streamData.length} >>\nstream\n${streamData}\nendstream`
      )
      const pageId = addObj(
        `<< /Type /Page /Parent ${pagesRootPlaceholderId} 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`
      )
      pageIds.push(pageId)
    }

    objects[pagesRootPlaceholderId - 1] = `<< /Type /Pages /Kids [${pageIds
      .map((id) => `${id} 0 R`)
      .join(" ")}] /Count ${pageIds.length} >>`

    const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesRootPlaceholderId} 0 R >>`)

    let pdf = "%PDF-1.4\n"
    const offsets: number[] = []

    objects.forEach((obj, idx) => {
      offsets.push(pdf.length)
      pdf += `${idx + 1} 0 obj\n${obj}\nendobj\n`
    })

    const xrefOffset = pdf.length
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
    offsets.forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`
    })

    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

    const encoder = new TextEncoder()
    return encoder.encode(pdf)
  }

  output(_type: "blob"): Blob {
    const bytes = this.buildPdfBytes()
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    return new Blob([buffer], { type: "application/pdf" })
  }

  save(fileName: string) {
    const blob = this.output("blob")
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

export default function GerenciadorEstoquePage() {
  const [scope, setScope] = useState<"filial" | "matriz">("filial")
  const [date, setDate] = useState("")
  const [contador, setContador] = useState("")

  // Principal
  const [pallets, setPallets] = useState<Record<string, string>>({})
  const [lastros, setLastros] = useState<Record<string, string>>({})
  const [fardos, setFardos] = useState<Record<string, string>>({})
  const [unidades, setUnidades] = useState<Record<string, string>>({})

  // Picking
  const [pickingPallets, setPickingPallets] = useState<Record<string, string>>({})
  const [pickingLastros, setPickingLastros] = useState<Record<string, string>>({})
  const [pickingFardos, setPickingFardos] = useState<Record<string, string>>({})
  const [pickingUnidades, setPickingUnidades] = useState<Record<string, string>>({})

  // Avarias
  const [avariaPallets, setAvariaPallets] = useState<Record<string, string>>({})
  const [avariaLastros, setAvariaLastros] = useState<Record<string, string>>({})
  const [avariaFardos, setAvariaFardos] = useState<Record<string, string>>({})
  const [avariaUnidades, setAvariaUnidades] = useState<Record<string, string>>({})

  // Grau de Maturação / Giro FEFO por produto
  const [maturacao, setMaturacao] = useState<Record<string, MaturacaoStatus>>({})
  // Quantidade de caixas para cálculo de Tara (quando item é contado em kg)
  const [caixasTara, setCaixasTara] = useState<Record<string, string>>({})

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [saveSuccess, setSaveSuccess] = useState("")
  const [telegramMessage, setTelegramMessage] = useState("")
  const [telegramStatus, setTelegramStatus] = useState<"info" | "success" | "error">("info")
  const [loadRecordError, setLoadRecordError] = useState("")
  const [isLoadingRecord, setIsLoadingRecord] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedCodes, setSelectedCodes] = useState<string[]>([])
  const [expandedCompact, setExpandedCompact] = useState<Record<string, boolean>>({})

  // Scanner
  const [scannerEnabled, setScannerEnabled] = useState(false)
  const [scannerError, setScannerError] = useState("")
  const [scannerReady, setScannerReady] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  // Catálogo de itens (vindo exclusivamente do banco de dados)
  const [dbItems, setDbItems] = useState<StockItem[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [itemsError, setItemsError] = useState("")

  // Modos de visualização
  const [quickMode, setQuickMode] = useState(false)
  const [fullScreenMode, setFullScreenMode] = useState(false)
  const [compactMode, setCompactMode] = useState(false)
  const [activeTab, setActiveTab] = useState<AreaTab>("principal")

  // Cadastro / Edição de produto no banco e importação em lote
  const [customItems, setCustomItems] = useState<StockItem[]>([])
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customCode, setCustomCode] = useState("")
  const [customDesc, setCustomDesc] = useState("")
  const [customPalletTotal, setCustomPalletTotal] = useState("")
  const [customLastro, setCustomLastro] = useState("")
  const [customTipoUnidade, setCustomTipoUnidade] = useState<TipoUnidade>("cx")
  const [customTaraKg, setCustomTaraKg] = useState("")
  const [customFormError, setCustomFormError] = useState("")

  // Importação em lote de produtos para o Banco de Dados
  const [showBulkDbImport, setShowBulkDbImport] = useState(false)
  const [bulkDbText, setBulkDbText] = useState("")
  const [isImportingDb, setIsImportingDb] = useState(false)

  const [quickCodeInput, setQuickCodeInput] = useState("")
  const [bulkText, setBulkText] = useState("")
  const [showBulkPaste, setShowBulkPaste] = useState(false)

  // Progresso e faltantes
  const [missingCodes, setMissingCodes] = useState<string[]>([])
  const [showProgressModal, setShowProgressModal] = useState(false)

  // Câmeras
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [cameraIndex, setCameraIndex] = useState(0)
  const camerasRef = useRef<MediaDeviceInfo[]>([])
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastScanRef = useRef<{ code: string; at: number } | null>(null)
  const rafRef = useRef<number | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)
  const startingCameraRef = useRef(false)
  const activeCameraRef = useRef(false)
  const prevCameraIndexRef = useRef(0)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [atBottom, setAtBottom] = useState(false)

  const allItems = useMemo(() => {
    if (!customItems.length) return dbItems
    const map = new Map(dbItems.map((item) => [item.reduzido, item]))
    customItems.forEach((item) => {
      map.set(item.reduzido, item)
    })
    return Array.from(map.values())
  }, [customItems, dbItems])

  const itemsByCode = useMemo(
    () => new Map(allItems.map((item) => [item.reduzido, item])),
    [allItems]
  )

  const canSaveForDate = useMemo(() => {
    if (!date) return true
    const [d, m, y] = date.split("/")
    if (!d || !m || !y) return true
    const parsed = new Date(Number(y), Number(m) - 1, Number(d))
    if (Number.isNaN(parsed.getTime())) return true
    parsed.setHours(23, 59, 59, 999)
    return Date.now() <= parsed.getTime()
  }, [date])

  const sortedItems = useMemo(
    () =>
      [...allItems].sort((a, b) =>
        a.reduzido.localeCompare(b.reduzido, "pt-BR", { numeric: true })
      ),
    [allItems]
  )

  const filteredMenuItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return sortedItems
    return sortedItems.filter(
      (item) =>
        item.reduzido.toLowerCase().includes(q) ||
        item.descricao.toLowerCase().includes(q)
    )
  }, [sortedItems, searchQuery])

  const selectedItems = useMemo(() => {
    if (!selectedCodes.length) return []
    const map = new Map(allItems.map((item) => [item.reduzido, item]))
    return selectedCodes
      .map((code) => map.get(code))
      .filter((item): item is StockItem => Boolean(item))
  }, [allItems, selectedCodes])

  const orderedSelectedItems = useMemo(() => {
    if (!selectedCodes.length) return []
    const set = new Set(selectedCodes)
    return sortedItems.filter((item) => set.has(item.reduzido))
  }, [sortedItems, selectedCodes])

  const sortedSelectedItems = useMemo(
    () =>
      selectedItems.length
        ? [...selectedItems].sort((a, b) =>
            a.reduzido.localeCompare(b.reduzido, "pt-BR", { numeric: true })
          )
        : [],
    [selectedItems]
  )

  const selectItemCode = useCallback((code: string) => {
    setSelectedCodes((prev) => (prev.includes(code) ? prev : [code, ...prev]))
    setExpandedCompact((prev) => ({
      ...prev,
      [code]: prev[code] ?? false,
    }))
  }, [])

  const scrollToItem = useCallback((code: string) => {
    const el = itemRefs.current[code]
    if (el) {
      window.requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" })
        el.classList.add("stock-highlight")
        window.setTimeout(() => {
          el.classList.remove("stock-highlight")
        }, 1200)
      })
    }
  }, [])

  const removeSelectedCode = useCallback((code: string) => {
    setSelectedCodes((prev) => prev.filter((c) => c !== code))
    setExpandedCompact((prev) => {
      const next = { ...prev }
      delete next[code]
      return next
    })
  }, [])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage("")
    }, 2600)
  }

  // Excluir item do banco de dados
  const handleDeleteFromDatabase = async (code: string, desc: string) => {
    if (!window.confirm(`Deseja realmente excluir "${code} - ${desc}" do banco de dados?`)) {
      return
    }
    try {
      const res = await fetch(`/api/estoque-itens?reduzido=${encodeURIComponent(code)}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Erro ao excluir item.")
      }
      setDbItems((prev) => prev.filter((i) => i.reduzido !== code))
      setCustomItems((prev) => prev.filter((i) => i.reduzido !== code))
      removeSelectedCode(code)
      showToast("Produto excluído do banco.")
    } catch (err) {
      console.error("Delete item error:", err)
      showToast("Erro ao excluir produto do banco.")
    }
  }

  // Carregar perdas do dia lançadas no Controle de Perdas para a aba Avarias
  const handleImportPerdasDoDia = async () => {
    const targetDate = date || new Date().toLocaleDateString("pt-BR")
    try {
      const res = await fetch(`/api/perdas?date=${encodeURIComponent(targetDate)}`)
      const data = await res.json()
      if (!res.ok || !data?.ok || !Array.isArray(data.occurrences)) {
        showToast("Não foi possível consultar perdas do dia.")
        return
      }
      if (data.occurrences.length === 0) {
        showToast(`Nenhuma perda registrada em ${targetDate}.`)
        return
      }

      const norm = (s: string) =>
        s
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim()

      let matchedCount = 0
      const weightByCode: Record<string, number> = {}

      data.occurrences.forEach((occ: any) => {
        if (!Array.isArray(occ.items)) return
        occ.items.forEach((lossItem: any) => {
          const lossName = norm(String(lossItem.name || ""))
          const found = allItems.find(
            (cat) =>
              norm(cat.descricao) === lossName ||
              norm(cat.descricao).includes(lossName) ||
              lossName.includes(norm(cat.descricao))
          )
          if (found) {
            weightByCode[found.reduzido] =
              (weightByCode[found.reduzido] || 0) +
              Math.round(Number(lossItem.weightKg) || 0)
            matchedCount++
          }
        })
      })

      const codesToSelect = Object.keys(weightByCode)
      if (!codesToSelect.length) {
        showToast("Perdas encontradas, mas nenhum produto correspondente no catálogo.")
        return
      }

      setSelectedCodes((prev) => Array.from(new Set([...codesToSelect, ...prev])))
      setAvariaFardos((prev) => {
        const next = { ...prev }
        codesToSelect.forEach((c) => {
          next[c] = String(weightByCode[c])
        })
        return next
      })
      setActiveTab("avarias")
      showToast(`${codesToSelect.length} produto(s) importado(s) para Avarias!`)
    } catch (err) {
      console.error("Import perdas error:", err)
      showToast("Erro ao importar perdas do dia.")
    }
  }

  const renderAreaFields = (
    item: StockItem,
    title: string,
    caixasMap: Record<string, string>,
    setCaixasMap: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    sacosMap: Record<string, string>,
    setSacosMap: React.Dispatch<React.SetStateAction<Record<string, string>>>
  ) => {
    const hasTare = (item.taraKg || 0) > 0

    return (
      <div className="stock-area">
        <div className="stock-area-title">
          {title} — Quantidade em Caixas / Sacos
          {hasTare ? ` (Tara: ${item.taraKg} kg/cx)` : ""}
        </div>
        <div
          className="stock-fields"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "10px",
          }}
        >
          <div className="field">
            <span>
              📦 Caixas (CX){" "}
              {hasMathOperator(caixasMap[item.reduzido]) && (
                <strong style={{ color: "#15803d" }}>
                  = {evaluateExpression(caixasMap[item.reduzido] || "0")}
                </strong>
              )}
            </span>
            <div className="stepper">
              <button
                type="button"
                onClick={() =>
                  setCaixasMap((prev) => ({
                    ...prev,
                    [item.reduzido]: stepValue(prev[item.reduzido], -1),
                  }))
                }
              >
                -
              </button>
              <input
                type="text"
                placeholder="Ex: 10+5, 4*12, 50-3"
                value={caixasMap[item.reduzido] || ""}
                onChange={(e) => {
                  const val = sanitizeExpression(e.target.value)
                  setCaixasMap((prev) => ({ ...prev, [item.reduzido]: val }))
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    setCaixasMap((prev) => ({
                      ...prev,
                      [item.reduzido]: normalizeNumericString(prev[item.reduzido] || ""),
                    }))
                  }
                }}
                onBlur={(e) =>
                  setCaixasMap((prev) => ({
                    ...prev,
                    [item.reduzido]: normalizeNumericString(e.target.value),
                  }))
                }
              />
              <button
                type="button"
                onClick={() =>
                  setCaixasMap((prev) => ({
                    ...prev,
                    [item.reduzido]: stepValue(prev[item.reduzido], 1),
                  }))
                }
              >
                +
              </button>
            </div>
            <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
              {(["+", "-", "*", "/"] as const).map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() =>
                    setCaixasMap((prev) => ({
                      ...prev,
                      [item.reduzido]: sanitizeExpression((prev[item.reduzido] || "") + op),
                    }))
                  }
                  style={{
                    flex: 1,
                    padding: "4px 0",
                    fontSize: "12px",
                    fontWeight: 700,
                    background: "#eef1f8",
                    color: "#1a2a6c",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    marginTop: 0,
                  }}
                >
                  {op === "*" ? "×" : op === "/" ? "÷" : op}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  setCaixasMap((prev) => ({
                    ...prev,
                    [item.reduzido]: normalizeNumericString(prev[item.reduzido] || ""),
                  }))
                }
                style={{
                  flex: 1,
                  padding: "4px 0",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: "#1a2a6c",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  marginTop: 0,
                }}
              >
                =
              </button>
            </div>
          </div>

          <div className="field">
            <span>
              🛍️ Sacos (SC){" "}
              {hasMathOperator(sacosMap[item.reduzido]) && (
                <strong style={{ color: "#15803d" }}>
                  = {evaluateExpression(sacosMap[item.reduzido] || "0")}
                </strong>
              )}
            </span>
            <div className="stepper">
              <button
                type="button"
                onClick={() =>
                  setSacosMap((prev) => ({
                    ...prev,
                    [item.reduzido]: stepValue(prev[item.reduzido], -1),
                  }))
                }
              >
                -
              </button>
              <input
                type="text"
                placeholder="Ex: 10+5, 4*12, 50-3"
                value={sacosMap[item.reduzido] || ""}
                onChange={(e) => {
                  const val = sanitizeExpression(e.target.value)
                  setSacosMap((prev) => ({ ...prev, [item.reduzido]: val }))
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    setSacosMap((prev) => ({
                      ...prev,
                      [item.reduzido]: normalizeNumericString(prev[item.reduzido] || ""),
                    }))
                  }
                }}
                onBlur={(e) =>
                  setSacosMap((prev) => ({
                    ...prev,
                    [item.reduzido]: normalizeNumericString(e.target.value),
                  }))
                }
              />
              <button
                type="button"
                onClick={() =>
                  setSacosMap((prev) => ({
                    ...prev,
                    [item.reduzido]: stepValue(prev[item.reduzido], 1),
                  }))
                }
              >
                +
              </button>
            </div>
            <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
              {(["+", "-", "*", "/"] as const).map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() =>
                    setSacosMap((prev) => ({
                      ...prev,
                      [item.reduzido]: sanitizeExpression((prev[item.reduzido] || "") + op),
                    }))
                  }
                  style={{
                    flex: 1,
                    padding: "4px 0",
                    fontSize: "12px",
                    fontWeight: 700,
                    background: "#eef1f8",
                    color: "#1a2a6c",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    marginTop: 0,
                  }}
                >
                  {op === "*" ? "×" : op === "/" ? "÷" : op}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  setSacosMap((prev) => ({
                    ...prev,
                    [item.reduzido]: normalizeNumericString(prev[item.reduzido] || ""),
                  }))
                }
                style={{
                  flex: 1,
                  padding: "4px 0",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: "#1a2a6c",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  marginTop: 0,
                }}
              >
                =
              </button>
            </div>
          </div>

          {hasTare && (
            <div className="field">
              <span>Qtd. Caixas p/ Desconto de Tara ({item.taraKg} kg/cx)</span>
              <div className="stepper">
                <button
                  type="button"
                  onClick={() =>
                    setCaixasTara((prev) => ({
                      ...prev,
                      [item.reduzido]: stepValue(prev[item.reduzido], -1),
                    }))
                  }
                >
                  -
                </button>
                <input
                  type="text"
                  value={caixasTara[item.reduzido] || ""}
                  onChange={(e) =>
                    setCaixasTara((prev) => ({
                      ...prev,
                      [item.reduzido]: sanitizeExpression(e.target.value),
                    }))
                  }
                  onBlur={(e) =>
                    setCaixasTara((prev) => ({
                      ...prev,
                      [item.reduzido]: normalizeNumericString(e.target.value),
                    }))
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    setCaixasTara((prev) => ({
                      ...prev,
                      [item.reduzido]: stepValue(prev[item.reduzido], 1),
                    }))
                  }
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderCurrentTabFields = (item: StockItem) => {
    if (activeTab === "picking") {
      return renderAreaFields(
        item,
        "Picking",
        pickingFardos,
        setPickingFardos,
        pickingPallets,
        setPickingPallets
      )
    }
    if (activeTab === "avarias") {
      return renderAreaFields(
        item,
        "Avarias",
        avariaFardos,
        setAvariaFardos,
        avariaPallets,
        setAvariaPallets
      )
    }
    return renderAreaFields(
      item,
      "Principal",
      fardos,
      setFardos,
      pallets,
      setPallets
    )
  }

  const calcAreaTotal = (
    item: StockItem,
    caixasMap: Record<string, string>,
    sacosMap: Record<string, string>
  ) => {
    const cx = evaluateExpression(caixasMap[item.reduzido] || "0")
    const sc = evaluateExpression(sacosMap[item.reduzido] || "0")
    return cx + sc
  }

  const calcItemCaixasTotal = (item: StockItem) =>
    evaluateExpression(fardos[item.reduzido] || "0") +
    evaluateExpression(pickingFardos[item.reduzido] || "0") +
    evaluateExpression(avariaFardos[item.reduzido] || "0")

  const calcItemSacosTotal = (item: StockItem) =>
    evaluateExpression(pallets[item.reduzido] || "0") +
    evaluateExpression(pickingPallets[item.reduzido] || "0") +
    evaluateExpression(avariaPallets[item.reduzido] || "0")

  const calcItemGrandTotal = (item: StockItem) => {
    const gross =
      calcAreaTotal(item, fardos, pallets) +
      calcAreaTotal(item, pickingFardos, pickingPallets) +
      calcAreaTotal(item, avariaFardos, avariaPallets)
    const tareBoxes = evaluateExpression(caixasTara[item.reduzido] || "0")
    const tareDiscount = tareBoxes * (Number(item.taraKg) || 0)
    return Math.max(0, Number((gross - tareDiscount).toFixed(2)))
  }

  const getCompactDirectValue = (code: string) => {
    if (activeTab === "picking") return pickingFardos[code] || ""
    if (activeTab === "avarias") return avariaFardos[code] || ""
    return fardos[code] || ""
  }

  const setCompactDirectValue = (code: string, val: string) => {
    if (activeTab === "picking") {
      setPickingFardos((prev) => ({ ...prev, [code]: val }))
    } else if (activeTab === "avarias") {
      setAvariaFardos((prev) => ({ ...prev, [code]: val }))
    } else {
      setFardos((prev) => ({ ...prev, [code]: val }))
    }
  }

  const stepCompactDirectValue = (code: string, delta: number) => {
    const current = getCompactDirectValue(code)
    setCompactDirectValue(code, stepValue(current, delta))
  }

  const focusSearchInput = useCallback(() => {
    if (!menuOpen) {
      setMenuOpen(true)
      window.setTimeout(() => {
        searchInputRef.current?.focus()
        searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 120)
      return
    }
    searchInputRef.current?.focus()
    searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [menuOpen])

  const hasAnyValue = useCallback(
    (code: string) =>
      [
        pallets[code] || "",
        lastros[code] || "",
        fardos[code] || "",
        unidades[code] || "",
        pickingPallets[code] || "",
        pickingLastros[code] || "",
        pickingFardos[code] || "",
        pickingUnidades[code] || "",
        avariaPallets[code] || "",
        avariaLastros[code] || "",
        avariaFardos[code] || "",
        avariaUnidades[code] || "",
      ].some((v) => v.trim() !== ""),
    [
      pallets,
      lastros,
      fardos,
      unidades,
      pickingPallets,
      pickingLastros,
      pickingFardos,
      pickingUnidades,
      avariaPallets,
      avariaLastros,
      avariaFardos,
      avariaUnidades,
    ]
  )

  const filledCount = useMemo(
    () => allItems.filter((item) => hasAnyValue(item.reduzido)).length,
    [allItems, hasAnyValue]
  )

  const unfilledItems = useMemo(
    () => sortedItems.filter((item) => !hasAnyValue(item.reduzido)),
    [sortedItems, hasAnyValue]
  )

  const missingValidCount = useMemo(
    () =>
      missingCodes.filter((code) => allItems.some((item) => item.reduzido === code))
        .length,
    [missingCodes, allItems]
  )

  const totalCatalogCount = allItems.length
  const completedCount = Math.min(totalCatalogCount, filledCount + missingValidCount)
  const progressPercent = totalCatalogCount
    ? Math.round((completedCount / totalCatalogCount) * 100)
    : 0

  useEffect(() => {
    if (missingCodes.length) {
      setMissingCodes((prev) => prev.filter((code) => !hasAnyValue(code)))
    }
  }, [missingCodes.length, hasAnyValue])

  const importCodesList = useCallback(
    (rawCodes: string[]) => {
      const unique = Array.from(
        new Set(rawCodes.map((c) => c.replace(/\D+/g, "")).filter(Boolean))
      )
      if (!unique.length) return 0
      const valid = unique.filter((code) => itemsByCode.has(code))
      if (!valid.length) return 0
      setSelectedCodes((prev) => {
        const set = new Set(prev)
        valid.forEach((c) => set.add(c))
        return Array.from(set)
      })
      return valid.length
    },
    [itemsByCode]
  )

  const handleQuickAddCode = () => {
    const code = quickCodeInput.replace(/\D+/g, "")
    if (!code) return
    if (importCodesList([code])) {
      showToast("Item adicionado.")
      setQuickCodeInput("")
      setSearchQuery("")
    } else {
      showToast("Codigo nao encontrado no banco.")
    }
  }

  const stopScanner = useCallback(() => {
    startingCameraRef.current = false
    activeCameraRef.current = false
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setScannerReady(false)
  }, [])

  const loadDevices = useCallback(async () => {
    if (navigator.mediaDevices?.enumerateDevices) {
      try {
        const all = (await navigator.mediaDevices.enumerateDevices()).filter(
          (d) => d.kind === "videoinput"
        )
        const rear = all.filter((d) => /back|rear|environment/i.test(d.label))
        const list = rear.length ? rear : all
        camerasRef.current = list
        setCameras(list)
        setCameraIndex((prev) =>
          list.length === 0 ? 0 : Math.min(prev, list.length - 1)
        )
      } catch {
        // ignore
      }
    }
  }, [])

  const handleSaveCustomProduct = async () => {
    setCustomFormError("")
    const code = customCode.replace(/\D+/g, "")
    const desc = customDesc.trim()
    const palTotal = evaluateExpression(customPalletTotal || "0")
    const las = evaluateExpression(customLastro || "0")
    const taraVal = Number.parseFloat(customTaraKg.replace(",", ".")) || 0

    if (!code || !desc) {
      setCustomFormError("Preencha codigo e nome do produto.")
      return
    }

    const newItem: StockItem = {
      reduzido: code,
      descricao: desc,
      palletTotal: Math.max(0, palTotal),
      lastro: Math.max(0, las),
      tipoUnidade: customTipoUnidade,
      taraKg: Math.max(0, taraVal),
    }

    try {
      const res = await fetch("/api/estoque-itens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Falha ao salvar item.")
      }
      setCustomItems((prev) => [
        newItem,
        ...prev.filter((i) => i.reduzido !== code),
      ])
      setDbItems((prev) => [newItem, ...prev.filter((i) => i.reduzido !== code)])
      selectItemCode(code)
      showToast("Produto salvo no banco de dados!")
      setCustomCode("")
      setCustomDesc("")
      setCustomPalletTotal("")
      setCustomLastro("")
      setCustomTaraKg("")
      setShowCustomForm(false)
    } catch (err) {
      console.error("Save item error:", err)
      setCustomFormError("Nao foi possivel salvar no banco.")
    }
  }

  // Importar vários produtos de uma vez para o Banco de Dados
  const handleBulkDatabaseImport = async () => {
    const lines = bulkDbText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
    if (!lines.length) {
      showToast("Cole ao menos uma linha para cadastrar.")
      return
    }

    const parsedItems: StockItem[] = []
    lines.forEach((line, idx) => {
      // Aceita formato: "codigo;descricao;unidade;tara" ou "codigo - descricao" ou apenas "descricao"
      const parts = line.includes(";")
        ? line.split(";").map((p) => p.trim())
        : line.includes("\t")
        ? line.split("\t").map((p) => p.trim())
        : null

      if (parts && parts.length >= 2) {
        const code = parts[0].replace(/\D+/g, "") || String(1000 + idx + 1)
        const descricao = parts[1]
        const tipoUnidade = (
          ["cx", "kg", "sc", "bdj", "dz", "un"].includes(
            (parts[2] || "").toLowerCase()
          )
            ? (parts[2] || "").toLowerCase()
            : "kg"
        ) as TipoUnidade
        const taraKg = Number.parseFloat((parts[3] || "0").replace(",", ".")) || 0
        if (descricao) {
          parsedItems.push({
            reduzido: code,
            descricao,
            palletTotal: 0,
            lastro: 0,
            tipoUnidade,
            taraKg,
          })
        }
      } else {
        const match = line.match(/^(\d+)\s*[-–:]?\s*(.+)$/)
        if (match) {
          parsedItems.push({
            reduzido: match[1],
            descricao: match[2].trim(),
            palletTotal: 0,
            lastro: 0,
            tipoUnidade: "kg",
            taraKg: 0,
          })
        }
      }
    })

    if (!parsedItems.length) {
      showToast("Use o formato: codigo;descricao;unidade;taraKg")
      return
    }

    setIsImportingDb(true)
    try {
      const res = await fetch("/api/estoque-itens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: parsedItems }),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Erro ao importar lote.")
      }
      if (Array.isArray(data.items)) {
        setDbItems(data.items)
      }
      showToast(`${parsedItems.length} produto(s) cadastrado(s) no banco!`)
      setBulkDbText("")
      setShowBulkDbImport(false)
    } catch (err) {
      console.error("Bulk DB import error:", err)
      showToast("Erro ao salvar lote no banco.")
    } finally {
      setIsImportingDb(false)
    }
  }

  const generatePdf = () => {
    const doc = new SimpleA4Pdf()
    const pageHeight = doc.internal.pageSize.getHeight()
    const titleBase = "Contagem de estoque - Hortigranjeiros"
    const dateLabel = date || "Sem data"
    const contadorLabel = contador.trim() || "Sem contador"
    const scopeLabel = scope === "matriz" ? "Matriz" : "Filial"
    const maxDescWidth = 96

    const renderHeaderRow = (y: number) => {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.text("COD", 10, y)
      doc.text("PRODUTO", 28, y)
      doc.text("CAIXAS", 132, y)
      doc.text("SACOS", 154, y)
      doc.text("TOTAL", 174, y)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      return y + 5
    }

    const renderSection = (
      sectionTitle: string,
      itemsList: StockItem[],
      extractor: (item: StockItem) => {
        caixasValue: number
        sacosValue: number
        totalValue: number
      },
      newPage: boolean
    ) => {
      if (newPage) doc.addPage()
      doc.setFont("helvetica", "bold")
      doc.setFontSize(14)
      doc.text(sectionTitle, 10, 14)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.text(`Data: ${dateLabel}`, 10, 22)
      doc.text(`Contador: ${contadorLabel}`, 10, 27)
      doc.text(`Unidade: ${scopeLabel}`, 10, 32)

      let y = 40
      y = renderHeaderRow(y)

      itemsList.forEach((item) => {
        const { caixasValue, sacosValue, totalValue } = extractor(item)
        const mat = maturacao[item.reduzido]
        const matTag =
          mat && mat !== "firme" ? ` [${MATURACAO_LABELS[mat].badge}]` : ""
        const descLines = doc.splitTextToSize(
          `${item.descricao}${matTag}`,
          maxDescWidth
        )
        const rowHeight = Math.max(6 * descLines.length, 6)
        if (y + rowHeight > pageHeight - 10) {
          doc.addPage()
          y = renderHeaderRow(14)
        }
        doc.text(item.reduzido, 10, y)
        doc.text(descLines, 28, y)
        doc.text(String(caixasValue), 132, y)
        doc.text(String(sacosValue), 154, y)
        doc.text(String(totalValue), 174, y)
        y += rowHeight + 2
      })
    }

    renderSection(
      titleBase,
      orderedSelectedItems,
      (item) => ({
        caixasValue: calcItemCaixasTotal(item),
        sacosValue: calcItemSacosTotal(item),
        totalValue: calcItemGrandTotal(item),
      }),
      false
    )

    renderSection(
      `${titleBase} - Picking`,
      orderedSelectedItems,
      (item) => ({
        caixasValue: evaluateExpression(pickingFardos[item.reduzido] || "0"),
        sacosValue: evaluateExpression(pickingPallets[item.reduzido] || "0"),
        totalValue: calcAreaTotal(item, pickingFardos, pickingPallets),
      }),
      true
    )

    renderSection(
      `${titleBase} - Avarias`,
      orderedSelectedItems,
      (item) => ({
        caixasValue: evaluateExpression(avariaFardos[item.reduzido] || "0"),
        sacosValue: evaluateExpression(avariaPallets[item.reduzido] || "0"),
        totalValue: calcAreaTotal(item, avariaFardos, avariaPallets),
      }),
      true
    )

    // Seção de Alerta FEFO / Giro Imediato
    const criticos = orderedSelectedItems.filter(
      (i) => maturacao[i.reduzido] === "critico" || maturacao[i.reduzido] === "maduro"
    )
    if (criticos.length) {
      doc.addPage()
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.text("Alerta de Maturacao / Giro Prioritario (FEFO)", 10, 14)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      let y = 24
      criticos.forEach((item) => {
        const st = maturacao[item.reduzido] || "firme"
        const line = `${item.reduzido} - ${item.descricao} | Status: ${
          MATURACAO_LABELS[st].badge
        } | Total: ${calcItemGrandTotal(item)} ${(
          item.tipoUnidade || "cx"
        ).toUpperCase()}`
        doc.splitTextToSize(line, 190).forEach((part) => {
          if (y > pageHeight - 10) {
            doc.addPage()
            y = 14
          }
          doc.text(part, 10, y)
          y += 6
        })
      })
    }

    const unselectedItems = allItems.filter(
      (item) => !selectedCodes.includes(item.reduzido)
    )
    if (unselectedItems.length) {
      doc.addPage()
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.text("Itens faltantes", 10, 14)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      let y = 24
      unselectedItems.forEach((item) => {
        const line = `${item.reduzido} - ${item.descricao}`
        doc.splitTextToSize(line, 190).forEach((part) => {
          if (y > pageHeight - 10) {
            doc.addPage()
            y = 14
          }
          doc.text(part, 10, y)
          y += 6
        })
      })
    }

    const safeDate = dateLabel.replace(/\//g, "-")
    return {
      doc,
      fileName: `estoque_${scope}_${safeDate}.pdf`,
    }
  }

  const handleSendTelegramPdf = async () => {
    setTelegramMessage("")
    try {
      const { doc, fileName } = generatePdf()
      const blob = doc.output("blob")
      const formData = new FormData()
      formData.append("file", blob, fileName)

      const savedBot = localStorage.getItem("telegram_bot")
      const savedChat = localStorage.getItem("telegram_chat")
      if (savedBot) formData.append("botToken", savedBot)
      if (savedChat) formData.append("chatId", savedChat)

      const res = await fetch("/api/telegram/estoque", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Falha ao enviar.")
      }
      setTelegramStatus("success")
      setTelegramMessage("PDF enviado ao Telegram.")
    } catch (err) {
      console.error("Telegram send error:", err)
      setTelegramStatus("error")
      setTelegramMessage("Nao foi possivel enviar ao Telegram.")
    }
  }

  const handleSendEmailPdf = async () => {
    setTelegramMessage("")
    try {
      const { doc, fileName } = generatePdf()
      const blob = doc.output("blob")
      const formData = new FormData()
      formData.append("file", blob, fileName)
      formData.append("type", "estoque")
      formData.append("unit", scope)

      setTelegramStatus("info")
      setTelegramMessage("Enviando relatório por e-mail via SMTP...")

      const res = await fetch("/api/email/send-report", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Falha ao enviar por e-mail.")
      }
      setTelegramStatus("success")
      setTelegramMessage(data?.message || "PDF de estoque enviado com sucesso por e-mail!")
    } catch (err: any) {
      console.error("Email send error:", err)
      setTelegramStatus("error")
      setTelegramMessage(err?.message || "Não foi possível enviar por e-mail.")
    }
  }

  // Carregar catálogo de itens exclusivamente do banco de dados
  useEffect(() => {
    let active = true
    ;(async () => {
      setIsLoadingItems(true)
      setItemsError("")
      try {
        const res = await fetch("/api/estoque-itens")
        const data = await res.json()
        if (!res.ok || !data?.ok || !Array.isArray(data.items)) {
          throw new Error(data?.error || "Falha ao carregar itens.")
        }
        if (active) {
          const map = new Map<string, StockItem>()
          data.items.forEach((item: StockItem) => {
            if (item?.reduzido) map.set(String(item.reduzido), item)
          })
          setDbItems(Array.from(map.values()))
        }
      } catch (err) {
        console.error("Items load error:", err)
        if (active) setItemsError("Nao foi possivel carregar os itens do banco.")
      } finally {
        if (active) setIsLoadingItems(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // Carregar contagem existente quando data ou unidade mudarem
  useEffect(() => {
    if (!date) return
    let active = true
    ;(async () => {
      setIsLoadingRecord(true)
      setLoadRecordError("")
      try {
        const params = new URLSearchParams({
          date,
          scope,
          limit: "1",
        })
        const res = await fetch(`/api/estoque?${params.toString()}`)
        const data = await res.json()
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "Falha ao carregar contagem.")
        }
        const record = Array.isArray(data.records) ? data.records[0] : null
        if (!active) return

        if (record) {
          setContador(record.contador || "")
          const recItems = Array.isArray(record.items) ? record.items : []
          setSelectedCodes(recItems.map((i: any) => String(i.reduzido)))

          const nextPal: Record<string, string> = {}
          const nextLas: Record<string, string> = {}
          const nextFar: Record<string, string> = {}
          const nextUni: Record<string, string> = {}
          const nextPickPal: Record<string, string> = {}
          const nextPickLas: Record<string, string> = {}
          const nextPickFar: Record<string, string> = {}
          const nextPickUni: Record<string, string> = {}
          const nextAvaPal: Record<string, string> = {}
          const nextAvaLas: Record<string, string> = {}
          const nextAvaFar: Record<string, string> = {}
          const nextAvaUni: Record<string, string> = {}
          const nextMat: Record<string, MaturacaoStatus> = {}

          recItems.forEach((i: any) => {
            const c = String(i.reduzido)
            if (i.pallets !== undefined) nextPal[c] = String(i.pallets || "")
            if (i.lastros !== undefined) nextLas[c] = String(i.lastros || "")
            if (i.fardos !== undefined) nextFar[c] = String(i.fardos || "")
            if (i.unidades !== undefined) nextUni[c] = String(i.unidades || "")
            if (i.pickingPallets !== undefined) nextPickPal[c] = String(i.pickingPallets || "")
            if (i.pickingLastros !== undefined) nextPickLas[c] = String(i.pickingLastros || "")
            if (i.pickingFardos !== undefined) nextPickFar[c] = String(i.pickingFardos || "")
            if (i.pickingUnidades !== undefined) nextPickUni[c] = String(i.pickingUnidades || "")
            if (i.avariaPallets !== undefined) nextAvaPal[c] = String(i.avariaPallets || "")
            if (i.avariaLastros !== undefined) nextAvaLas[c] = String(i.avariaLastros || "")
            if (i.avariaFardos !== undefined) nextAvaFar[c] = String(i.avariaFardos || "")
            if (i.avariaUnidades !== undefined) nextAvaUni[c] = String(i.avariaUnidades || "")
            if (i.maturacao) nextMat[c] = i.maturacao as MaturacaoStatus
          })

          setPallets(nextPal)
          setLastros(nextLas)
          setFardos(nextFar)
          setUnidades(nextUni)
          setPickingPallets(nextPickPal)
          setPickingLastros(nextPickLas)
          setPickingFardos(nextPickFar)
          setPickingUnidades(nextPickUni)
          setAvariaPallets(nextAvaPal)
          setAvariaLastros(nextAvaLas)
          setAvariaFardos(nextAvaFar)
          setAvariaUnidades(nextAvaUni)
          setMaturacao(nextMat)
        } else {
          setLoadRecordError("Nenhuma contagem encontrada para esta data.")
          setSelectedCodes([])
          setPallets({})
          setLastros({})
          setFardos({})
          setUnidades({})
          setPickingPallets({})
          setPickingLastros({})
          setPickingFardos({})
          setPickingUnidades({})
          setAvariaPallets({})
          setAvariaLastros({})
          setAvariaFardos({})
          setAvariaUnidades({})
          setMaturacao({})
        }
      } catch (err) {
        console.error("Load record error:", err)
        if (active) setLoadRecordError("Nao foi possivel carregar a contagem.")
      } finally {
        if (active) setIsLoadingRecord(false)
      }
    })()
    return () => {
      active = false
    }
  }, [date, scope])

  // Scanner de código de barras
  useEffect(() => {
    if (menuOpen && scannerEnabled) {
      loadDevices()
    }
  }, [menuOpen, scannerEnabled, loadDevices])

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!menuOpen || !scannerEnabled) {
      stopScanner()
      setScannerError("")
      return
    }
    let cancelled = false
    ;(async () => {
      if (startingCameraRef.current) return
      if (activeCameraRef.current && streamRef.current?.active) {
        setScannerReady(true)
        return
      }
      startingCameraRef.current = true
      setScannerError("")
      setScannerReady(false)

      if (!("mediaDevices" in navigator) || !navigator.mediaDevices?.getUserMedia) {
        setScannerError("Camera nao suportada neste dispositivo.")
        startingCameraRef.current = false
        return
      }

      try {
        if (!camerasRef.current.length) await loadDevices()
        const chosenCamera = camerasRef.current[cameraIndex]
        let stream: MediaStream | null = null
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: chosenCamera
              ? { deviceId: { exact: chosenCamera.deviceId } }
              : { facingMode: { ideal: "environment" } },
            audio: false,
          })
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          })
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          startingCameraRef.current = false
          return
        }

        streamRef.current = stream
        activeCameraRef.current = true
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          try {
            await videoRef.current.play()
          } catch {
            setScannerError("Toque na tela para liberar a camera.")
          }
        }
        setScannerReady(true)
        startingCameraRef.current = false

        const BarcodeDetectorClass = (window as any).BarcodeDetector
        if (!BarcodeDetectorClass) {
          setScannerError("Leitor de codigo de barras indisponivel neste navegador.")
          return
        }

        const detector = new BarcodeDetectorClass({
          formats: ["code_128", "ean_13", "ean_8", "upc_a", "upc_e", "itf"],
        })

        const detectLoop = async () => {
          if (videoRef.current && streamRef.current) {
            try {
              const results = await detector.detect(videoRef.current)
              if (results.length) {
                const rawCode = results[0]?.rawValue?.trim()
                if (rawCode) {
                  const now = Date.now()
                  const last = lastScanRef.current
                  if (!last || last.code !== rawCode || now - last.at > 1500) {
                    lastScanRef.current = { code: rawCode, at: now }
                    const found = allItems.find((item) => item.reduzido === rawCode)
                    if (found) {
                      selectItemCode(found.reduzido)
                      setSearchQuery("")
                    } else {
                      setSearchQuery(rawCode)
                      showToast("Codigo nao encontrado no catalogo.")
                    }
                  }
                }
              }
            } catch {
              // ignore frame errors
            }
            rafRef.current = requestAnimationFrame(detectLoop)
          }
        }
        rafRef.current = requestAnimationFrame(detectLoop)
      } catch {
        setScannerError("Nao foi possivel acessar a camera.")
        startingCameraRef.current = false
        activeCameraRef.current = false
      }
    })()

    return () => {
      cancelled = true
      stopScanner()
    }
  }, [menuOpen, scannerEnabled, allItems, cameraIndex, stopScanner, loadDevices, selectItemCode])

  useEffect(() => {
    if (menuOpen && scannerEnabled && prevCameraIndexRef.current !== cameraIndex) {
      prevCameraIndexRef.current = cameraIndex
      stopScanner()
      setScannerError("")
      activeCameraRef.current = false
      startingCameraRef.current = false
    }
  }, [cameraIndex, menuOpen, scannerEnabled, stopScanner])

  useEffect(() => {
    const onScroll = () => {
      setAtBottom(
        window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 8
      )
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const handleSaveCount = async () => {
    setSaveError("")
    setSaveSuccess("")
    if (!date || !contador.trim()) {
      setSaveError("Informe data e contador.")
      return
    }
    if (!showProgressModal) {
      setShowProgressModal(true)
      return
    }

    setIsSaving(true)
    try {
      const payloadItems = orderedSelectedItems.map((item) => ({
        reduzido: item.reduzido,
        descricao: item.descricao,
        pallets: pallets[item.reduzido] || "",
        lastros: lastros[item.reduzido] || "",
        fardos: fardos[item.reduzido] || "",
        unidades: (item.unidade && unidades[item.reduzido]) || "",
        pickingPallets: pickingPallets[item.reduzido] || "",
        pickingLastros: pickingLastros[item.reduzido] || "",
        pickingFardos: pickingFardos[item.reduzido] || "",
        pickingUnidades: (item.unidade && pickingUnidades[item.reduzido]) || "",
        avariaPallets: avariaPallets[item.reduzido] || "",
        avariaLastros: avariaLastros[item.reduzido] || "",
        avariaFardos: avariaFardos[item.reduzido] || "",
        avariaUnidades: (item.unidade && avariaUnidades[item.reduzido]) || "",
        maturacao: maturacao[item.reduzido] || "firme",
        faltante: missingCodes.includes(item.reduzido),
        quantidadeTotal: calcItemGrandTotal(item),
      }))

      const res = await fetch("/api/estoque", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          date,
          contador: contador.trim(),
          items: payloadItems,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Falha ao salvar.")
      }
      setSaveSuccess("Contagem salva com sucesso.")
      setShowProgressModal(false)
    } catch (err) {
      console.error("Stock save error:", err)
      setSaveError("Nao foi possivel salvar a contagem.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={`stock-shell${fullScreenMode ? " full" : ""}`}>
      <div className={`stock-card${fullScreenMode ? " full" : ""}`}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            padding: "16px 18px",
            borderRadius: "14px",
            backgroundImage:
              "linear-gradient(135deg, rgba(15, 23, 42, 0.82) 0%, rgba(26, 42, 108, 0.75) 100%), url('/images/estoque-bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            boxShadow: "0 10px 24px rgba(0, 0, 0, 0.18)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img
              src="/images/maia-logo.jpg"
              alt="Maia Distribuidor Hortifrutigranjeiros"
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
                className="stock-title"
                style={{ textAlign: "left", color: "#ffffff" }}
              >
                📦 Gerenciador de Estoque — Maia Hortifrutigranjeiros
              </div>
              <div
                className="stock-subtitle"
                style={{ textAlign: "left", color: "#e2e8f0" }}
              >
                Contagem direta em Caixas e Sacos (sem lastro ou avulsos)
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <Link
              href="/admin"
              style={{
                background: "rgba(15, 23, 42, 0.95)",
                color: "#818cf8",
                border: "1px solid rgba(129, 140, 248, 0.4)",
                padding: "9px 14px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}
            >
              ⚙️ Painel Admin
            </Link>
            <Link
              href="/"
              style={{
                background: "rgba(255, 255, 255, 0.95)",
                color: "#1a2a6c",
                padding: "9px 14px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}
            >
              🥬 Ir para Controle de Perdas
            </Link>
          </div>
        </div>

        <div className="stock-form">
          <div>
            <label htmlFor="estoque-data">Data</label>
            <input
              id="estoque-data"
              type="date"
              value={(() => {
                if (!date) return ""
                const [d, m, y] = date.split("/")
                return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
              })()}
              onChange={(e) => {
                const val = e.target.value
                if (!val) {
                  setDate("")
                  return
                }
                const [y, m, d] = val.split("-")
                setDate(`${d}/${m}/${y}`)
              }}
            />
          </div>

          <div>
            <label htmlFor="estoque-contador">Contador</label>
            <input
              id="estoque-contador"
              type="text"
              value={contador}
              onChange={(e) => setContador(e.target.value)}
              placeholder="Nome do contador"
            />
          </div>

          <div>
            <label htmlFor="estoque-unidade">Unidade</label>
            <select
              id="estoque-unidade"
              value={scope}
              onChange={(e) => setScope(e.target.value as "filial" | "matriz")}
            >
              <option value="filial">Filial</option>
              <option value="matriz">Matriz</option>
            </select>
          </div>

          <label className="stock-toggle">
            <input
              type="checkbox"
              checked={compactMode}
              onChange={(e) => setCompactMode(e.target.checked)}
            />
            Lista compacta
          </label>

          <label className="stock-toggle">
            <input
              type="checkbox"
              checked={fullScreenMode}
              onChange={(e) => setFullScreenMode(e.target.checked)}
            />
            Usar tela toda
          </label>
        </div>

        <div className="stock-area-tabs">
          <button
            type="button"
            onClick={() => setActiveTab("principal")}
            className={activeTab === "principal" ? "stock-area-tab active" : "stock-area-tab"}
          >
            Principal
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("picking")}
            className={activeTab === "picking" ? "stock-area-tab active" : "stock-area-tab"}
          >
            Picking
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("avarias")}
            className={activeTab === "avarias" ? "stock-area-tab active" : "stock-area-tab"}
          >
            Avarias / Perdas
          </button>
        </div>

        {activeTab === "avarias" && (
          <button
            type="button"
            onClick={handleImportPerdasDoDia}
            className="stock-tertiary"
            style={{ width: "100%", padding: "10px" }}
          >
            🔄 Importar Perdas do Dia (lançadas no Controle de Perdas)
          </button>
        )}

        <div className="stock-menu">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="stock-primary"
          >
            {menuOpen
              ? "Fechar catálogo do banco"
              : `Selecionar / Gerenciar Produtos do Banco (${allItems.length})`}
          </button>

          {menuOpen && (
            <div className="stock-menu-body">
              <div className="stock-search-row">
                <input
                  type="text"
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      const first = filteredMenuItems[0]
                      if (first) {
                        selectItemCode(first.reduzido)
                        setSearchQuery("")
                      }
                    }
                  }}
                  placeholder="Pesquisar item ou reduzido no banco"
                />

                <div className="stock-quick-add">
                  <input
                    type="text"
                    inputMode="tel"
                    value={quickCodeInput}
                    onChange={(e) =>
                      setQuickCodeInput(e.target.value.replace(/\D+/g, ""))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleQuickAddCode()
                      }
                    }}
                    placeholder="Digite o codigo reduzido e Enter"
                  />
                  <button
                    type="button"
                    onClick={handleQuickAddCode}
                    className="stock-tertiary"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              <div
                className="stock-search-actions"
                style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
              >
                <label className="scanner-toggle">
                  <input
                    type="checkbox"
                    checked={scannerEnabled}
                    onChange={(e) => setScannerEnabled(e.target.checked)}
                  />
                  Leitor de codigo de barras
                </label>

                <button
                  type="button"
                  onClick={() => setShowCustomForm((prev) => !prev)}
                  className="stock-tertiary"
                >
                  {showCustomForm ? "Fechar cadastro" : "➕ Cadastrar produto no Banco"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowBulkDbImport((prev) => !prev)}
                  className="stock-tertiary"
                >
                  {showBulkDbImport
                    ? "Fechar importação BD"
                    : "📥 Importar planilha/lista para o Banco"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowBulkPaste((prev) => !prev)}
                  className="stock-tertiary"
                >
                  {showBulkPaste ? "Fechar colagem" : "📋 Colar códigos para contagem"}
                </button>
              </div>

              {showBulkDbImport && (
                <div className="stock-bulk">
                  <strong style={{ fontSize: "12px", color: "#1a2a6c" }}>
                    Cadastrar produtos em lote no Banco de Dados
                  </strong>
                  <textarea
                    value={bulkDbText}
                    onChange={(e) => setBulkDbText(e.target.value)}
                    placeholder={
                      "Um produto por linha no formato:\ncodigo;descricao;unidade;taraKg\nExemplo:\n1001;ABACATE 20 KG;cx;0\n1035;BATATA EXTRA;sc;0"
                    }
                  />
                  <div className="stock-bulk-actions">
                    <button
                      type="button"
                      disabled={isImportingDb}
                      onClick={handleBulkDatabaseImport}
                      className="stock-primary"
                    >
                      {isImportingDb ? "Salvando no banco..." : "Salvar lote no Banco"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBulkDbText("")
                        setShowBulkDbImport(false)
                      }}
                      className="stock-secondary"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {showBulkPaste && (
                <div className="stock-bulk">
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder="Cole uma lista de codigos ja cadastrados para selecionar na contagem."
                  />
                  <div className="stock-bulk-actions">
                    <button
                      type="button"
                      onClick={() => {
                        const matches = Array.from(bulkText.matchAll(/\d+/g)).map(
                          (m) => m[0]
                        )
                        const added = importCodesList(matches)
                        if (added) {
                          showToast(`${added} itens selecionados.`)
                          setBulkText("")
                          setShowBulkPaste(false)
                        } else {
                          showToast("Nenhum codigo valido encontrado no banco.")
                        }
                      }}
                      className="stock-primary"
                    >
                      Selecionar códigos
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBulkText("")
                        setShowBulkPaste(false)
                      }}
                      className="stock-secondary"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {showCustomForm && (
                <div className="custom-form">
                  <div
                    className="custom-grid"
                    style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}
                  >
                    <input
                      type="text"
                      inputMode="tel"
                      value={customCode}
                      onChange={(e) =>
                        setCustomCode(e.target.value.replace(/\D+/g, ""))
                      }
                      placeholder="Codigo (reduzido)"
                    />
                    <input
                      type="text"
                      value={customDesc}
                      onChange={(e) => setCustomDesc(e.target.value)}
                      placeholder="Nome do Produto (ex: ABACATE 20 KG)"
                    />
                    <select
                      value={customTipoUnidade}
                      onChange={(e) =>
                        setCustomTipoUnidade(e.target.value as TipoUnidade)
                      }
                      style={{
                        border: "1px solid #1a2a6c33",
                        borderRadius: "10px",
                        padding: "10px",
                        fontSize: "12px",
                      }}
                    >
                      <option value="cx">Embalagem: Caixa (cx)</option>
                      <option value="sc">Embalagem: Saco (sc)</option>
                      <option value="kg">Unidade: Quilo (kg)</option>
                      <option value="bdj">Unidade: Bandeja (bdj)</option>
                      <option value="dz">Unidade: Dúzia (dz)</option>
                      <option value="un">Unidade: Unidade (un)</option>
                    </select>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={customTaraKg}
                      onChange={(e) => setCustomTaraKg(e.target.value)}
                      placeholder="Tara por caixa (kg) opcional"
                    />
                  </div>
                  {customFormError && (
                    <div className="custom-error">{customFormError}</div>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveCustomProduct}
                    className="stock-primary"
                  >
                    💾 Salvar produto no Banco de Dados
                  </button>
                </div>
              )}

              {scannerEnabled && (
                <div className="scanner-panel">
                  <div className="scanner-header">
                    <div className="scanner-status">
                      <strong>Scanner ativo</strong>
                      <span>
                        {scannerReady ? "Aponte para o codigo." : "Inicializando..."}
                      </span>
                    </div>
                    {cameras.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setCameraIndex((prev) =>
                            cameras.length ? (prev + 1) % cameras.length : 0
                          )
                        }
                        className="scanner-switch"
                      >
                        Alternar camera
                      </button>
                    )}
                  </div>
                  {scannerError && (
                    <div className="scanner-error">{scannerError}</div>
                  )}
                  <div className="scanner-video-wrap">
                    <video ref={videoRef} playsInline muted className="scanner-video" />
                  </div>
                </div>
              )}

              {toastMessage && <div className="scanner-toast">{toastMessage}</div>}
              {isLoadingItems && (
                <div className="status">Carregando itens do banco...</div>
              )}
              {itemsError && <div className="status error">{itemsError}</div>}

              <div className="stock-menu-actions">
                <button type="button" onClick={() => setSelectedCodes([])}>
                  Limpar selecao
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCodes(sortedItems.map((item) => item.reduzido))
                  }
                >
                  Selecionar todos ({sortedItems.length})
                </button>
              </div>

              <div className="stock-menu-list">
                {filteredMenuItems.length === 0 ? (
                  <div style={{ padding: "14px", textAlign: "center", fontSize: "12px", color: "#666" }}>
                    Nenhum produto cadastrado no banco de dados. Use &quot;Cadastrar produto no Banco&quot; ou &quot;Importar planilha/lista para o Banco&quot;.
                  </div>
                ) : (
                  filteredMenuItems.map((item) => {
                    const isSelected = selectedCodes.includes(item.reduzido)
                    return (
                      <div
                        key={item.reduzido}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          borderBottom: "1px solid #e5e7eb",
                          background: isSelected ? "#dfe7ff" : "#fff",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              scrollToItem(item.reduzido)
                            } else {
                              selectItemCode(item.reduzido)
                            }
                          }}
                          className={
                            isSelected ? "stock-menu-item selected" : "stock-menu-item"
                          }
                          style={{ borderBottom: "none", flex: 1 }}
                        >
                          <strong>{item.reduzido}</strong> - {item.descricao}{" "}
                          <span style={{ color: "#5b678f", fontSize: "11px" }}>
                            ({(item.tipoUnidade || "cx").toUpperCase()})
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteFromDatabase(item.reduzido, item.descricao)
                          }
                          title="Excluir produto do banco"
                          style={{
                            width: "auto",
                            background: "transparent",
                            color: "#dc3545",
                            border: "none",
                            padding: "8px 12px",
                            fontSize: "12px",
                            margin: 0,
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {selectedItems.length === 0 && (
          <div className="stock-empty">
            Nenhum item selecionado para contagem.
          </div>
        )}

        {selectedItems.length > 0 && (
          <div className="stock-section-title">
            Itens selecionados ({selectedItems.length})
          </div>
        )}

        {compactMode ? (
          <div className="compact-list">
            {orderedSelectedItems.map((item) => {
              const total = calcItemGrandTotal(item)
              const isExpanded = expandedCompact[item.reduzido] === true
              const unitTag = (item.tipoUnidade || "cx").toUpperCase()
              return (
                <div
                  key={item.reduzido}
                  ref={(el) => {
                    itemRefs.current[item.reduzido] = el
                  }}
                  className="compact-row"
                >
                  <div className="compact-main">
                    <div className="compact-info">
                      <strong>
                        {item.reduzido} ({unitTag})
                      </strong>
                      <span>{item.descricao}</span>
                    </div>
                    <div className="compact-actions">
                      <div className="compact-total">
                        <label>Total ({unitTag})</label>
                        <div className="stepper">
                          <button
                            type="button"
                            onClick={() => stepCompactDirectValue(item.reduzido, -1)}
                          >
                            -
                          </button>
                          <input
                            type="text"
                            placeholder="Ex: 10+5, 4*12"
                            value={getCompactDirectValue(item.reduzido)}
                            onChange={(e) => {
                              const code = item.reduzido
                              setCompactDirectValue(
                                code,
                                sanitizeExpression(e.target.value)
                              )
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                setCompactDirectValue(
                                  item.reduzido,
                                  normalizeNumericString(getCompactDirectValue(item.reduzido))
                                )
                              }
                            }}
                            onBlur={(e) =>
                              setCompactDirectValue(
                                item.reduzido,
                                normalizeNumericString(e.target.value)
                              )
                            }
                          />
                          <button
                            type="button"
                            onClick={() => stepCompactDirectValue(item.reduzido, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCompact((prev) => ({
                            ...prev,
                            [item.reduzido]: !isExpanded,
                          }))
                        }
                        className="compact-toggle"
                      >
                        {isExpanded ? "Ocultar" : "Detalhar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSelectedCode(item.reduzido)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="compact-details">
                      {renderCurrentTabFields(item)}
                      <div className="stock-total">
                        📦 Caixas: {calcItemCaixasTotal(item)} | 🛍️ Sacos:{" "}
                        {calcItemSacosTotal(item)} — Quantidade Total:{" "}
                        {Number.isFinite(total) ? total : 0}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="stock-list">
            {sortedSelectedItems.map((item) => {
              const total = calcItemGrandTotal(item)
              const unitTag = (item.tipoUnidade || "cx").toUpperCase()
              const currentMat = maturacao[item.reduzido] || "firme"
              return (
                <div
                  key={item.reduzido}
                  ref={(el) => {
                    itemRefs.current[item.reduzido] = el
                  }}
                  className="stock-item"
                >
                  <div className="stock-item-header">
                    <div>
                      <strong>{item.reduzido}</strong> - {item.descricao}{" "}
                      <span style={{ color: "#5b678f" }}>({unitTag})</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <select
                        value={currentMat}
                        onChange={(e) =>
                          setMaturacao((prev) => ({
                            ...prev,
                            [item.reduzido]: e.target.value as MaturacaoStatus,
                          }))
                        }
                        style={{
                          width: "auto",
                          padding: "4px 8px",
                          fontSize: "11px",
                          borderRadius: "8px",
                          margin: 0,
                          border: "1px solid #cbd5e1",
                          background:
                            currentMat === "critico"
                              ? "#fee2e2"
                              : currentMat === "maduro"
                              ? "#fef9c3"
                              : "#f0fdf4",
                          color: "#111",
                        }}
                      >
                        <option value="firme">🟢 Firme / Verde</option>
                        <option value="maduro">🟡 Ponto de Venda</option>
                        <option value="critico">🔴 Giro Imediato</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeSelectedCode(item.reduzido)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                  <div className="stock-fields">{renderCurrentTabFields(item)}</div>
                  <div className="stock-total">
                    📦 Caixas: {calcItemCaixasTotal(item)} | 🛍️ Sacos:{" "}
                    {calcItemSacosTotal(item)} — Quantidade Total:{" "}
                    {Number.isFinite(total) ? total : 0}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {saveError && <div className="status error">{saveError}</div>}
        {saveSuccess && <div className="status success">{saveSuccess}</div>}
        {isLoadingRecord && <div className="status">Carregando contagem...</div>}
        {loadRecordError && <div className="status error">{loadRecordError}</div>}
        {telegramMessage && (
          <div
            className={`status ${
              telegramStatus === "success"
                ? "success"
                : telegramStatus === "error"
                ? "error"
                : ""
            }`}
          >
            {telegramMessage}
          </div>
        )}

        {showProgressModal && totalCatalogCount > 0 && (
          <div className="stock-progress">
            <div className="stock-progress-header">
              <strong>Progresso da contagem</strong>
              <span>
                {completedCount}/{totalCatalogCount} ({progressPercent}%)
              </span>
            </div>
            <div className="stock-progress-bar">
              <div
                style={{ width: `${progressPercent}%` }}
                className="stock-progress-fill"
              />
            </div>
            <div className="stock-progress-meta">
              <span>Preenchidos: {filledCount}</span>
              <span>Faltantes: {missingValidCount}</span>
              <span>
                Pendentes: {Math.max(0, totalCatalogCount - completedCount)}
              </span>
            </div>

            {unfilledItems.length > 0 && (
              <div className="stock-missing">
                <div className="stock-missing-title">
                  Selecione itens faltantes antes de salvar
                </div>
                <div className="stock-missing-list">
                  {unfilledItems.map((item) => {
                    const isChecked = missingCodes.includes(item.reduzido)
                    return (
                      <label key={item.reduzido} className="stock-missing-item">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const checked = e.target.checked
                            if (checked) selectItemCode(item.reduzido)
                            setMissingCodes((prev) =>
                              checked
                                ? Array.from(new Set([...prev, item.reduzido]))
                                : prev.filter((c) => c !== item.reduzido)
                            )
                          }}
                        />
                        <span>
                          <strong>{item.reduzido}</strong> - {item.descricao}
                        </span>
                        <button
                          type="button"
                          onClick={() => scrollToItem(item.reduzido)}
                        >
                          Ir
                        </button>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="stock-progress-actions">
              <button type="button" onClick={() => setShowProgressModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        )}

        <div className="stock-actions">
          {canSaveForDate && (
            <button
              type="button"
              onClick={handleSaveCount}
              disabled={isSaving}
              className="stock-primary"
            >
              {isSaving ? "Salvando..." : "Salvar contagem"}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const { doc, fileName } = generatePdf()
              doc.save(fileName)
            }}
            className="stock-secondary"
          >
            Baixar PDF
          </button>
          <button
            type="button"
            onClick={handleSendTelegramPdf}
            className="stock-secondary"
          >
            Enviar PDF Telegram
          </button>
          <button
            type="button"
            onClick={handleSendEmailPdf}
            className="stock-secondary"
          >
            ✉️ Enviar PDF E-mail (SMTP)
          </button>
        </div>

        {atBottom && (
          <button
            type="button"
            onClick={focusSearchInput}
            style={{
              position: "fixed",
              right: "16px",
              bottom: "16px",
              zIndex: 1200,
              border: "none",
              borderRadius: "999px",
              padding: "6px 10px",
              background: "#1a2a6c",
              color: "#fff",
              fontSize: "10px",
              fontWeight: 700,
              boxShadow: "0 8px 18px rgba(26,42,108,0.28)",
              cursor: "pointer",
              width: "auto",
            }}
          >
            Pesquisa
          </button>
        )}
      </div>

      <style jsx>{`
        .stock-shell {
          background-image: linear-gradient(rgba(15, 23, 42, 0.55), rgba(15, 23, 42, 0.68)), url('/images/estoque-bg.jpg');
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
          min-height: 100vh;
          padding: 20px 12px;
          width: 100%;
        }
        .stock-card {
          min-height: calc(100vh - 40px);
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.35);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          gap: 12px;
          padding: 16px;
          display: grid;
          max-width: 1000px;
          margin: 0 auto;
        }
        .stock-shell.full {
          background-image: linear-gradient(rgba(15, 23, 42, 0.55), rgba(15, 23, 42, 0.68)), url('/images/estoque-bg.jpg');
          padding: 0;
        }
        .stock-card.full {
          border-radius: 0;
          width: 100%;
          max-width: none;
          min-height: 100vh;
          padding: 20px 24px 28px;
        }
        .stock-title {
          color: #1a2a6c;
          text-align: center;
          letter-spacing: 0.04em;
          font-size: 18px;
          font-weight: 700;
        }
        .stock-subtitle {
          color: #5b678f;
          text-align: center;
          font-size: 12px;
        }
        .stock-section-title {
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #1a2a6c;
          margin-top: 4px;
          font-size: 12px;
          font-weight: 700;
        }
        .stock-form {
          gap: 8px;
          display: grid;
        }
        .stock-form label {
          color: #1a2a6c;
          font-size: 12px;
          font-weight: 600;
        }
        .stock-toggle {
          color: #1a2a6c;
          background: #eef1f8;
          border-radius: 10px;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
        }
        .stock-toggle input {
          accent-color: #1a2a6c;
          width: 16px;
          height: 16px;
          margin: 0;
        }
        .stock-area-tabs {
          background: #eef1f8;
          border-radius: 12px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          padding: 6px;
          display: grid;
        }
        .stock-area-tab {
          color: #1a2a6c;
          cursor: pointer;
          background: transparent;
          border: none;
          border-radius: 10px;
          padding: 8px 6px;
          font-size: 12px;
          font-weight: 700;
          margin-top: 0;
        }
        .stock-area-tab.active {
          color: #0b1b4a;
          background: #dfe7ff;
        }
        .stock-form input,
        .stock-form select {
          border: 1px solid #1a2a6c33;
          border-radius: 12px;
          padding: 12px;
          font-size: 14px;
        }
        .stock-primary {
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #fff;
          cursor: pointer;
          background: linear-gradient(135deg, #1a2a6c, #2b48a0);
          border: none;
          border-radius: 12px;
          padding: 12px;
          font-size: 13px;
          font-weight: 700;
        }
        .stock-menu,
        .stock-menu-body,
        .stock-search-row,
        .stock-quick-add,
        .stock-search-actions {
          gap: 8px;
          display: grid;
        }
        .scanner-toggle {
          color: #1a2a6c;
          background: #eef1f8;
          border-radius: 10px;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
        }
        .scanner-toggle input {
          accent-color: #1a2a6c;
          width: 16px;
          height: 16px;
          margin: 0;
        }
        .stock-tertiary {
          color: #1a2a6c;
          cursor: pointer;
          text-align: center;
          background: #dfe7ff;
          border: none;
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
        }
        .scanner-panel {
          background: #f8f9ff;
          border: 1px solid #1a2a6c33;
          border-radius: 12px;
          gap: 8px;
          padding: 10px;
          display: grid;
        }
        .scanner-header {
          color: #1a2a6c;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          display: flex;
        }
        .scanner-status {
          gap: 2px;
          display: grid;
        }
        .scanner-switch {
          color: #1a2a6c;
          cursor: pointer;
          white-space: nowrap;
          background: #eef1f8;
          border: none;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 700;
          width: auto;
        }
        .scanner-error {
          color: #dc3545;
          font-size: 12px;
        }
        .scanner-video-wrap {
          aspect-ratio: 16 / 9;
          background: #0b0f1f;
          border-radius: 12px;
          width: 100%;
          max-height: 220px;
          overflow: hidden;
        }
        .scanner-video {
          object-fit: cover;
          width: 100%;
          height: 100%;
        }
        .scanner-toast {
          color: #7c2d12;
          text-align: center;
          background: #ffedd5;
          border: 1px solid #fdba74;
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 600;
        }
        .custom-form,
        .stock-bulk {
          background: #f8f9ff;
          border: 1px solid #1a2a6c33;
          border-radius: 12px;
          gap: 8px;
          padding: 10px;
          display: grid;
        }
        .stock-bulk textarea {
          resize: vertical;
          border: 1px solid #1a2a6c33;
          border-radius: 10px;
          min-height: 120px;
          padding: 10px;
          font-size: 12px;
        }
        .stock-bulk-actions,
        .custom-grid {
          gap: 8px;
          display: grid;
        }
        .custom-grid input {
          border: 1px solid #1a2a6c33;
          border-radius: 10px;
          padding: 10px;
          font-size: 12px;
        }
        .custom-error {
          color: #dc3545;
          text-align: center;
          font-size: 12px;
        }
        .stock-menu-actions {
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          display: grid;
        }
        .stock-menu-actions button {
          color: #1a2a6c;
          cursor: pointer;
          background: #eef1f8;
          border: none;
          border-radius: 10px;
          padding: 8px;
          font-size: 12px;
          font-weight: 600;
        }
        .stock-menu-list {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          max-height: 240px;
          overflow-y: auto;
        }
        .stock-menu-item {
          text-align: left;
          color: #111;
          cursor: pointer;
          background: transparent;
          border: none;
          border-radius: 0;
          width: 100%;
          padding: 10px 12px;
          font-size: 12px;
          margin-top: 0;
        }
        .stock-menu-item.selected {
          color: #0b1b4a;
          background: #dfe7ff;
        }
        .stock-area {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          gap: 8px;
          padding: 10px;
          display: grid;
        }
        .stock-area-title {
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #1a2a6c;
          font-size: 11px;
          font-weight: 700;
        }
        .stock-empty {
          text-align: center;
          color: #777;
          font-size: 12px;
        }
        .stock-list,
        .compact-list {
          gap: 12px;
          display: grid;
        }
        .compact-row {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          gap: 8px;
          padding: 10px;
          display: grid;
        }
        .compact-main {
          gap: 8px;
          display: grid;
        }
        .compact-info {
          color: #111;
          gap: 2px;
          font-size: 12px;
          display: grid;
        }
        .compact-info span {
          color: #4b5563;
        }
        .compact-actions {
          gap: 8px;
          display: grid;
        }
        .compact-total label {
          color: #1a2a6c;
          margin-bottom: 6px;
          font-size: 11px;
          font-weight: 600;
          display: block;
        }
        .compact-toggle {
          color: #1a2a6c;
          cursor: pointer;
          background: #eef1f8;
          border: none;
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .compact-details {
          border-top: 1px solid #e5e7eb;
          gap: 10px;
          padding-top: 10px;
          display: grid;
        }
        .stock-item {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          gap: 10px;
          padding: 12px;
          display: grid;
        }
        .stock-highlight {
          transition: box-shadow 0.3s;
          box-shadow: 0 0 0 2px #3b82f673;
        }
        .stock-item-header {
          color: #000;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          flex-wrap: wrap;
        }
        .stock-item-header button {
          color: #dc3545;
          cursor: pointer;
          background: transparent;
          border: none;
          font-size: 12px;
          width: auto;
          margin: 0;
          padding: 4px 8px;
        }
        .stock-fields {
          gap: 10px;
          display: grid;
        }
        .field span {
          color: #1a2a6c;
          margin-bottom: 6px;
          font-size: 12px;
          font-weight: 600;
          display: block;
        }
        .stepper {
          grid-template-columns: 36px 1fr 36px;
          gap: 6px;
          display: grid;
        }
        .stepper input {
          text-align: center;
          width: 100%;
          margin: 0;
        }
        .stepper button {
          color: #1a2a6c;
          cursor: pointer;
          background: #eef1f8;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          margin: 0;
        }
        .hint {
          color: #6b7280;
          margin-top: 4px;
          font-size: 11px;
        }
        .stock-total {
          color: #1a2a6c;
          text-align: right;
          font-size: 13px;
          font-weight: 700;
        }
        .status {
          text-align: center;
          font-size: 12px;
          display: block;
          opacity: 1;
          max-height: none;
        }
        .status.error {
          color: #dc3545;
        }
        .status.success {
          color: #28a745;
        }
        .stock-actions {
          gap: 8px;
          display: grid;
        }
        .stock-progress {
          background: #f8f9ff;
          border: 1px solid #1a2a6c33;
          border-radius: 12px;
          padding: 12px;
          gap: 10px;
          display: grid;
        }
        .stock-progress-header {
          color: #1a2a6c;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          display: flex;
        }
        .stock-progress-bar {
          background: #e5e7eb;
          border-radius: 999px;
          width: 100%;
          height: 8px;
          overflow: hidden;
        }
        .stock-progress-fill {
          background: linear-gradient(135deg, #1a2a6c, #2b48a0);
          border-radius: 999px;
          height: 100%;
          transition: width 0.3s;
        }
        .stock-progress-meta {
          color: #4b5563;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
          font-size: 11px;
          display: grid;
        }
        .stock-missing {
          gap: 8px;
          display: grid;
        }
        .stock-missing-title {
          color: #1a2a6c;
          font-size: 12px;
          font-weight: 700;
        }
        .stock-missing-list {
          gap: 6px;
          display: grid;
          max-height: 240px;
          overflow-y: auto;
        }
        .stock-missing-item {
          color: #111827;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          font-size: 12px;
          display: grid;
        }
        .stock-missing-item input {
          accent-color: #1a2a6c;
          width: 16px;
          height: 16px;
          margin: 0;
        }
        .stock-missing-item button {
          color: #1a2a6c;
          cursor: pointer;
          background: #eef1f8;
          border: none;
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 600;
          margin: 0;
        }
        .stock-progress-actions {
          justify-content: flex-end;
          display: flex;
        }
        .stock-progress-actions button {
          color: #1a2a6c;
          cursor: pointer;
          background: #eef1f8;
          border: none;
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 600;
          width: auto;
        }
        .stock-secondary {
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #1a2a6c;
          cursor: pointer;
          background: #eef1f8;
          border: none;
          border-radius: 12px;
          padding: 12px;
          font-size: 12px;
          font-weight: 700;
        }
        @media (min-width: 720px) {
          .stock-form {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            align-items: end;
          }
          .stock-search-row {
            grid-template-columns: 1.4fr 1fr;
            align-items: start;
          }
          .stock-quick-add {
            grid-template-columns: 1fr auto;
            align-items: center;
          }
          .stock-bulk-actions {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .stock-fields {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .compact-main {
            grid-template-columns: 1.4fr 1fr;
            align-items: start;
          }
          .compact-actions {
            grid-template-columns: 1fr auto auto;
            align-items: end;
          }
        }
      `}</style>
    </div>
  )
}
