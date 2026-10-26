import json
import re

with open('data/estoque-itens.json', encoding='utf-8') as f:
    items = json.load(f)

print(f"Total itens no catálogo: {len(items)}")

def suggest_config(descricao):
    d = descricao.upper()
    peso = 0
    m = re.search(r'(\d+)\s*KG', d)
    if m:
        peso = float(m.group(1))
    
    # Tipo de unidade
    if 'DZ' in d:
        unidade = 'dz'
        emb = 'Caixa / Engradado de Ovos'
        tara = 2.0
    elif 'BANDEJA' in d or 'BDJ' in d:
        unidade = 'bdj'
        emb = 'Bandeja'
        tara = 0.05
    elif 'UNIDADE' in d or 'UN' in d:
        unidade = 'un'
        emb = 'Unidade'
        tara = 0.0
    elif any(x in d for x in ['BATATA', 'CEBOLA', 'CENOURA', 'AIPIM', 'INHAME', 'FEIJÃO']):
        unidade = 'sc'
        emb = 'Saco'
        tara = 0.15
    elif 'MADEIRA' in d:
        unidade = 'cx'
        emb = 'Caixa de Madeira'
        tara = 2.4
    elif 'PAPELÃO' in d:
        unidade = 'cx'
        emb = 'Caixa de Papelão'
        tara = 1.0
    elif any(x in d for x in ['MAÇÃ', 'PERA', 'MANGA', 'UVA', 'TOMATE', 'PIMENTÃO', 'ABACATE', 'AMEIXA', 'PÊSSEGO', 'GOIABA']):
        unidade = 'cx'
        emb = 'Caixa Plástica / Papelão'
        tara = 1.8 if 'PLÁSTICA' in d or 'CX' in d else 1.5
    else:
        unidade = 'cx'
        emb = 'Caixa'
        tara = 1.8

    return unidade, emb, tara, peso

for idx, item in enumerate(items, 1):
    u, emb, tara, peso_sug = suggest_config(item['descricao'])
    print(f"{idx:3d}. [{item['reduzido']}] {item['descricao']} -> Tipo: {u} | Emb: {emb} | Tara Sugerida: {tara}kg | Peso Nominal: {item.get('pesoKg') or peso_sug}kg")
