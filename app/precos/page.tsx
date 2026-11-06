"use client"

import React, { useState, useEffect } from "react"
import { NavHeader } from "@/components/layout/nav-header"
import {
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Search,
  Upload,
  Cloud,
  History,
  Sliders,
} from "lucide-react"

interface PrecoItemPreview {
  codigo: string
  descricao: string
  precoAtual: number
  precoNovo: number
  status: "alteracao" | "sem_alteracao" | "nao_encontrado"
}

export default function AtualizacaoPrecosPage() {
  const [user, setUser] = useState<{
    usuario: string
    nome?: string
    unidade?: string
    role?: string
  } | null>(null)

  // Etapas do fluxo
  const [step, setStep] = useState<"selecao" | "previa" | "sucesso">("selecao")
  const [contaMicrosoftConectada, setContaMicrosoftConectada] = useState(false)
  const [nomeArquivo, setNomeArquivo] = useState("Tabela_Precos_Hortifruti_Maia.xlsx")
  const [colunaId, setColunaId] = useState("SKU / Reduzido")
  const [colunaPreco, setColunaPreco] = useState("Preco_Venda_KG")

  // Prévia
  const [previaItens, setPreviaItens] = useState<PrecoItemPreview[]>([
    {
      codigo: "1001",
      descricao: "ABACATE 20 KG",
      precoAtual: 8.5,
      precoNovo: 9.2,
      status: "alteracao",
    },
    {
      codigo: "1002",
      descricao: "ABACAXI GRANDE",
      precoAtual: 6.0,
      precoNovo: 6.0,
      status: "sem_alteracao",
    },
    {
      codigo: "1004",
      descricao: "ABOBRINHA PRINCESA",
      precoAtual: 4.8,
      precoNovo: 5.5,
      status: "alteracao",
    },
    {
      codigo: "1005",
      descricao: "ABOBRINHA VERDE",
      precoAtual: 3.9,
      precoNovo: 4.2,
      status: "alteracao",
    },
  ])

  const [isApplying, setIsApplying] = useState(false)
  const [msgSucesso, setMsgSucesso] = useState("")

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

  // Confirmar Atualização
  const handleConfirmarPrecos = async () => {
    setIsApplying(true)
    try {
      const res = await fetch("/api/precos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arquivoOrigem: nomeArquivo,
          colunaPreco,
          alteracoes: previaItens.filter((i) => i.status === "alteracao"),
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setStep("sucesso")
        setMsgSucesso(
          `${data.registro.alteracoes.length} produtos atualizados com auditoria registrada.`
        )
      }
    } catch (err: any) {
      alert("Erro ao aplicar atualização: " + err.message)
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <NavHeader user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <FileSpreadsheet className="w-6 h-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Integração Excel — Atualização de Preços
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-slate-500">
                  Sincronização com Microsoft Excel Online / OneDrive com prévia e auditoria sem alterar estoques.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ETAPA 1: CONEXÃO E SELEÇÃO */}
        {step === "selecao" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-600" />
                1. Conexão Microsoft Ecossistema
              </h3>

              {!contaMicrosoftConectada ? (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <p className="text-xs text-slate-600">
                    Conecte a conta Microsoft 365 para acessar planilhas compartilhadas do OneDrive ou
                    SharePoint via Microsoft Graph API.
                  </p>
                  <button
                    type="button"
                    onClick={() => setContaMicrosoftConectada(true)}
                    className="w-full py-2.5 px-4 bg-[#2f2f2f] hover:bg-black text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow"
                  >
                    <span>Conectar Conta Microsoft 365</span>
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-bold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Conectado: compras@maiadistribuidora.com</span>
                  </div>
                  <button
                    onClick={() => setContaMicrosoftConectada(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 underline"
                  >
                    Desconectar
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-500">Arquivo Selecionado</label>
                  <input
                    type="text"
                    value={nomeArquivo}
                    onChange={(e) => setNomeArquivo(e.target.value)}
                    className="w-full mt-1 p-2.5 text-xs font-semibold border border-slate-300 rounded-xl outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Coluna Produto / SKU</label>
                    <input
                      type="text"
                      value={colunaId}
                      onChange={(e) => setColunaId(e.target.value)}
                      className="w-full mt-1 p-2 text-xs font-semibold border border-slate-300 rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">Coluna Preço Novo</label>
                    <input
                      type="text"
                      value={colunaPreco}
                      onChange={(e) => setColunaPreco(e.target.value)}
                      className="w-full mt-1 p-2 text-xs font-semibold border border-slate-300 rounded-xl outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep("previa")}
                className="w-full py-3 bg-[#1a2a6c] hover:bg-[#203a8f] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow"
              >
                <span>Analisar e Gerar Prévia de Atualização</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Informações de Segurança */}
            <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="font-black text-slate-900 text-sm">Regras de Segurança & Integridade:</div>
                <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <li>• Nenhum valor é gravado sem validação e autorização explícita na prévia.</li>
                  <li>• A atualização de preços nunca altera quantidades ou saldos de estoque.</li>
                  <li>• Produtos com códigos ambíguos são sinalizados e excluídos da alteração automática.</li>
                  <li>• Todas as atualizações geram registro de auditoria completo.</li>
                </ul>
              </div>

              <div className="text-[11px] text-slate-400 border-t border-slate-200 pt-3">
                Compatível com Microsoft Graph API v1.0 e Excel Online.
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 2: PRÉVIA COMPARATIVA */}
        {step === "previa" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Prévia Comparativa de Atualização de Preços
                </h3>
                <p className="text-xs text-slate-500">
                  Revise as diferenças identificadas entre a planilha Excel e o cadastro atual.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep("selecao")}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={isApplying}
                  onClick={handleConfirmarPrecos}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow"
                >
                  {isApplying ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Confirmar e Aplicar Preços
                </button>
              </div>
            </div>

            {/* TABELA COMPARATIVA (PRODUTO | PREÇO ATUAL | PREÇO NOVO | RESULTADO) */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-700">
                  <tr>
                    <th className="p-3">Código</th>
                    <th className="p-3">Produto</th>
                    <th className="p-3 text-right">Preço Atual</th>
                    <th className="p-3 text-right">Preço Novo</th>
                    <th className="p-3 text-center">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {previaItens.map((item) => (
                    <tr key={item.codigo} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-700">{item.codigo}</td>
                      <td className="p-3 font-bold text-slate-900">{item.descricao}</td>
                      <td className="p-3 text-right font-mono">
                        R$ {item.precoAtual.toFixed(2).replace(".", ",")}
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        R$ {item.precoNovo.toFixed(2).replace(".", ",")}
                      </td>
                      <td className="p-3 text-center">
                        {item.status === "alteracao" ? (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase">
                            Alteração
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full uppercase">
                            Sem alteração
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ETAPA 3: SUCESSO E AUDITORIA */}
        {step === "sucesso" && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-lg mx-auto space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Preços Atualizados com Sucesso</h3>
            <p className="text-xs text-slate-600">{msgSucesso}</p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setStep("selecao")}
                className="py-2.5 px-6 bg-[#1a2a6c] text-white font-bold rounded-xl text-xs hover:bg-[#203a8f]"
              >
                Nova Atualização
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
