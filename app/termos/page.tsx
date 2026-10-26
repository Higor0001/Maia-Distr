"use client"

import React from "react"
import Link from "next/link"
import { Shield, ArrowLeft, Download, FileText, Layers } from "lucide-react"

export default function TermosPage() {
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
        className="w-full max-w-5xl mx-auto rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-6"
        style={{
          background: "rgba(255, 255, 255, 0.96)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(26, 42, 108, 0.12)",
          boxShadow: "0 20px 45px rgba(0, 0, 0, 0.35)",
        }}
      >
        {/* Banner Superior com Logo Maia */}
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
                <span>Termos de Uso & Privacidade — Maia Distribuidora</span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    background: "rgba(16, 185, 129, 0.2)",
                    color: "#34d399",
                    border: "1px solid rgba(16, 185, 129, 0.4)",
                  }}
                >
                  Documento Oficial
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#e2e8f0", marginTop: "2px" }}>
                Termos de Uso e Política de Privacidade do Sistema de Triagem e Gerenciamento de Estoque
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <a
              href="/termos-de-uso.pdf"
              download="Termos_de_Uso_Maia_Distribuidora.pdf"
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#ffffff",
                padding: "8px 14px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar PDF</span>
            </a>

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
              <span>Voltar ao Sistema</span>
            </Link>
          </div>
        </div>

        {/* PARTE 1: TERMO DE USO */}
        <article className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-5 text-center">
            <div className="inline-flex p-3 bg-indigo-50 text-[#1a2a6c] rounded-2xl mb-2 border border-indigo-100">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight" style={{ color: "#1a2a6c" }}>
              Termo de Uso do Sistema
            </h1>
            <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">
              “TRIAGEM FILIAL E GERENCIADOR DE ESTOQUE HORTIGRANJEIROS”
            </p>
          </div>

          {/* Dados de Identificação */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1.5 text-slate-700">
            <div><strong className="text-slate-900">Titular / Autor:</strong> Alexandre Higor C. Q</div>
            <div><strong className="text-slate-900">Sistema:</strong> TRIAGEM FILIAL E GERENCIADOR DE ESTOQUE HORTIGRANJEIROS</div>
            <div><strong className="text-emerald-700 font-bold">Empresa Autorizada a Utilizar:</strong> MAIA DISTRIBUIDORA</div>
            <div><strong className="text-slate-900">Contato para Notificações:</strong> alexandrehigor@outlook.com</div>
          </div>

          <section className="space-y-5 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <div>
              <h2 className="text-sm sm:text-base font-bold mb-2 flex items-center gap-2" style={{ color: "#1a2a6c" }}>
                <span className="w-2 h-2 rounded-full bg-[#1a2a6c]" />
                1. Objeto
              </h2>
              <p>
                1.1. O presente Termo de Uso tem por objeto regular a utilização do sistema denominado
                <strong> “TRIAGEM FILIAL E GERENCIADOR DE ESTOQUE HORTIGRANJEIROS”</strong> (doravante denominado “Sistema”),
                de titularidade exclusiva de <strong>Alexandre Higor C. Q</strong>, disponibilizado para uso interno e restrito
                pela empresa <strong>MAIA DISTRIBUIDORA</strong>.
              </p>
            </div>

            <div>
              <h2 className="text-sm sm:text-base font-bold mb-2 flex items-center gap-2" style={{ color: "#1a2a6c" }}>
                <span className="w-2 h-2 rounded-full bg-[#1a2a6c]" />
                2. Titularidade e Direitos Autorais
              </h2>
              <p className="mb-2">
                2.1. O Sistema, seu código-fonte, interface, mecânica de funcionamento, documentos técnicos, banco de dados,
                funcionalidades e quaisquer elementos derivados constituem obra intelectual protegida pelas normas de propriedade
                intelectual e direitos autorais.
              </p>
              <p>
                2.2. O titular não transfere a propriedade do Sistema à empresa MAIA DISTRIBUIDORA, concedendo apenas direito
                de uso restrito, conforme previsto neste Termo.
              </p>
            </div>

            <div>
              <h2 className="text-sm sm:text-base font-bold mb-2 flex items-center gap-2" style={{ color: "#1a2a6c" }}>
                <span className="w-2 h-2 rounded-full bg-[#1a2a6c]" />
                3. Licença de Uso Restrita
              </h2>
              <p className="mb-2">
                3.1. A empresa MAIA DISTRIBUIDORA recebe licença não exclusiva, não transferível, não sublicenciável e revogável
                para uso do Sistema.
              </p>
              <p>
                3.2. A licença se aplica exclusivamente para fins internos, operacionais e administrativos da empresa,
                abrangendo as operações de suas unidades Filial e Matriz.
              </p>
            </div>

            <div>
              <h2 className="text-sm sm:text-base font-bold mb-2 flex items-center gap-2" style={{ color: "#1a2a6c" }}>
                <span className="w-2 h-2 rounded-full bg-[#1a2a6c]" />
                4. Restrições
              </h2>
              <p className="mb-2">
                4.1. É expressamente proibido à MAIA DISTRIBUIDORA e a qualquer de seus colaboradores, operadores, representantes,
                filiais ou terceiros ligados à empresa, sem autorização prévia e escrita do titular:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-slate-700">
                <li>Copiar, total ou parcialmente, o Sistema ou qualquer elemento dele;</li>
                <li>Modificar, alterar, adaptar, traduzir ou criar obras derivadas;</li>
                <li>Distribuir, ceder, comercializar, vender, alugar, licenciar ou sublicenciar;</li>
                <li>Realizar engenharia reversa, desmontagem, compilação inversa ou qualquer tentativa de obtenção do código-fonte;</li>
                <li>Publicar ou tornar público qualquer conteúdo referente ao Sistema.</li>
              </ul>
              <p className="mt-2 text-slate-500 text-xs">
                4.2. Qualquer violação ao item 4.1 resulta em cancelamento imediato da licença de uso e sujeição às penalidades previstas em lei.
              </p>
            </div>

            <div>
              <h2 className="text-sm sm:text-base font-bold mb-2 flex items-center gap-2" style={{ color: "#1a2a6c" }}>
                <span className="w-2 h-2 rounded-full bg-[#1a2a6c]" />
                5. Responsabilidades
              </h2>
              <p className="mb-2">
                5.1. O titular não se responsabiliza por uso indevido do Sistema feito por colaboradores da empresa.
              </p>
              <p>
                5.2. A empresa é responsável por controlar o acesso interno e impedir que terceiros utilizem o Sistema sem autorização.
              </p>
            </div>

            <div>
              <h2 className="text-sm sm:text-base font-bold mb-2 flex items-center gap-2" style={{ color: "#1a2a6c" }}>
                <span className="w-2 h-2 rounded-full bg-[#1a2a6c]" />
                6. Confidencialidade
              </h2>
              <p className="mb-2">
                6.1. Todas as informações do Sistema são consideradas confidenciais.
              </p>
              <p>
                6.2. A empresa se compromete a não divulgar, repassar ou reproduzir informações técnicas do Sistema para qualquer pessoa física ou jurídica.
              </p>
            </div>

            <div>
              <h2 className="text-sm sm:text-base font-bold mb-2 flex items-center gap-2" style={{ color: "#1a2a6c" }}>
                <span className="w-2 h-2 rounded-full bg-[#1a2a6c]" />
                7. Suporte e Atualizações
              </h2>
              <p>
                7.1. O suporte técnico e/ou atualizações, quando existentes, serão fornecidos única e exclusivamente pelo titular mediante acordo específico.
              </p>
            </div>

            <div>
              <h2 className="text-sm sm:text-base font-bold mb-2 flex items-center gap-2" style={{ color: "#1a2a6c" }}>
                <span className="w-2 h-2 rounded-full bg-[#1a2a6c]" />
                8. Encerramento da Licença
              </h2>
              <p className="mb-2">
                8.1. A licença poderá ser revogada pelo titular a qualquer momento, mediante aviso por escrito.
              </p>
              <p>
                8.2. Em caso de encerramento, a empresa deve cessar imediatamente o uso e remover o Sistema de seus dispositivos, servidores e acessos internos.
              </p>
            </div>

            <div>
              <h2 className="text-sm sm:text-base font-bold mb-2 flex items-center gap-2" style={{ color: "#1a2a6c" }}>
                <span className="w-2 h-2 rounded-full bg-[#1a2a6c]" />
                9. Foro
              </h2>
              <p>
                9.1. Para dirimir quaisquer questões decorrentes deste Termo, as partes elegem o foro brasileiro competente, com renúncia de qualquer outro, por mais privilegiado que seja.
              </p>
            </div>
          </section>
        </article>

        {/* PARTE 2: TERMO DE PRIVACIDADE */}
        <article className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-5 text-center">
            <div className="inline-flex p-3 bg-emerald-50 text-emerald-700 rounded-2xl mb-2 border border-emerald-200">
              <FileText className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-emerald-800">
              Termo de Privacidade do Sistema
            </h1>
            <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">
              “TRIAGEM FILIAL E GERENCIADOR DE ESTOQUE HORTIGRANJEIROS”
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1.5 text-slate-700">
            <div><strong className="text-slate-900">Autor / Titular:</strong> Alexandre Higor C. Q</div>
            <div><strong className="text-slate-900">Sistema:</strong> TRIAGEM FILIAL E GERENCIADOR DE ESTOQUE HORTIGRANJEIROS</div>
            <div><strong className="text-emerald-700 font-bold">Empresa Autorizada a Utilizar:</strong> MAIA DISTRIBUIDORA</div>
            <div><strong className="text-slate-900">Contato para Notificações e Privacidade:</strong> alexandrehigor@outlook.com</div>
          </div>

          <section className="space-y-5 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <div>
              <h2 className="text-sm sm:text-base font-bold mb-2 flex items-center gap-2 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                1. Objetivo
              </h2>
              <p>
                1.1. O presente Termo de Privacidade tem por objetivo informar a forma como o Sistema
                TRIAGEM FILIAL E GERENCIADOR DE ESTOQUE HORTIGRANJEIROS coleta, processa, armazena, protege e utiliza
                dados inseridos pelos usuários autorizados da empresa <strong>MAIA DISTRIBUIDORA</strong>.
              </p>
            </div>

            <div>
              <h2 className="text-sm sm:text-base font-bold mb-2 flex items-center gap-2 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                2. Dados Coletados
              </h2>
              <p className="mb-2">2.1. O Sistema pode coletar, armazenar e processar os seguintes tipos de dados:</p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-slate-700">
                <li>Dados operacionais internos, tais como imagens, registros de ocorrências de perdas, contagens de estoque físico, produtos hortigranjeiros e pesagens inseridas manualmente;</li>
                <li>Dados técnicos, como data e hora, logs de auditoria e dados estritamente necessários ao funcionamento;</li>
                <li>Dados de uso, como frequência de acesso e eventos acionados no Sistema.</li>
              </ul>
              <p className="mt-2 text-slate-500 text-xs">
                2.2. Não são coletados dados sensíveis pessoais como documentos civis, endereço, biometria, religião,
                saúde ou dados financeiros, salvo se inseridos manualmente pela empresa usuária.
              </p>
            </div>

            <div>
              <h2 className="text-sm sm:text-base font-bold mb-2 flex items-center gap-2 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                3. Finalidade da Coleta
              </h2>
              <p className="mb-2">3.1. Os dados coletados têm finalidade estritamente operacional, tais como:</p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-slate-700">
                <li>Execução do fluxo interno da empresa no recebimento, pesagem e triagem;</li>
                <li>Organização e registro de informações do estoque físico e perdas operacionais;</li>
                <li>Emissão de relatórios de fechamento em PDF e exportação para gestão;</li>
                <li>Controle interno de processos operacionais entre a Filial e a Matriz.</li>
              </ul>
              <p className="mt-2 text-slate-500 text-xs">
                3.2. Nenhum dado é utilizado para publicidade, venda, compartilhamento comercial ou criação de perfis externos.
              </p>
            </div>

            <div>
              <h2 className="text-sm sm:text-base font-bold mb-2 flex items-center gap-2 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                4. Armazenamento, Segurança e LGPD
              </h2>
              <p className="mb-2">
                4.1. Cabe à empresa MAIA DISTRIBUIDORA definir onde seus dados serão armazenados (dispositivos, infraestrutura
                de nuvem autorizada, rede interna ou infraestrutura própria).
              </p>
              <p className="mb-2">
                4.2. O titular do Sistema não possui acesso automático aos dados gerados pela empresa.
              </p>
              <p>
                4.3. A empresa se compromete a manter medidas de proteção de dados, como restrição de acesso, controle de
                senhas de usuários e procedimentos internos, respeitando a confidencialidade e as diretrizes da Lei Geral
                de Proteção de Dados (LGPD - Lei nº 13.709/2018).
              </p>
            </div>

            <div>
              <h2 className="text-sm sm:text-base font-bold mb-2 flex items-center gap-2 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                5. Compartilhamento e Confidencialidade
              </h2>
              <p className="mb-2">
                5.1. Os dados não são compartilhados com terceiros pelo Sistema. Qualquer compartilhamento só poderá ocorrer
                mediante consentimento formal da empresa MAIA DISTRIBUIDORA.
              </p>
              <p className="mb-2">
                5.2. Todos os dados inseridos no Sistema são considerados confidenciais e pertencem exclusivamente à empresa que os gerou.
              </p>
              <p>
                5.3. A empresa compromete-se a não divulgar o funcionamento interno, código-fonte ou estrutura lógica do Sistema,
                protegidos por propriedade intelectual.
              </p>
            </div>

            <div>
              <h2 className="text-sm sm:text-base font-bold mb-2 flex items-center gap-2 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                6. Responsabilidades, Retenção e Exclusão
              </h2>
              <p className="mb-2">
                6.1. A empresa é responsável por controlar quem tem acesso ao Sistema, manter senhas seguras, orientar usuários
                internos e revogar acessos de colaboradores desligados.
              </p>
              <p>
                6.2. Os dados permanecerão armazenados enquanto forem necessários para fins operacionais da empresa. Caso decida
                encerrar o uso, a empresa deverá exportar ou excluir seus dados conforme sua política interna.
              </p>
            </div>

            <div>
              <h2 className="text-sm sm:text-base font-bold mb-2 flex items-center gap-2 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                7. Foro
              </h2>
              <p>
                7.1. Para fins legais, as partes elegem o foro brasileiro competente para resolver eventuais controvérsias.
              </p>
            </div>
          </section>
        </article>

        {/* Footer do Documento */}
        <div className="text-center text-xs text-slate-500 pt-2 pb-6 space-y-1">
          <p>© {new Date().getFullYear()} Maia Distribuidora • Sistema de Hortigranjeiros</p>
          <p>Documento de Termos de Uso e Privacidade homologado para operação.</p>
        </div>
      </div>
    </div>
  )
}
