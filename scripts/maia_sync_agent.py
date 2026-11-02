"""
MAIA SYNC AGENT — Automação de Salvamento e Impressão para Windows
Executa em segundo plano, independente do Chrome/Navegador.
"""

import os
import sys
import time
import json
import base64
import shutil
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime

# Configurações do Agente Local
BASE_DIR = Path.home() / "MAIA_RELATORIOS"
DIR_PENDENTES = BASE_DIR / "PENDENTES"
DIR_IMPRESSOS = BASE_DIR / "IMPRESSOS"
DIR_ERROS = BASE_DIR / "ERROS"
DIR_HISTORICO = BASE_DIR / "HISTORICO"

API_BASE_URL = os.environ.get("MAIA_API_URL", "http://localhost:3000")
POLL_INTERVAL_SECONDS = 10


def preparar_pastas():
    for pasta in [DIR_PENDENTES, DIR_IMPRESSOS, DIR_ERROS, DIR_HISTORICO]:
        pasta.mkdir(parents=True, exist_ok=True)
    print(f"[Maia Sync Agent] Pastas locais inicializadas em: {BASE_DIR}")


def consultar_relatorios_pendentes():
    url = f"{API_BASE_URL}/api/sync-agent/pendentes?status=pendente"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "MaiaSyncAgent/1.0"})
        with urllib.request.urlopen(req, timeout=8) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                return data.get("relatorios", [])
    except urllib.error.URLError as e:
        # Silencioso em caso de servidor offline temporário
        pass
    except Exception as e:
        print(f"[Aviso] Erro na consulta de pendentes: {e}")
    return []


def atualizar_status_remoto(relatorio_id, novo_status, erro=""):
    url = f"{API_BASE_URL}/api/sync-agent/pendentes"
    payload = json.dumps({
        "relatorioId": relatorio_id,
        "novoStatus": novo_status,
        "erro": erro
    }).encode("utf-8")
    try:
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json", "User-Agent": "MaiaSyncAgent/1.0"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.status == 200
    except Exception as e:
        print(f"[Aviso] Não foi possível atualizar status remoto de {relatorio_id}: {e}")
        return False


def processar_relatorio(item):
    relatorio_id = item.get("id")
    nome_arquivo = item.get("nomeArquivo", f"relatorio_{relatorio_id}.pdf")
    conteudo_b64 = item.get("conteudoBase64")
    deve_imprimir = item.get("imprimir", False)

    arquivo_pendente = DIR_PENDENTES / nome_arquivo

    try:
        # 1. Salvar arquivo
        if conteudo_b64:
            dados_binarios = base64.b64decode(conteudo_b64)
            with open(arquivo_pendente, "wb") as f:
                f.write(dados_binarios)
        else:
            # Placeholder ou arquivo de texto caso base64 vazio
            with open(arquivo_pendente, "w", encoding="utf-8") as f:
                f.write(f"Relatório {relatorio_id} gerado em {datetime.now().isoformat()}\n")

        print(f"[Sucesso] Relatório {relatorio_id} salvo em {arquivo_pendente}")

        # 2. Imprimir automaticamente se configurado no Windows
        if deve_imprimir:
            try:
                print(f"[Impressão] Enviando {arquivo_pendente} para o spooler do Windows...")
                os.startfile(str(arquivo_pendente), "print")
                arquivo_final = DIR_IMPRESSOS / nome_arquivo
                shutil.move(str(arquivo_pendente), str(arquivo_final))
                atualizar_status_remoto(relatorio_id, "impresso")
            except Exception as print_err:
                print(f"[Erro de Spooler] {print_err}")
                arquivo_erro = DIR_ERROS / nome_arquivo
                shutil.move(str(arquivo_pendente), str(arquivo_erro))
                atualizar_status_remoto(relatorio_id, "erro", erro=str(print_err))
                return
        else:
            arquivo_hist = DIR_HISTORICO / nome_arquivo
            shutil.move(str(arquivo_pendente), str(arquivo_hist))
            atualizar_status_remoto(relatorio_id, "baixado")

    except Exception as e:
        print(f"[Falha Crítica] Relatório {relatorio_id}: {e}")
        atualizar_status_remoto(relatorio_id, "erro", erro=str(e))


def main():
    print("=" * 60)
    print("MAIA SYNC AGENT — SERVIÇO EM SEGUNDO PLANO")
    print(f"Monitorando relatórios pendentes a cada {POLL_INTERVAL_SECONDS} segundos...")
    print("=" * 60)
    preparar_pastas()

    while True:
        try:
            pendentes = consultar_relatorios_pendentes()
            if pendentes:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] {len(pendentes)} relatório(s) pendente(s) identificado(s).")
                for item in pendentes:
                    processar_relatorio(item)
        except KeyboardInterrupt:
            print("\n[Maia Sync Agent] Encerrado pelo usuário.")
            break
        except Exception as e:
            print(f"[Erro no ciclo de polling] {e}")

        time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
