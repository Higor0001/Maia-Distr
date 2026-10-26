import json
import re

with open('data/estoque-itens.json', encoding='utf-8') as f:
    items = json.load(f)

def categorize(desc):
    d = desc.upper()
    if 'OVO' in d:
        return 'Ovos'
    if any(x in d for x in ['MAÇÃ', 'BANANA', 'UVA', 'PERA', 'MANGA', 'MELÃO', 'MELANCIA', 'ABACAXI', 'ABACATE', 'LARANJA', 'LIMÃO', 'MAMÃO', 'AMEIXA', 'PÊSSEGO', 'PITAYA', 'GOIABA', 'KIWI', 'MORANGO', 'MARACUJÁ', 'COCO']):
        return 'Frutas'
    if any(x in d for x in ['BATATA', 'CEBOLA', 'CENOURA', 'AIPIM', 'INHAME', 'BETERRABA', 'GENGIBRE']):
        return 'Tubérculos e Raízes'
    if any(x in d for x in ['TOMATE', 'PIMENTÃO', 'ABOBRINHA', 'ABÓBORA', 'CHUCHU', 'PEPINO', 'BERINGELA', 'QUIABO', 'JILÓ', 'MILHO']):
        return 'Legumes'
    if any(x in d for x in ['ACELGA', 'COUVE', 'REPOLHO']):
        return 'Verduras e Folhagens'
    if any(x in d for x in ['ALHO']):
        return 'Alhos'
    if any(x in d for x in ['FEIJÃO', 'AMENDOIM', 'COLORAU', 'NOZES', 'TÂMARA', 'FRUTAS CRISTALIZADAS', 'UVAS PASSAS']):
        return 'Secos, Grãos e Especiais'
    return 'Outros Hortifruti'

categories = {}
for item in items:
    cat = categorize(item['descricao'])
    categories.setdefault(cat, []).append(item)

for cat in sorted(categories.keys()):
    print(f"### {cat} ({len(categories[cat])} produtos)")
    for it in categories[cat]:
        print(f"- [{it['reduzido']}] {it['descricao']} (Atual: un={it.get('tipoUnidade', 'cx')}, peso={it.get('pesoKg', 0)}kg, tara={it.get('taraKg', 0)}kg)")
    print()
