"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"

const CATEGORIES = [
  { id: "puxada", label: "🚚 Perda na Puxada", emoji: "🚚" },
  { id: "passagem", label: "🔄 Perda na Passagem", emoji: "🔄" },
  { id: "armazem", label: "🏭 Perda no Armazém", emoji: "🏭" },
  { id: "deterioracao", label: "🥀 Deterioração (Podre)", emoji: "🥀" },
]

interface Item {
  id: string
  name: string
  weightKg: number
}

interface Occurrence {
  id: string
  category: string
  photo: string
  items: Item[]
  observation: string
  date: string
  status: "sent" | "pending" | "error"
  timestamp: number
}

const STORAGE_KEYS = {
  occurrences: "perdas_hortigranjeiros_occurrences",
  bot: "telegram_bot",
  chat: "telegram_chat",
  operator: "operator_name",
  autoSend: "auto_send",
}

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<"register" | "history" | "settings">("register")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [photoPreview, setPhotoPreview] = useState("")
  const [photoFile, setPhotoFile] = useState<Blob | null>(null)
  const [productInput, setProductInput] = useState("")
  const [weightInput, setWeightInput] = useState("")
  const [boxesCountInput, setBoxesCountInput] = useState("")
  const [tarePerBoxInput, setTarePerBoxInput] = useState("")
  const [dbTareByProduct, setDbTareByProduct] = useState<Record<string, number>>({})
  const [items, setItems] = useState<Item[]>([])
  const [observation, setObservation] = useState("")
  const [occurrences, setOccurrences] = useState<Occurrence[]>([])
  const [productCatalog, setProductCatalog] = useState<string[]>([])
  const [filteredProducts, setFilteredProducts] = useState<string[]>([])
  const [connectionStatus, setConnectionStatus] = useState("online")
  const [botToken, setBotToken] = useState("")
  const [chatId, setChatId] = useState("")
  const [operatorName, setOperatorName] = useState("")
  const [autoSend, setAutoSend] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingWeight, setEditingWeight] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Estados da tela de Histórico (declarados no topo para respeitar Rules of Hooks)
  const [filterCategory, setFilterCategory] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Carregar configurações e ocorrências
  useEffect(() => {
    // Limpar dados legados de bebidas/triagem
    localStorage.removeItem("bicadaData")
    localStorage.removeItem("occurrences")

    const envBot = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_TELEGRAM_BOT : undefined
    const envChat = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_TELEGRAM_CHAT : undefined
    const envOperator = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_OPERATOR_NAME : undefined

    const savedBot = localStorage.getItem(STORAGE_KEYS.bot)
    const savedChat = localStorage.getItem(STORAGE_KEYS.chat)
    const savedOperator = localStorage.getItem(STORAGE_KEYS.operator)
    const savedAutoSend = localStorage.getItem(STORAGE_KEYS.autoSend)
    const savedOccurrences = localStorage.getItem(STORAGE_KEYS.occurrences)

    if (envBot) setBotToken(envBot)
    else if (savedBot) setBotToken(savedBot)

    if (envChat) setChatId(envChat)
    else if (savedChat) setChatId(savedChat)

    if (envOperator) setOperatorName(envOperator)
    else if (savedOperator) setOperatorName(savedOperator)

    if (savedAutoSend) setAutoSend(JSON.parse(savedAutoSend))
    if (savedOccurrences) {
      try {
        setOccurrences(JSON.parse(savedOccurrences))
      } catch {
        setOccurrences([])
      }
    }

    // Carregar catálogo de produtos exclusivamente do banco de dados (/api/estoque-itens)
    fetch("/api/estoque-itens")
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.items)) {
          const dbNames = data.items
            .map((i: any) => String(i.descricao || "").trim())
            .filter(Boolean)
          setProductCatalog(Array.from(new Set(dbNames)))

          const tareMap: Record<string, number> = {}
          data.items.forEach((i: any) => {
            const name = String(i.descricao || "").trim()
            const t = Number(i.taraKg) || 0
            if (name && t > 0) tareMap[name.toLowerCase()] = t
          })
          setDbTareByProduct(tareMap)
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar produtos do banco de dados:", err)
        setProductCatalog([])
      })

    // Sincronizar histórico de perdas salvo no banco de dados (/api/perdas)
    fetch("/api/perdas")
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.occurrences) && data.occurrences.length > 0) {
          setOccurrences((prev) => {
            const byId = new Map(prev.map((o) => [o.id, o]))
            data.occurrences.forEach((o: Occurrence) => {
              if (!byId.has(o.id)) byId.set(o.id, o)
            })
            return Array.from(byId.values()).sort((a, b) => b.timestamp - a.timestamp)
          })
        }
      })
      .catch(() => {
        // Usa histórico local caso offline
      })
  }, [])

  // Monitorar status de conexão
  useEffect(() => {
    setConnectionStatus(navigator.onLine ? "online" : "offline")
    const handleOnline = () => setConnectionStatus("online")
    const handleOffline = () => setConnectionStatus("offline")

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const normalizeText = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()

  const handleProductInput = (value: string) => {
    setProductInput(value)
    if (value.trim()) {
      const searchTerm = normalizeText(value)
      const filtered = productCatalog.filter((product) =>
        normalizeText(product).includes(searchTerm),
      )
      setFilteredProducts(filtered.slice(0, 8))
    } else {
      setFilteredProducts([])
    }
  }

  const formatKg = (value: number) => {
    return Number(value.toFixed(3)).toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    })
  }

  const parseKgInput = (raw: string) => {
    const normalized = raw.replace(",", ".").trim()
    return Number.parseFloat(normalized)
  }

  const addItem = () => {
    const grossWeight = parseKgInput(weightInput)
    const boxes = Number.parseInt(boxesCountInput || "0", 10) || 0
    const tarePerBox = parseKgInput(tarePerBoxInput || "0") || 0
    const totalTare = boxes > 0 && tarePerBox > 0 ? boxes * tarePerBox : 0
    const parsedWeight = Number(Math.max(0, grossWeight - totalTare).toFixed(3))

    if (!productInput.trim() || Number.isNaN(grossWeight) || parsedWeight <= 0) {
      alert(
        totalTare >= grossWeight && grossWeight > 0
          ? "O desconto de tara das caixas não pode ser maior ou igual ao peso bruto!"
          : "Preencha o produto e informe um peso válido em quilos (kg)"
      )
      return
    }

    const newItem: Item = {
      id: Date.now().toString(),
      name: productInput.trim(),
      weightKg: parsedWeight,
    }

    setItems([...items, newItem])
    setProductInput("")
    setWeightInput("")
    setBoxesCountInput("")
    setFilteredProducts([])
  }

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const startEditingItem = (item: Item) => {
    setEditingItemId(item.id)
    setEditingWeight(item.weightKg.toString())
  }

  const saveEditItem = (id: string) => {
    const newWeight = parseKgInput(editingWeight)
    if (Number.isNaN(newWeight) || newWeight <= 0) {
      alert("O peso deve ser maior que 0 kg")
      return
    }

    setItems(items.map((item) => (item.id === id ? { ...item, weightKg: newWeight } : item)))
    setEditingItemId(null)
    setEditingWeight("")
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      alert("Erro ao acessar câmera: " + (error instanceof Error ? error.message : String(error)))
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    const cameraView = document.getElementById("camera-view")
    if (cameraView) {
      cameraView.style.display = "none"
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const context = canvasRef.current.getContext("2d")
    if (!context) return

    canvasRef.current.width = videoRef.current.videoWidth
    canvasRef.current.height = videoRef.current.videoHeight
    context.drawImage(videoRef.current, 0, 0)

    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          setPhotoFile(blob)
          setPhotoPreview(canvasRef.current!.toDataURL("image/jpeg"))
          stopCamera()
        }
      },
      "image/jpeg",
      0.9,
    )
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const buildTelegramMessage = (
    categoryId: string,
    dateStr: string,
    itemList: Item[],
    obs: string,
  ) => {
    const categoryLabel = CATEGORIES.find((c) => c.id === categoryId)?.label || categoryId
    const totalWeight = itemList.reduce((acc, item) => acc + item.weightKg, 0)

    let messageText = `🥬 REGISTRO DE PERDAS - HORTIGRANJEIROS\n`
    messageText += `📂 Categoria: ${categoryLabel}\n`
    messageText += `📅 Data: ${dateStr}\n`
    if (obs) {
      messageText += `📝 Observação: ${obs}\n`
    }
    messageText += `👤 Operador: ${operatorName || "Não informado"}\n\n`
    messageText += `🧾 Itens:\n`
    itemList.forEach((item, index) => {
      messageText += `${index + 1}) ${item.name} — ${formatKg(item.weightKg)} kg\n`
    })
    messageText += `\n⚖️ Peso Total: ${formatKg(totalWeight)} kg`

    return messageText
  }

  const sendToTelegram = async () => {
    if (!botToken || !chatId) {
      alert("Configure o Token do Bot e Chat ID nas Configurações")
      return
    }

    if (!selectedCategory || !items.length || !photoFile) {
      alert("Selecione a categoria, adicione pelo menos um item (em kg) e tire uma foto")
      return
    }

    setIsSending(true)

    const timestamp = new Date()
    const dateStr = timestamp.toLocaleString("pt-BR")
    const messageText = buildTelegramMessage(selectedCategory, dateStr, items, observation)

    const occurrence: Occurrence = {
      id: Date.now().toString(),
      category: selectedCategory,
      photo: photoPreview,
      items: items,
      observation: observation,
      date: dateStr,
      status: "pending",
      timestamp: timestamp.getTime(),
    }

    try {
      const formData = new FormData()
      formData.append("chat_id", chatId)
      formData.append("caption", messageText)
      formData.append("photo", photoFile, "evidencia.jpg")

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.ok) {
        occurrence.status = "sent"
        alert("✅ Perda registrada e enviada com sucesso!")
      } else {
        throw new Error(data.description || "Erro ao enviar")
      }
    } catch (error) {
      console.error("Erro ao enviar:", error)
      if (connectionStatus === "offline") {
        occurrence.status = "pending"
        alert("📤 Sem conexão. Será enviado quando reconectar.")
      } else {
        occurrence.status = "error"
        alert("❌ Erro ao enviar: " + (error instanceof Error ? error.message : String(error)))
      }
    }

    const updatedOccurrences = [occurrence, ...occurrences]
    setOccurrences(updatedOccurrences)
    localStorage.setItem(STORAGE_KEYS.occurrences, JSON.stringify(updatedOccurrences))

    // Salvar ocorrência no banco de dados (/api/perdas) para integração com Gerenciador de Estoque
    fetch("/api/perdas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...occurrence,
        operatorName,
      }),
    }).catch((err) => console.warn("Aviso ao salvar perda no banco:", err))

    // Reset form
    setSelectedCategory("")
    setItems([])
    setObservation("")
    setPhotoPreview("")
    setPhotoFile(null)
    setIsSending(false)
  }

  const resendOccurrence = async (occurrence: Occurrence) => {
    if (!botToken || !chatId) {
      alert("Configure o Token do Bot e Chat ID nas Configurações")
      return
    }

    if (!occurrence.photo) {
      alert("Foto não disponível")
      return
    }

    setIsSending(true)

    const messageText = buildTelegramMessage(
      occurrence.category,
      occurrence.date,
      occurrence.items,
      occurrence.observation,
    )

    try {
      const formData = new FormData()
      formData.append("chat_id", chatId)
      formData.append("caption", messageText)

      const response = await fetch(occurrence.photo)
      const blob = await response.blob()
      formData.append("photo", blob, "evidencia.jpg")

      const sendResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: "POST",
        body: formData,
      })

      const data = await sendResponse.json()

      if (data.ok) {
        const updated = occurrences.map((occ) =>
          occ.id === occurrence.id ? { ...occ, status: "sent" as const } : occ,
        )
        setOccurrences(updated)
        localStorage.setItem(STORAGE_KEYS.occurrences, JSON.stringify(updated))
        setSelectedOccurrence({ ...occurrence, status: "sent" })
        alert("✅ Reenviado com sucesso!")
      } else {
        throw new Error(data.description || "Erro ao enviar")
      }
    } catch (error) {
      console.error("Erro ao reenviar:", error)
      if (connectionStatus === "offline") {
        alert("📤 Sem conexão. Tente novamente quando online.")
      } else {
        alert("❌ Erro ao reenviar: " + (error instanceof Error ? error.message : String(error)))
      }
    }

    setIsSending(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "#28a745"
      case "pending":
        return "#ffc107"
      case "error":
        return "#dc3545"
      default:
        return "#6c757d"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "sent":
        return "✅ Enviado"
      case "pending":
        return "📤 Pendente"
      case "error":
        return "❌ Erro"
      default:
        return "⚪ Desconhecido"
    }
  }

  const exportToCSV = () => {
    if (occurrences.length === 0) {
      alert("Nenhuma ocorrência para exportar")
      return
    }

    let csvContent = "Categoria,Data,Status,Peso Total (kg),Itens (kg),Observação\n"

    occurrences.forEach((occ) => {
      const categoryLabel = CATEGORIES.find((c) => c.id === occ.category)?.label || occ.category
      const totalKg = occ.items.reduce((acc, item) => acc + item.weightKg, 0)
      const itemsText = occ.items.map((item) => `${item.name} (${formatKg(item.weightKg)}kg)`).join(" | ")
      csvContent += `"${categoryLabel}","${occ.date}","${occ.status}","${formatKg(totalKg)}","${itemsText}","${occ.observation}"\n`
    })

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `historico_perdas_hortigranjeiros_${new Date().toISOString().split("T")[0]}.csv`)
    link.click()
  }

  const totalCurrentWeight = items.reduce((acc, item) => acc + item.weightKg, 0)

  // TELA 1: Registrar Perda
  if (currentScreen === "register") {
    return (
      <div className="marca-foto-container">
        <div className="container">
          <header>
            <h1>🥬 Controle de Perdas — Hortigranjeiros</h1>
            <p style={{ fontSize: "14px", color: "#666", marginTop: "5px" }}>
              {connectionStatus === "online" ? "🟢 Online" : "🔴 Offline"}
            </p>
          </header>

          {/* Seleção de Categoria */}
          <div style={{ marginBottom: "20px" }}>
            <label>Selecione a Categoria de Perda:</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "10px",
                marginTop: "10px",
              }}
            >
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    background: selectedCategory === cat.id ? "#1a2a6c" : "#e9ecef",
                    color: selectedCategory === cat.id ? "white" : "#333",
                    border: selectedCategory === cat.id ? "2px solid #1a2a6c" : "2px solid transparent",
                    padding: "15px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    transition: "all 0.3s",
                    marginTop: 0,
                    fontWeight: "bold",
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Câmera */}
          <div
            style={{
              marginBottom: "20px",
              padding: "15px",
              background: "rgba(26, 42, 108, 0.05)",
              borderRadius: "10px",
            }}
          >
            <label>📷 Evidência Fotográfica:</label>

            {!photoPreview ? (
              <>
                <button
                  onClick={() => {
                    const cameraView = document.getElementById("camera-view")
                    if (cameraView) {
                      cameraView.style.display = "flex"
                      startCamera()
                    }
                  }}
                  style={{
                    background: "linear-gradient(to right, #1a2a6c, #b21f1f)",
                    marginTop: "10px",
                  }}
                >
                  📷 Abrir Câmera
                </button>

                <div style={{ textAlign: "center", margin: "15px 0", color: "#666" }}>
                  <strong>OU</strong>
                </div>

                <label className="file-upload">
                  <input type="file" accept="image/*" onChange={handleFileUpload} hidden />
                  📁 Selecionar da Galeria
                </label>
              </>
            ) : (
              <>
                <img
                  src={photoPreview}
                  alt="Preview"
                  style={{
                    width: "100%",
                    borderRadius: "10px",
                    marginTop: "10px",
                    border: "2px solid #1a2a6c",
                  }}
                />
                <button
                  onClick={() => {
                    setPhotoPreview("")
                    setPhotoFile(null)
                  }}
                  style={{ background: "#dc3545", marginTop: "10px" }}
                >
                  ❌ Remover Foto
                </button>
              </>
            )}

            <div id="camera-view" style={{ display: "none", marginTop: "15px", flexDirection: "column" }}>
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
                <button onClick={capturePhoto} style={{ flex: 1, background: "#28a745", marginTop: "0" }}>
                  📸 Capturar
                </button>
                <button onClick={stopCamera} style={{ flex: 1, background: "#dc3545", marginTop: "0" }}>
                  ❌ Fechar
                </button>
              </div>
            </div>
          </div>

          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Adicionar Itens (em Quilos) */}
          <div
            style={{
              marginBottom: "20px",
              padding: "15px",
              background: "rgba(26, 42, 108, 0.05)",
              borderRadius: "10px",
            }}
          >
            <label>🧾 Adicionar Produto (Hortigranjeiros):</label>

            <div style={{ position: "relative", marginTop: "10px" }}>
              <input
                type="text"
                placeholder="Digite o nome do produto (ex: Tomate, Banana, Abacate)..."
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
                    zIndex: 10,
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  {filteredProducts.map((product) => (
                    <div
                      key={product}
                      onClick={() => {
                        setProductInput(product)
                        const savedTare = dbTareByProduct[product.toLowerCase()]
                        if (savedTare) {
                          setTarePerBoxInput(String(savedTare))
                        }
                        setFilteredProducts([])
                      }}
                      style={{
                        padding: "10px 15px",
                        borderBottom: "1px solid #eee",
                        cursor: "pointer",
                        transition: "background 0.2s",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = "#f0f0f0"
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = "white"
                      }}
                    >
                      {product}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label style={{ marginTop: "15px" }}>⚖️ Peso Bruto na Balança (kg):</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Ex: 22.0"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              style={{ marginBottom: "10px" }}
            />

            {/* Desconto Automático de Tara de Caixas */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginTop: "6px",
                marginBottom: "8px",
              }}
            >
              <div>
                <label style={{ marginTop: 0, fontSize: "13px" }}>
                  📦 Qtd. Caixas (opcional):
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Ex: 1"
                  value={boxesCountInput}
                  onChange={(e) => setBoxesCountInput(e.target.value)}
                />
              </div>
              <div>
                <label style={{ marginTop: 0, fontSize: "13px" }}>
                  ⚖️ Tara por Caixa (kg):
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Ex: 2.0"
                  value={tarePerBoxInput}
                  onChange={(e) => setTarePerBoxInput(e.target.value)}
                />
              </div>
            </div>

            {(() => {
              const g = parseKgInput(weightInput || "0") || 0
              const b = Number.parseInt(boxesCountInput || "0", 10) || 0
              const t = parseKgInput(tarePerBoxInput || "0") || 0
              const discount = b > 0 && t > 0 ? b * t : 0
              if (g > 0 && discount > 0) {
                const net = Math.max(0, g - discount)
                return (
                  <div
                    style={{
                      background: "#e8f5e9",
                      color: "#1b5e20",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      marginBottom: "8px",
                      fontWeight: 600,
                    }}
                  >
                    ⚖️ Peso Bruto: {formatKg(g)} kg − Tara ({b}x {formatKg(t)} kg ={" "}
                    {formatKg(discount)} kg) ➡️{" "}
                    <strong>Peso Líquido: {formatKg(net)} kg</strong>
                  </div>
                )
              }
              return null
            })()}

            <button onClick={addItem} style={{ background: "#28a745", marginTop: "10px" }}>
              ➕ Adicionar Item (kg líquido)
            </button>
          </div>

          {/* Lista de Itens */}
          {items.length > 0 && (
            <div
              style={{
                marginBottom: "20px",
                padding: "15px",
                background: "rgba(42, 108, 26, 0.05)",
                borderRadius: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "15px",
                }}
              >
                <h3 style={{ color: "#1a2a6c", margin: 0 }}>📋 Itens Adicionados ({items.length}):</h3>
                <span
                  style={{
                    background: "#1a2a6c",
                    color: "white",
                    padding: "4px 10px",
                    borderRadius: "15px",
                    fontSize: "13px",
                    fontWeight: "bold",
                  }}
                >
                  Total: {formatKg(totalCurrentWeight)} kg
                </span>
              </div>

              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "white",
                    padding: "12px",
                    borderRadius: "8px",
                    marginBottom: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    border: "1px solid #e9ecef",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <strong>{item.name}</strong>
                    {editingItemId === item.id ? (
                      <div style={{ marginTop: "8px", display: "flex", gap: "5px", alignItems: "center" }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={editingWeight}
                          onChange={(e) => setEditingWeight(e.target.value)}
                          style={{ width: "90px", marginTop: "0" }}
                        />
                        <span style={{ fontSize: "13px", color: "#555" }}>kg</span>
                        <button
                          onClick={() => saveEditItem(item.id)}
                          style={{ background: "#28a745", padding: "5px 10px", fontSize: "12px", marginTop: "0" }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingItemId(null)}
                          style={{ background: "#dc3545", padding: "5px 10px", fontSize: "12px", marginTop: "0" }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <p style={{ margin: "5px 0 0 0", color: "#666", fontSize: "14px" }}>
                        Peso: <strong>{formatKg(item.weightKg)} kg</strong>
                      </p>
                    )}
                  </div>

                  {editingItemId !== item.id && (
                    <div style={{ display: "flex", gap: "5px" }}>
                      <button
                        onClick={() => startEditingItem(item)}
                        style={{
                          background: "#ffc107",
                          padding: "5px 10px",
                          fontSize: "12px",
                          marginTop: "0",
                          minWidth: "auto",
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        style={{
                          background: "#dc3545",
                          padding: "5px 10px",
                          fontSize: "12px",
                          marginTop: "0",
                          minWidth: "auto",
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Observação */}
          <label>📝 Observação (opcional):</label>
          <textarea
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder="Ex: Produto amassado no transporte, caixa úmida, deterioração avançada..."
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              marginTop: "5px",
              minHeight: "80px",
              fontFamily: "inherit",
              marginBottom: "20px",
              boxSizing: "border-box",
            }}
          />

          {/* Botão Enviar */}
          <button
            onClick={sendToTelegram}
            disabled={isSending || !selectedCategory || !items.length || !photoPreview}
            style={{
              background: isSending ? "#6c757d" : "linear-gradient(to right, #1a2a6c, #b21f1f)",
              width: "100%",
              padding: "15px",
              fontSize: "16px",
              fontWeight: "bold",
              marginBottom: "20px",
              marginTop: "0",
              opacity: isSending || !selectedCategory || !items.length || !photoPreview ? 0.6 : 1,
            }}
          >
            {isSending ? "⏳ Enviando..." : "🚀 Enviar tudo para o Telegram"}
          </button>

          {/* Navigation */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => {
                setSelectedOccurrence(null)
                setCurrentScreen("history")
              }}
              style={{
                flex: 1,
                background: "#17a2b8",
                marginTop: "0",
              }}
            >
              📜 Histórico & Dashboard
            </button>
            <button
              onClick={() => setCurrentScreen("settings")}
              style={{
                flex: 1,
                background: "#6c757d",
                marginTop: "0",
              }}
            >
              ⚙️ Configurações
            </button>
            <button
              onClick={() => {
                window.location.href = "/gerenciador-estoque"
              }}
              style={{
                flex: 1,
                background: "#1a2a6c",
                marginTop: "0",
              }}
            >
              📦 Gerenciador de Estoque
            </button>
          </div>
        </div>
      </div>
    )
  }

  // TELA 2: Histórico
  if (currentScreen === "history") {
    const filteredOccurrences = occurrences.filter((occ) => {
      if (filterCategory && occ.category !== filterCategory) return false
      if (filterStatus && occ.status !== filterStatus) return false
      return true
    })

    if (selectedOccurrence) {
      const totalSelectedWeight = selectedOccurrence.items.reduce((acc, item) => acc + item.weightKg, 0)

      return (
        <div className="marca-foto-container">
          <div className="container">
            <header>
              <h1>📋 Detalhes da Ocorrência</h1>
            </header>

            <button
              onClick={() => setSelectedOccurrence(null)}
              style={{
                background: "#6c757d",
                marginBottom: "15px",
              }}
            >
              ← Voltar
            </button>

            <div
              style={{
                padding: "15px",
                background: "rgba(26, 42, 108, 0.05)",
                borderRadius: "10px",
                marginBottom: "15px",
              }}
            >
              <h3 style={{ color: "#1a2a6c", marginBottom: "10px" }}>
                {CATEGORIES.find((c) => c.id === selectedOccurrence.category)?.label || selectedOccurrence.category}
              </h3>
              <p>
                <strong>Data:</strong> {selectedOccurrence.date}
              </p>
              <p>
                <strong>Peso Total:</strong> {formatKg(totalSelectedWeight)} kg
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  style={{
                    background: getStatusColor(selectedOccurrence.status),
                    color: "white",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    display: "inline-block",
                  }}
                >
                  {getStatusText(selectedOccurrence.status)}
                </span>
              </p>
            </div>

            {selectedOccurrence.photo && (
              <div style={{ marginBottom: "15px" }}>
                <label>Foto:</label>
                <img
                  src={selectedOccurrence.photo}
                  alt="Evidência"
                  style={{
                    width: "100%",
                    borderRadius: "10px",
                    border: "2px solid #1a2a6c",
                    marginTop: "10px",
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: "15px" }}>
              <label>Itens (kg):</label>
              <div
                style={{
                  background: "rgba(248, 249, 250, 0.95)",
                  padding: "15px",
                  borderRadius: "10px",
                  marginTop: "10px",
                }}
              >
                {selectedOccurrence.items.map((item, index) => (
                  <p key={item.id} style={{ margin: "8px 0" }}>
                    <strong>{index + 1})</strong> {item.name} — <strong>{formatKg(item.weightKg)} kg</strong>
                  </p>
                ))}
              </div>
            </div>

            {selectedOccurrence.observation && (
              <div style={{ marginBottom: "15px" }}>
                <label>Observação:</label>
                <div
                  style={{
                    background: "rgba(248, 249, 250, 0.95)",
                    padding: "15px",
                    borderRadius: "10px",
                    marginTop: "10px",
                  }}
                >
                  {selectedOccurrence.observation}
                </div>
              </div>
            )}

            {selectedOccurrence.status !== "sent" && (
              <button
                onClick={() => resendOccurrence(selectedOccurrence)}
                disabled={isSending}
                style={{
                  background: "#007bff",
                  marginBottom: "15px",
                }}
              >
                {isSending ? "⏳ Enviando..." : "🔄 Reenviar"}
              </button>
            )}

            <button
              onClick={() => setSelectedOccurrence(null)}
              style={{
                background: "#6c757d",
              }}
            >
              ← Voltar
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="marca-foto-container">
        <div className="container">
          <header>
            <h1>📜 Histórico & Indicadores de Perdas</h1>
          </header>

          {/* Painel de Indicadores de Quebra (kg) */}
          {occurrences.length > 0 &&
            (() => {
              const byCat: Record<string, number> = {}
              const byProd: Record<string, number> = {}
              let grandTotalKg = 0

              filteredOccurrences.forEach((occ) => {
                occ.items.forEach((it) => {
                  const w = Number(it.weightKg) || 0
                  grandTotalKg += w
                  byCat[occ.category] = (byCat[occ.category] || 0) + w
                  byProd[it.name] = (byProd[it.name] || 0) + w
                })
              })

              const topProducts = Object.entries(byProd)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)

              return (
                <div
                  style={{
                    marginBottom: "20px",
                    padding: "15px",
                    background: "rgba(26, 42, 108, 0.06)",
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
                    }}
                  >
                    <strong style={{ color: "#1a2a6c", fontSize: "15px" }}>
                      📊 Resumo de Quebras
                    </strong>
                    <span
                      style={{
                        background: "#dc3545",
                        color: "white",
                        padding: "4px 12px",
                        borderRadius: "999px",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}
                    >
                      Total Acumulado: {formatKg(grandTotalKg)} kg
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: "8px",
                      marginBottom: topProducts.length ? "12px" : "0",
                    }}
                  >
                    {CATEGORIES.map((cat) => {
                      const val = byCat[cat.id] || 0
                      return (
                        <div
                          key={cat.id}
                          style={{
                            background: "white",
                            padding: "10px",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        >
                          <div style={{ color: "#555" }}>{cat.label}</div>
                          <div
                            style={{
                              color: "#1a2a6c",
                              fontSize: "14px",
                              fontWeight: 700,
                              marginTop: "4px",
                            }}
                          >
                            {formatKg(val)} kg
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {topProducts.length > 0 && (
                    <div
                      style={{
                        background: "white",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    >
                      <strong style={{ color: "#1a2a6c", display: "block", marginBottom: "6px" }}>
                        🏆 Top Produtos com Maior Perda (kg):
                      </strong>
                      {topProducts.map(([prodName, kg], idx) => (
                        <div
                          key={prodName}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "3px 0",
                            borderBottom:
                              idx < topProducts.length - 1 ? "1px solid #f0f0f0" : "none",
                          }}
                        >
                          <span>
                            {idx + 1}. {prodName}
                          </span>
                          <strong>{formatKg(kg)} kg</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

          {/* Filtros */}
          <div
            style={{
              marginBottom: "20px",
              padding: "15px",
              background: "rgba(26, 42, 108, 0.05)",
              borderRadius: "10px",
            }}
          >
            <label>Filtrar por Categoria:</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ marginBottom: "15px" }}
            >
              <option value="">Todas as categorias</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>

            <label>Filtrar por Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Todos os status</option>
              <option value="sent">✅ Enviado</option>
              <option value="pending">📤 Pendente</option>
              <option value="error">❌ Erro</option>
            </select>
          </div>

          {/* Lista */}
          {filteredOccurrences.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
              <p style={{ fontSize: "18px" }}>Nenhuma ocorrência encontrada</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "15px", marginBottom: "20px" }}>
              {filteredOccurrences.map((occ) => {
                const totalOccWeight = occ.items.reduce((acc, item) => acc + item.weightKg, 0)
                return (
                  <div
                    key={occ.id}
                    onClick={() => setSelectedOccurrence(occ)}
                    style={{
                      background: "white",
                      padding: "15px",
                      borderRadius: "10px",
                      border: "2px solid #e9ecef",
                      cursor: "pointer",
                      transition: "all 0.3s",
                      borderLeft: `4px solid ${getStatusColor(occ.status)}`,
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.boxShadow = "none"
                    }}
                  >
                    <div style={{ display: "flex", gap: "15px" }}>
                      {occ.photo && (
                        <img
                          src={occ.photo}
                          alt="Miniatura"
                          style={{
                            width: "80px",
                            height: "80px",
                            objectFit: "cover",
                            borderRadius: "8px",
                          }}
                        />
                      )}

                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: "0 0 8px 0", color: "#1a2a6c" }}>
                          {CATEGORIES.find((c) => c.id === occ.category)?.label || occ.category}
                        </h4>
                        <p style={{ margin: "4px 0", fontSize: "14px" }}>
                          <strong>Data:</strong> {occ.date}
                        </p>
                        <p style={{ margin: "4px 0", fontSize: "14px" }}>
                          <strong>Itens:</strong> {occ.items.length} ({formatKg(totalOccWeight)} kg)
                        </p>
                        <span
                          style={{
                            background: getStatusColor(occ.status),
                            color: "white",
                            padding: "4px 12px",
                            borderRadius: "20px",
                            display: "inline-block",
                            fontSize: "12px",
                            marginTop: "8px",
                          }}
                        >
                          {getStatusText(occ.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setCurrentScreen("register")}
              style={{
                flex: 1,
                background: "#1a2a6c",
                marginTop: "0",
              }}
            >
              📦 Registrar
            </button>
            <button
              onClick={() => setCurrentScreen("settings")}
              style={{
                flex: 1,
                background: "#6c757d",
                marginTop: "0",
              }}
            >
              ⚙️ Configurações
            </button>
          </div>
        </div>
      </div>
    )
  }

  // TELA 3: Configurações
  return (
    <div className="marca-foto-container">
      <div className="container">
        <header>
          <h1>⚙️ Configurações</h1>
        </header>

        <div
          style={{
            marginBottom: "20px",
            padding: "15px",
            background: "rgba(26, 42, 108, 0.05)",
            borderRadius: "10px",
          }}
        >
          <label>Token do Bot Telegram:</label>
          <input
            type="text"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="Copie do BotFather"
            style={{ marginBottom: "15px" }}
          />

          <label>Chat ID do Telegram:</label>
          <input
            type="text"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="ID do grupo ou chat privado"
            style={{ marginBottom: "15px" }}
          />

          <label>Nome do Operador:</label>
          <input
            type="text"
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            placeholder="Seu nome ou matrícula"
            style={{ marginBottom: "15px" }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "15px",
              padding: "10px",
              background: "white",
              borderRadius: "8px",
            }}
          >
            <input
              type="checkbox"
              checked={autoSend}
              onChange={(e) => setAutoSend(e.target.checked)}
              style={{ width: "auto", margin: "0", cursor: "pointer" }}
            />
            <label style={{ margin: "0", fontWeight: "normal" }}>
              ✓ Enviar automaticamente após adicionar itens
            </label>
          </div>

          <button
            onClick={() => {
              localStorage.setItem(STORAGE_KEYS.bot, botToken)
              localStorage.setItem(STORAGE_KEYS.chat, chatId)
              localStorage.setItem(STORAGE_KEYS.operator, operatorName)
              localStorage.setItem(STORAGE_KEYS.autoSend, JSON.stringify(autoSend))
              alert("✅ Configurações salvas!")
            }}
            style={{
              background: "#28a745",
              marginBottom: "15px",
            }}
          >
            💾 Salvar Configurações
          </button>
        </div>

        {/* Exportar e Apagar */}
        <div
          style={{
            marginBottom: "20px",
            padding: "15px",
            background: "rgba(220, 53, 69, 0.05)",
            borderRadius: "10px",
          }}
        >
          <h3 style={{ color: "#1a2a6c", marginBottom: "15px" }}>Dados</h3>

          <button
            onClick={exportToCSV}
            style={{
              background: "#17a2b8",
              marginBottom: "10px",
            }}
          >
            📊 Exportar Histórico (CSV)
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              background: "#dc3545",
            }}
          >
            🗑️ Apagar Todo o Histórico
          </button>
        </div>

        {showDeleteConfirm && (
          <div
            style={{
              position: "fixed",
              top: "0",
              left: "0",
              width: "100%",
              height: "100%",
              background: "rgba(0,0,0,0.7)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                background: "white",
                padding: "30px",
                borderRadius: "15px",
                textAlign: "center",
                maxWidth: "400px",
              }}
            >
              <h3 style={{ color: "#1a2a6c", marginBottom: "15px" }}>⚠️ Confirmar Exclusão</h3>
              <p style={{ marginBottom: "20px", color: "#666" }}>
                Tem certeza que deseja apagar todo o histórico? Esta ação não pode ser desfeita.
              </p>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => {
                    setOccurrences([])
                    localStorage.setItem(STORAGE_KEYS.occurrences, JSON.stringify([]))
                    setShowDeleteConfirm(false)
                    alert("✅ Histórico apagado!")
                  }}
                  style={{
                    flex: 1,
                    background: "#dc3545",
                    marginTop: "0",
                  }}
                >
                  Apagar
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    flex: 1,
                    background: "#6c757d",
                    marginTop: "0",
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            onClick={() => setCurrentScreen("register")}
            style={{
              flex: 1,
              background: "#1a2a6c",
              marginTop: "0",
            }}
          >
            📦 Registrar
          </button>
          <button
            onClick={() => {
              setSelectedOccurrence(null)
              setCurrentScreen("history")
            }}
            style={{
              flex: 1,
              background: "#17a2b8",
              marginTop: "0",
            }}
          >
            📜 Histórico
          </button>
        </div>
      </div>
    </div>
  )
}
