---
description: Cria uma variante A/B nova num anúncio existente, usando outra mídia da pasta do cliente.
---

# Novo Criativo

1. Pergunte para qual anúncio é a variante (liste os ativos via Meta MCP).
2. Liste as mídias do cliente:
   ```bash
   ls -la ~/.easy4u-trafego/midias/upload/ ~/.easy4u-trafego/midias/produto/ ~/.easy4u-trafego/midias/ambiente/ ~/.easy4u-trafego/midias/equipe/
   ```
3. Pergunte qual arquivo usar (mostre nomes e tamanhos). Se a pasta tem
   poucos arquivos, **peça pra adicionar mais** antes — abrir
   `easy4u-trafego` no terminal → "📁 Minhas mídias".
4. Pergunte o ângulo da nova variação: **preço · prova social · urgência · brinde · transformação**.
5. Use o agente `redator` para gerar copy alinhada com o ângulo escolhido.
6. Mostre preview em texto (caminho da mídia + copy).
7. Pergunte: "Posso subir como variação A/B no anúncio X?"
8. Após "sim":
   - Upload da mídia na Meta (`mcp__claude_ai_META__ads_upload_*`) → recebe hash/ID.
   - Cria o ad novo (`mcp__claude_ai_META__ads_create_ad`) referenciando o hash.
9. Atualize o manifest da campanha em `~/.easy4u-trafego/campanhas/.../manifest.json`.
