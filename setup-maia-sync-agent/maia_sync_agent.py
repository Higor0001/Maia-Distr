#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Maia Sync Agent - Agente Autônomo Windows para Computador Externo
Maia Distribuidora - Hortifrutigranjeiros
Função:
- Sincroniza fila de relatórios pendentes via API web
- Salva cópias locais em C:\MaiaRelatorios (PDF/CSV)
- Envia automaticamente para fila de impressão Windows (se ativado)
- Funciona 100% autônomo fora do navegador web
"""

import os
import sys
import time
import json
import base64
import urllib.request
import urllib.error
from datetime import datetime
import subprocess

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "maia_sync_agent.log")

def log(msg, level="INFO"):
    agora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    linha = f"[{agora}] [{level}] {msg}"
    print(linha)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(linha + "\n")
    except Exception:
        pass

def carregar_config():
    padrao = {
        "servidorUrl": "https://maiaestoque.vercel.app",
        "intervaloPollingSegundos": 10,
        "pastaDestino": "C:\\MaiaRelatorios",
        "imprimirAutomaticamente": False,
        "nomeImpressora": "",
        "tokenAcesso": ""
    }
    if not os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(padrao, f, indent=2, ensure_ascii=False)
        except Exception as e:
            log(f"Erro ao criar config padrão: {e}", "ERRO")
        return padrao

    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            cfg = json.load(f)
            return {**padrao, **cfg}
    except Exception as e:
        log(f"Erro ao ler {CONFIG_FILE}, usando padrão: {e}", "AVISO")
        return padrao

def imprimir_arquivo(caminho_arquivo, nome_impressora=""):
    """Envia o arquivo para a impressora Windows padrão ou específica"""
    if not os.path.exists(caminho_arquivo):
        return False
    try:
        if os.name == 'nt':
            if nome_impressora:
                cmd = f'powershell.exe -Command "Start-Process -FilePath \'{caminho_arquivo}\' -Verb PrintTo \'{nome_impressora}\' -PassThru | ForEach-Object {{ Start-Sleep -Seconds 2; Stop-Process -Id $_.Id -Force }}"'
            else:
                cmd = f'powershell.exe -Command "Start-Process -FilePath \'{caminho_arquivo}\' -Verb Print -PassThru | ForEach-Object {{ Start-Sleep -Seconds 2; Stop-Process -Id $_.Id -Force }}"'
            subprocess.run(cmd, shell=True, check=True)
            log(f"Arquivo enviado à fila de impressão: {caminho_arquivo}")
            return True
        else:
            log("Impressão automática só suportada no Windows.", "AVISO")
            return False
    except Exception as e:
        log(f"Erro ao imprimir {caminho_arquivo}: {e}", "ERRO")
        return False

def consultar_pendentes(servidor_url):
    endpoint = f"{servidor_url.rstrip('/')}/api/sync-agent/pendentes?status=pendente"
    req = urllib.request.Request(endpoint, headers={"User-Agent": "MaiaSyncAgent/1.0 (Windows)"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("ok"):
                return data.get("relatorios", [])
    except urllib.error.URLError as e:
        log(f"Falha de conexão com {endpoint}: {e.reason}", "AVISO")
    except Exception as e:
        log(f"Erro ao consultar relatórios pendentes: {e}", "ERRO")
    return []

def atualizar_status(servidor_url, relatorio_id, novo_status, erro_msg=None):
    endpoint = f"{servidor_url.rstrip('/')}/api/sync-agent/pendentes"
    payload = {
        "relatorioId": relatorio_id,
        "novoStatus": novo_status,
        "erro": erro_msg
    }
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=data_bytes,
        headers={"Content-Type": "application/json", "User-Agent": "MaiaSyncAgent/1.0 (Windows)"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp_data = json.loads(resp.read().decode("utf-8"))
            return resp_data.get("ok", False)
    except Exception as e:
        log(f"Erro ao atualizar status do relatório {relatorio_id}: {e}", "ERRO")
        return False

def processar_relatorio(rel, pasta_destino, auto_imprimir, nome_impressora, servidor_url):
    rel_id = rel.get("id")
    nome_arquivo = rel.get("nomeArquivo", f"relatorio_{rel_id}.pdf")
    conteudo_b64 = rel.get("conteudoBase64")

    if not conteudo_b64:
        log(f"Relatório {rel_id} sem conteúdo base64, ignorando.", "AVISO")
        atualizar_status(servidor_url, rel_id, "erro", "Conteúdo vazio")
        return

    pasta_hoje = os.path.join(pasta_destino, datetime.now().strftime("%Y-%m-%d"))
    os.makedirs(pasta_hoje, exist_ok=True)
    caminho_final = os.path.join(pasta_hoje, nome_arquivo)

    try:
        dados_binarios = base64.b64decode(conteudo_b64)
        with open(caminho_final, "wb") as f:
            f.write(dados_binarios)
        log(f"Relatório salvo localmente: {caminho_final}")

        impresso = False
        if auto_imprimir or rel.get("imprimir", False):
            impresso = imprimir_arquivo(caminho_final, nome_impressora)

        novo_status = "impresso" if impresso else "baixado"
        atualizar_status(servidor_url, rel_id, novo_status)
    except Exception as e:
        log(f"Erro ao gravar/processar relatório {rel_id}: {e}", "ERRO")
        atualizar_status(servidor_url, rel_id, "erro", str(e))

def loop_principal():
    log("=" * 60)
    log("Iniciando Maia Sync Agent (Serviço de Fila Operacional Windows)")
    log("Maia Distribuidora - Hortifrutigranjeiros")
    log("=" * 60)

    while True:
        cfg = carregar_config()
        servidor = cfg.get("servidorUrl", "https://maiaestoque.vercel.app")
        intervalo = max(3, int(cfg.get("intervaloPollingSegundos", 10)))
        pasta_destino = cfg.get("pastaDestino", "C:\\MaiaRelatorios")
        auto_imprimir = bool(cfg.get("imprimirAutomaticamente", False))
        nome_impressora = cfg.get("nomeImpressora", "")

        try:
            os.makedirs(pasta_destino, exist_ok=True)
        except Exception as e:
            log(f"Erro ao criar pasta destino {pasta_destino}: {e}", "ERRO")

        pendentes = consultar_pendentes(servidor)
        if pendentes:
            log(f"Encontrados {len(pendentes)} relatório(s) pendente(s) para sincronização.")
            for rel in pendentes:
                processar_relatorio(rel, pasta_destino, auto_imprimir, nome_impressora, servidor)

        time.sleep(intervalo)

if __name__ == "__main__":
    try:
        loop_principal()
    except KeyboardInterrupt:
        log("Maia Sync Agent encerrado pelo usuário.")
        sys.exit(0)
    except Exception as e:
        log(f"Erro fatal não tratado no agente: {e}", "CRITICO")
        sys.exit(1)
